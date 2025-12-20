import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertPersonSchema, 
  insertDealSchema, 
  insertTaskSchema, 
  insertMeetingSchema, 
  insertCallSchema, 
  insertWeeklyReviewSchema,
  insertNoteSchema,
  insertListingSchema,
  insertEmailCampaignSchema,
  insertPricingReviewSchema,
  insertBusinessSettingsSchema,
  insertPieEntrySchema,
  insertAgentProfileSchema,
  insertRealEstateReviewSchema,
  insertInteractionSchema
} from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import multer from "multer";
import path from "path";
import fs from "fs";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import * as XLSX from "xlsx";
import * as googleCalendar from "./google-calendar";
import { processInteraction } from "./conversation-processor";

// Background processing for batch operations
let processingStatus = {
  isProcessing: false,
  totalToProcess: 0,
  processed: 0,
  failed: 0,
  lastError: null as string | null,
};

async function processAllInBackground(interactionIds: string[]) {
  if (processingStatus.isProcessing) {
    console.log("Already processing, skipping new request");
    return;
  }

  processingStatus = {
    isProcessing: true,
    totalToProcess: interactionIds.length,
    processed: 0,
    failed: 0,
    lastError: null,
  };

  console.log(`Starting background processing of ${interactionIds.length} interactions...`);

  for (const id of interactionIds) {
    try {
      const result = await processInteraction(id);
      if (result.success) {
        processingStatus.processed++;
        console.log(`Processed ${processingStatus.processed}/${processingStatus.totalToProcess}: ${result.draftsCreated || 0} drafts, voice: ${result.voicePatternsExtracted ? 'yes' : 'no'}`);
      } else {
        processingStatus.failed++;
        processingStatus.lastError = result.error || "Unknown error";
        console.error(`Failed to process ${id}: ${result.error}`);
      }
    } catch (error: any) {
      processingStatus.failed++;
      processingStatus.lastError = error.message;
      console.error(`Error processing ${id}:`, error.message);
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log(`Background processing complete. Processed: ${processingStatus.processed}, Failed: ${processingStatus.failed}`);
  processingStatus.isProcessing = false;
}

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
// Lazy initialize to prevent crash when API key is missing
let openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is required for AI features");
    }
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openai;
}

// Anthropic client for Claude
let anthropic: Anthropic | null = null;
function getAnthropic(): Anthropic {
  if (!anthropic) {
    anthropic = new Anthropic();
  }
  return anthropic;
}

// Smart model selection based on task type
type ModelChoice = { provider: "openai" | "claude"; model: string; reason: string };
function selectModel(hasImages: boolean, hasTools: boolean, messageCount: number): ModelChoice {
  // Use GPT-4o for vision tasks (image analysis)
  if (hasImages) {
    return { provider: "openai", model: "gpt-4o", reason: "Vision/image analysis" };
  }
  
  // Use GPT-4o for tool-heavy agentic tasks (better function calling)
  if (hasTools) {
    return { provider: "openai", model: "gpt-4o", reason: "Tool/function calling" };
  }
  
  // Use Claude for complex reasoning and long conversations
  if (messageCount > 6) {
    return { provider: "claude", model: "claude-sonnet-4-20250514", reason: "Complex reasoning" };
  }
  
  // Default to GPT-4o for quick responses
  return { provider: "openai", model: "gpt-4o", reason: "Quick response" };
}

const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage_multer = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage_multer,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|heic/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

const uploadDocuments = multer({
  storage: storage_multer,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedExt = /pdf|xlsx|xls|csv/;
    const ext = allowedExt.test(path.extname(file.originalname).toLowerCase());
    if (ext) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF, Excel, and CSV files are allowed"));
    }
  },
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Helper function for validation
  const validate = (schema: any, data: any) => {
    const result = schema.safeParse(data);
    if (!result.success) {
      throw fromZodError(result.error);
    }
    return result.data;
  };

  // Serve uploaded files statically
  const express = await import("express");
  app.use("/uploads", express.default.static(uploadDir));

  // ==================== FILE UPLOAD ROUTES ====================
  
  // Upload handwritten note images
  app.post("/api/upload/notes", upload.array("images", 20), async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ message: "No files uploaded" });
      }
      
      const urls = files.map(file => `/uploads/${file.filename}`);
      res.json({ urls, count: files.length });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // General document upload (PDF, Excel, CSV)
  app.post("/api/upload", uploadDocuments.single("file"), async (req, res) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      const url = `/uploads/${file.filename}`;
      res.json({ url, filename: file.originalname });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Image upload (for headshots, logos, etc.)
  app.post("/api/upload/image", upload.single("file"), async (req, res) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      const url = `/uploads/${file.filename}`;
      res.json({ url, filename: file.originalname });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Parse MLS spreadsheet file (CSV, Excel) and return structured data
  app.get("/api/parse-mls-csv", async (req, res) => {
    try {
      const fileUrl = req.query.url as string;
      if (!fileUrl) {
        return res.status(400).json({ message: "File URL required" });
      }
      
      const filePath = path.join(process.cwd(), fileUrl);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "File not found" });
      }
      
      const ext = path.extname(filePath).toLowerCase();
      let rows: any[] = [];
      
      if (ext === '.xlsx' || ext === '.xls') {
        // Parse Excel file
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
      } else {
        // Parse CSV file
        const csvContent = fs.readFileSync(filePath, 'utf-8');
        const lines = csvContent.split('\n');
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        
        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue;
          
          // Parse CSV line handling quoted fields
          const values: string[] = [];
          let current = '';
          let inQuotes = false;
          for (const char of lines[i]) {
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              values.push(current.trim());
              current = '';
            } else {
              current += char;
            }
          }
          values.push(current.trim());
          
          const row: any = {};
          headers.forEach((header, idx) => {
            let value = values[idx] || '';
            value = value.replace(/^"|"$/g, '').trim();
            row[header] = value;
          });
          rows.push(row);
        }
      }
      
      // Parse properties using schema-compatible MLSProperty format
      const properties: any[] = [];
      for (const row of rows) {
        const cleanPrice = (p: any) => {
          if (!p) return undefined;
          const str = String(p);
          const num = parseInt(str.replace(/[$,]/g, ''));
          return isNaN(num) ? undefined : num;
        };
        
        const getString = (keys: string[]) => {
          for (const k of keys) {
            if (row[k] !== undefined && row[k] !== '') return String(row[k]);
          }
          return '';
        };
        
        const getNumber = (keys: string[], defaultVal?: number) => {
          for (const k of keys) {
            if (row[k] !== undefined && row[k] !== '') {
              const val = parseFloat(String(row[k]).replace(/[,$]/g, ''));
              if (!isNaN(val)) return val;
            }
          }
          return defaultVal;
        };
        
        const aboveGradeSqft = getNumber(['AboveGradeSqFt', 'Above Grade SqFt', 'AboveGrade', 'Above Grade Finished SqFt']);
        const totalSqft = getNumber(['InteriorSqFt', 'Interior SqFt', 'SqFt', 'Sq Ft', 'Square Feet', 'LivingArea', 'Living Area', 'TotalSqFt', 'Total SqFt', 'GLA']);
        const closePrice = cleanPrice(row['SoldPrice'] || row['Sold Price'] || row['ClosePrice'] || row['Close Price']);
        
        // Calculate pricePerSqft using above grade sqft preferentially
        const sqftForCalc = aboveGradeSqft || totalSqft;
        const pricePerSqft = sqftForCalc && closePrice ? Math.round(closePrice / sqftForCalc) : undefined;
        
        // Schema-compatible MLSProperty format
        properties.push({
          mlsNumber: getString(['MLSNumber', 'MLS #', 'MLS Number', 'ListingId', 'Listing ID']),
          address: getString(['Address', 'Full Address', 'Street Address', 'Property Address']),
          status: getString(['Status', 'Listing Status', 'PropertyStatus']),
          closePrice,
          listPrice: cleanPrice(row['CurrentPrice'] || row['Current Price'] || row['ListPrice'] || row['List Price']),
          originalListPrice: cleanPrice(row['OriginalPrice'] || row['Original Price'] || row['OriginalListPrice']),
          dom: getNumber(['DOM', 'Days On Market', 'DaysOnMarket', 'CDOM']),
          listDate: getString(['ListDate', 'List Date', 'ListingDate', 'Listing Date']),
          closeDate: getString(['SettledDate', 'Settled Date', 'CloseDate', 'Close Date', 'SoldDate', 'Sold Date']),
          statusChangeDate: getString(['StatusDate', 'Status Date', 'StatusChangeDate']),
          aboveGradeSqft,
          totalSqft,
          finishedSqft: getNumber(['FinishedSqFt', 'Finished SqFt', 'Finished Square Feet']),
          frontage: getNumber(['Frontage', 'LotFrontage', 'Lot Frontage']),
          beds: getNumber(['Bedrooms', 'Beds', 'BedroomsTotal', 'Bedrooms Total', 'BR']),
          baths: getNumber(['Baths', 'Bathrooms', 'BathroomsFull', 'BathroomsTotal', 'Full Baths', 'BA']),
          yearBuilt: getNumber(['HomeBuilt', 'Year Built', 'YearBuilt', 'Built']),
          acres: getNumber(['Acres', 'Lot Acres', 'LotAcres', 'Lot Size']),
          subdivision: getString(['Subdivision', 'SubdivisionName', 'Neighborhood']),
          city: getString(['City', 'PropertyCity']),
          style: getString(['Style', 'PropertyStyle', 'Property Style', 'ArchitecturalStyle']),
          pricePerSqft,
        });
      }
      
      // Calculate market statistics using schema field names
      const closed = properties.filter(p => p.status?.toLowerCase().includes('closed') || p.status?.toLowerCase().includes('sold'));
      const active = properties.filter(p => p.status?.toLowerCase().includes('active') || p.status?.toLowerCase().includes('for sale'));
      const pending = properties.filter(p => p.status?.toLowerCase().includes('pending') || p.status?.toLowerCase().includes('contract'));
      
      const avgSoldPrice = closed.length > 0 
        ? Math.round(closed.reduce((sum: number, p: any) => sum + (p.closePrice || 0), 0) / closed.length)
        : 0;
      const avgDOM = closed.length > 0
        ? Math.round(closed.reduce((sum: number, p: any) => sum + (p.dom || 0), 0) / closed.length)
        : 0;
      const closedWithSqft = closed.filter((p: any) => (p.aboveGradeSqft || p.totalSqft) && p.closePrice);
      const avgPricePerSqft = closedWithSqft.length > 0
        ? Math.round(closedWithSqft.reduce((sum: number, p: any) => sum + (p.pricePerSqft || 0), 0) / closedWithSqft.length)
        : 0;
      
      res.json({
        properties,
        stats: {
          total: properties.length,
          closed: closed.length,
          active: active.length,
          pending: pending.length,
          avgSoldPrice,
          avgDOM,
          avgPricePerSqft,
        }
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Create note with uploaded images
  app.post("/api/notes/with-images", async (req, res) => {
    try {
      const { personId, content, type, tags, imageUrls } = req.body;
      const note = await storage.createNote({
        personId: personId || null,
        dealId: null,
        content: content || "Handwritten note",
        type: type || "handwritten",
        tags: tags || [],
        imageUrls: imageUrls || [],
      });
      res.status(201).json(note);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
  
  // AI-powered CSV column mapping for flexible imports
  app.post("/api/ai-map-csv", async (req, res) => {
    try {
      const { headers, sampleRows } = req.body;
      
      if (!headers || !Array.isArray(headers)) {
        return res.status(400).json({ message: "Headers array required" });
      }

      const prompt = `You are a data mapping assistant. Given CSV column headers and sample data from a CRM export, map them to a contact database schema.

Target fields to map to:
- name: Full name of the person (could come from combining first/last name, or a single name field)
- email: Email address
- phone: Phone number (cell, mobile, or primary)
- address: Home or mailing address
- company: Company or business name
- role: Job title or role
- segment: Ninja Selling relationship segment (A - Advocate, B - Fan, C - Network, D - 8x8)
- notes: Any additional notes or comments
- tags: Tags or labels

CSV Headers: ${JSON.stringify(headers)}

Sample Data (first 3 rows):
${JSON.stringify(sampleRows?.slice(0, 3) || [], null, 2)}

Analyze the headers and sample data. Return a JSON object with:
1. "mapping": an object where keys are target fields (name, email, phone, etc.) and values are the original CSV header names that best match. If a field requires combining multiple columns (like first + last name), use an array of header names.
2. "confidence": a number 0-1 indicating how confident you are in the mapping
3. "unmappedHeaders": array of CSV headers that don't clearly map to any target field

Only include mappings you're confident about. It's better to leave a field unmapped than to guess wrong.

Respond with valid JSON only, no other text.`;

      const response = await getOpenAI().chat.completions.create({
        model: "gpt-5",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      res.json(result);
    } catch (error: any) {
      console.error("AI mapping error:", error);
      res.status(500).json({ message: error.message || "AI mapping failed" });
    }
  });

  // AI-powered CSV transformation - apply mapping to convert rows
  app.post("/api/ai-transform-csv", async (req, res) => {
    try {
      const { mapping, rows } = req.body;
      
      if (!mapping || !rows || !Array.isArray(rows)) {
        return res.status(400).json({ message: "Mapping and rows required" });
      }

      // Helper to get first non-empty value from array or single mapping
      const getFirstValue = (field: string | string[], row: any): string | null => {
        if (Array.isArray(field)) {
          for (const f of field) {
            if (row[f] && String(row[f]).trim()) {
              return String(row[f]).trim();
            }
          }
          return null;
        }
        return row[field] ? String(row[field]).trim() : null;
      };
      
      // Helper to get all non-empty values from array mapping
      const getAllValues = (field: string | string[], row: any): string[] => {
        if (Array.isArray(field)) {
          return field.map(f => row[f] ? String(row[f]).trim() : "").filter(Boolean);
        }
        return row[field] ? [String(row[field]).trim()] : [];
      };

      // Get all headers from first row to track unmapped columns
      const allHeaders = rows.length > 0 ? Object.keys(rows[0]) : [];
      const mappedColumns = new Set<string>();
      Object.values(mapping).forEach((val: any) => {
        if (Array.isArray(val)) {
          val.forEach((v: string) => mappedColumns.add(v));
        } else if (val) {
          mappedColumns.add(val);
        }
      });

      const transformedPeople = rows.map((row: any) => {
        const person: any = {};
        
        // Handle name (might be combined from multiple fields)
        if (mapping.name) {
          if (Array.isArray(mapping.name)) {
            person.name = mapping.name.map((h: string) => row[h] || "").join(" ").trim();
          } else {
            person.name = row[mapping.name] || "";
          }
        }
        
        // Handle email - get first non-empty from array
        if (mapping.email) {
          person.email = getFirstValue(mapping.email, row);
        }
        
        // Handle phone - get first non-empty from array
        if (mapping.phone) {
          person.phone = getFirstValue(mapping.phone, row);
        }
        
        // Simple field mappings
        if (mapping.company) person.company = getFirstValue(mapping.company, row);
        if (mapping.role) person.role = getFirstValue(mapping.role, row);
        if (mapping.segment) person.segment = getFirstValue(mapping.segment, row);
        
        // Build notes from multiple sources
        const noteParts: string[] = [];
        
        // Add original notes
        if (mapping.notes) {
          const notes = getFirstValue(mapping.notes, row);
          if (notes) noteParts.push(notes);
        }
        
        // Add company to notes if exists
        if (mapping.company) {
          const company = getFirstValue(mapping.company, row);
          if (company) noteParts.push(`Company: ${company}`);
        }
        
        // Handle address - combine all address parts into address field
        if (mapping.address) {
          const addressParts = getAllValues(mapping.address, row);
          if (addressParts.length > 0) {
            person.address = addressParts.join(", ");
          }
        }
        
        // Handle tags
        if (mapping.tags) {
          const tags = getFirstValue(mapping.tags, row);
          if (tags) noteParts.push(`Tags: ${tags}`);
        }
        
        // Capture ALL unmapped columns with data
        const unmappedData: string[] = [];
        allHeaders.forEach(header => {
          if (!mappedColumns.has(header) && row[header] && String(row[header]).trim()) {
            const value = String(row[header]).trim();
            if (value && value !== '-' && value !== 'N/A' && value !== 'null' && value !== 'undefined') {
              unmappedData.push(`${header}: ${value}`);
            }
          }
        });
        
        if (unmappedData.length > 0) {
          noteParts.push("--- Additional Data ---");
          noteParts.push(...unmappedData);
        }
        
        if (noteParts.length > 0) {
          person.notes = noteParts.join("\n");
        }
        
        return person;
      }).filter((p: any) => p.name && p.name.trim());

      res.json({ people: transformedPeople, count: transformedPeople.length });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // AI Assistant - agentic AI with full CRUD capabilities
  const aiTools: any[] = [
    {
      type: "function",
      function: {
        name: "search_people",
        description: "Search for people/contacts in the database by name, email, segment, or any attribute",
        parameters: {
          type: "object",
          properties: {
            query: { type: "string", description: "Search term to find people (name, email, company, etc.)" }
          },
          required: ["query"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "get_person_details",
        description: "Get full details of a specific person including FORD notes, deals, and activity",
        parameters: {
          type: "object",
          properties: {
            personId: { type: "string", description: "The ID of the person to retrieve" }
          },
          required: ["personId"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "update_person",
        description: "Update a person's information (segment, FORD notes, contact info, buyer needs, etc.)",
        parameters: {
          type: "object",
          properties: {
            personId: { type: "string", description: "The ID of the person to update" },
            updates: { 
              type: "object", 
              description: "Fields to update: name, email, phone, segment (A/B/C/D), fordFamily, fordOccupation, fordRecreation, fordDreams, notes, isBuyer, buyerAreas, buyerPriceMin, buyerPriceMax, etc."
            }
          },
          required: ["personId", "updates"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "create_person",
        description: "Create a new contact/person in the database",
        parameters: {
          type: "object",
          properties: {
            name: { type: "string", description: "Full name of the person" },
            email: { type: "string", description: "Email address" },
            phone: { type: "string", description: "Phone number" },
            segment: { type: "string", enum: ["A", "B", "C", "D"], description: "Relationship segment" },
            notes: { type: "string", description: "Initial notes about this person" }
          },
          required: ["name"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "log_interaction",
        description: "Log a conversation, call, meeting, or other interaction with a person",
        parameters: {
          type: "object",
          properties: {
            personId: { type: "string", description: "The ID of the person interacted with" },
            type: { type: "string", enum: ["call", "meeting", "email", "text", "in_person", "social"], description: "Type of interaction" },
            summary: { type: "string", description: "Summary of what was discussed" },
            fordUpdates: { type: "string", description: "Any FORD updates learned during this interaction" }
          },
          required: ["personId", "type", "summary"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "create_task",
        description: "Create a new task or follow-up item",
        parameters: {
          type: "object",
          properties: {
            title: { type: "string", description: "Task title/description" },
            personId: { type: "string", description: "Optional: ID of the related person" },
            dueDate: { type: "string", description: "Due date in ISO format (YYYY-MM-DD)" },
            priority: { type: "string", enum: ["low", "medium", "high"], description: "Task priority" }
          },
          required: ["title"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "update_deal_stage",
        description: "Update a deal's stage (warm, hot, in_contract, closed, lost)",
        parameters: {
          type: "object",
          properties: {
            personId: { type: "string", description: "The person ID to find their deal" },
            stage: { type: "string", enum: ["warm", "hot", "hot_confused", "in_contract", "closed", "lost"], description: "New deal stage" }
          },
          required: ["personId", "stage"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "update_deal",
        description: "Update a deal's information (estimated price, commission percentage, stage, side, etc.). Use this to add someone to hot list with price and commission info.",
        parameters: {
          type: "object",
          properties: {
            personId: { type: "string", description: "The person ID whose deal to update" },
            estimatedPrice: { type: "number", description: "Estimated sales price in dollars (e.g., 500000 for $500,000)" },
            commissionPercent: { type: "number", description: "Commission percentage as a decimal (e.g., 2.5 for 2.5%, 3 for 3%)" },
            stage: { type: "string", enum: ["warm", "hot", "hot_confused", "in_contract", "closed", "lost"], description: "Deal stage" },
            side: { type: "string", enum: ["buyer", "seller", "both"], description: "Which side of transaction" },
            painPleasure: { type: "number", description: "Pain/Pleasure rating 1-10" }
          },
          required: ["personId"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "get_hot_warm_lists",
        description: "Get the current Hot and Warm lists (people likely to transact soon)",
        parameters: { type: "object", properties: {} }
      }
    },
    {
      type: "function",
      function: {
        name: "get_todays_tasks",
        description: "Get tasks due today or overdue",
        parameters: { type: "object", properties: {} }
      }
    }
  ];

  async function executeAiTool(toolName: string, args: any): Promise<string> {
    try {
      switch (toolName) {
        case "search_people": {
          const people = await storage.getAllPeople();
          const query = args.query.toLowerCase().trim();
          const queryWords = query.split(/\s+/).filter(w => w.length > 0);
          
          // Fuzzy matching function - handles middle initials, partial names, etc.
          const fuzzyNameMatch = (name: string | null | undefined, searchWords: string[]): boolean => {
            if (!name) return false;
            const nameLower = name.toLowerCase();
            // Direct substring match
            if (nameLower.includes(query)) return true;
            // All search words must appear somewhere in name
            const nameWords = nameLower.split(/\s+/);
            return searchWords.every(sw => 
              nameWords.some(nw => nw.includes(sw) || sw.includes(nw))
            );
          };
          
          const matches = people.filter(p => 
            fuzzyNameMatch(p.name, queryWords) ||
            fuzzyNameMatch(p.nickname, queryWords) ||
            p.email?.toLowerCase().includes(query) ||
            p.phone?.includes(query) ||
            p.segment?.toLowerCase() === query ||
            p.notes?.toLowerCase().includes(query)
          ).slice(0, 10);
          if (matches.length === 0) return `No people found matching "${args.query}"`;
          return JSON.stringify(matches.map(p => ({
            id: p.id,
            name: p.name,
            nickname: p.nickname,
            email: p.email,
            phone: p.phone,
            segment: p.segment,
            lastContact: p.lastContact
          })));
        }
        
        case "get_person_details": {
          const person = await storage.getPerson(args.personId);
          if (!person) return `Person not found with ID: ${args.personId}`;
          const deals = await storage.getAllDeals();
          const personDeals = deals.filter(d => d.personId === args.personId);
          return JSON.stringify({
            ...person,
            deals: personDeals.map(d => ({ id: d.id, stage: d.stage, side: d.side, type: d.type }))
          });
        }
        
        case "update_person": {
          if (!args.updates || typeof args.updates !== 'object') {
            return `Error: updates must be an object with fields to update`;
          }
          // Filter out null/undefined values
          const cleanUpdates: Record<string, any> = {};
          for (const [key, value] of Object.entries(args.updates)) {
            if (value !== null && value !== undefined) {
              cleanUpdates[key] = value;
            }
          }
          if (Object.keys(cleanUpdates).length === 0) {
            return `Error: no valid fields to update`;
          }
          const updated = await storage.updatePerson(args.personId, cleanUpdates);
          if (!updated) return `Failed to update person ${args.personId}`;
          return `Successfully updated ${updated.name}: ${Object.keys(cleanUpdates).join(", ")}`;
        }
        
        case "create_person": {
          const newPerson = await storage.createPerson({
            name: args.name,
            email: args.email || null,
            phone: args.phone || null,
            segment: args.segment || "D",
            notes: args.notes || null
          });
          return `Created new contact: ${newPerson.name} (ID: ${newPerson.id})`;
        }
        
        case "log_interaction": {
          const interaction = await storage.createInteraction({
            personId: args.personId,
            type: args.type,
            summary: args.summary,
            occurredAt: new Date()
          });
          // Also update last contact date
          await storage.updatePerson(args.personId, { lastContact: new Date() });
          // Apply FORD updates if provided
          if (args.fordUpdates) {
            const person = await storage.getPerson(args.personId);
            if (person) {
              const existingNotes = person.notes || "";
              await storage.updatePerson(args.personId, { 
                notes: existingNotes + "\n\n[FORD Update]: " + args.fordUpdates 
              });
            }
          }
          return `Logged ${args.type} interaction for person. Last contact date updated.`;
        }
        
        case "create_task": {
          const task = await storage.createTask({
            title: args.title,
            personId: args.personId || null,
            dueDate: args.dueDate ? new Date(args.dueDate) : null,
            priority: args.priority || "medium",
            status: "pending"
          });
          return `Created task: "${task.title}" ${args.dueDate ? `due ${args.dueDate}` : ""}`;
        }
        
        case "update_deal_stage": {
          const deals = await storage.getAllDeals();
          const deal = deals.find(d => d.personId === args.personId && 
            ["warm", "hot", "hot_active", "hot_confused", "in_contract"].includes(d.stage?.toLowerCase() || ""));
          if (!deal) return `No active deal found for this person`;
          await storage.updateDeal(deal.id, { stage: args.stage });
          return `Updated deal stage to ${args.stage}`;
        }
        
        case "update_deal": {
          const allDeals = await storage.getAllDeals();
          let deal = allDeals.find(d => d.personId === args.personId && 
            ["warm", "hot", "hot_active", "hot_confused", "in_contract"].includes(d.stage?.toLowerCase() || ""));
          
          // If no deal exists, create one
          if (!deal) {
            deal = await storage.createDeal({
              personId: args.personId,
              stage: args.stage || "hot",
              side: args.side || "buyer",
              type: "sale",
              estimatedPrice: args.estimatedPrice || null,
              commissionPercent: args.commissionPercent || null,
              painPleasure: args.painPleasure || null
            });
            return `Created new deal with estimated price $${args.estimatedPrice?.toLocaleString() || 0}, ${args.commissionPercent || 0}% commission`;
          }
          
          // Update existing deal
          const updates: Record<string, any> = {};
          if (args.estimatedPrice !== undefined) updates.estimatedPrice = args.estimatedPrice;
          if (args.commissionPercent !== undefined) updates.commissionPercent = args.commissionPercent;
          if (args.stage !== undefined) updates.stage = args.stage;
          if (args.side !== undefined) updates.side = args.side;
          if (args.painPleasure !== undefined) updates.painPleasure = args.painPleasure;
          
          await storage.updateDeal(deal.id, updates);
          const updateInfo = [];
          if (args.estimatedPrice !== undefined) updateInfo.push(`price: $${args.estimatedPrice.toLocaleString()}`);
          if (args.commissionPercent !== undefined) updateInfo.push(`commission: ${args.commissionPercent}%`);
          if (args.stage !== undefined) updateInfo.push(`stage: ${args.stage}`);
          return `Updated deal: ${updateInfo.join(", ")}`;
        }
        
        case "get_hot_warm_lists": {
          const deals = await storage.getAllDeals();
          const people = await storage.getAllPeople();
          const hot = deals.filter(d => d.stage?.toLowerCase() === "hot" || d.stage?.toLowerCase() === "hot_active");
          const warm = deals.filter(d => d.stage?.toLowerCase() === "warm");
          const hotPeople = hot.map(d => {
            const person = people.find(p => p.id === d.personId);
            return { name: person?.name, side: d.side, lastContact: person?.lastContact };
          });
          const warmPeople = warm.map(d => {
            const person = people.find(p => p.id === d.personId);
            return { name: person?.name, side: d.side, lastContact: person?.lastContact };
          });
          return JSON.stringify({ hot: hotPeople, warm: warmPeople });
        }
        
        case "get_todays_tasks": {
          const tasks = await storage.getAllTasks();
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const dueTasks = tasks.filter(t => {
            if (!t.dueDate || t.status === "completed") return false;
            const due = new Date(t.dueDate);
            due.setHours(0, 0, 0, 0);
            return due <= today;
          });
          return JSON.stringify(dueTasks.map(t => ({ title: t.title, priority: t.priority, dueDate: t.dueDate })));
        }
        
        default:
          return `Unknown tool: ${toolName}`;
      }
    } catch (error: any) {
      return `Error executing ${toolName}: ${error.message}`;
    }
  }

  app.post("/api/ai-assistant", async (req, res) => {
    try {
      const { messages, images, context } = req.body;
      
      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ message: "Messages array required" });
      }

      const openaiClient = getOpenAI();
      
      const systemPrompt = `You are the Ninja AI Assistant - an AGENTIC AI with full control to search, view, and modify data in Ninja OS (a real estate business operating system).

YOU CAN TAKE ACTION. When the user asks you to do something, USE YOUR TOOLS to actually do it:
- Search for people by name/email/segment
- View complete person details including FORD notes and deals
- Update person information (segment, FORD notes, buyer needs, contact info)
- Create new contacts
- Log interactions/conversations
- Create tasks and follow-ups
- Update deal stages (warm → hot → in_contract → closed)
- Get Hot/Warm lists and today's tasks

WORKFLOW:
1. When user mentions a person, FIRST search for them to get their ID
2. Then use get_person_details to see their full record
3. Make the requested changes using update_person, log_interaction, etc.
4. Confirm what you did

Current context: User is on ${context?.pageDescription || context?.currentPage || 'Ninja OS'}

Ninja Selling principles:
- Segments: A=monthly contact, B=every 2 months, C=quarterly, D=new (8x8 campaign)
- FORD: Family, Occupation, Recreation, Dreams - watch for life changes
- Hot=90 days to transaction, Warm=~12 months

Be concise. Take action. Confirm results.

When analyzing images:
- Describe what you see clearly and concisely
- If it's a document, screenshot, or business-related image, extract relevant information
- If it shows contacts or real estate info, offer to help update the database accordingly`;

      // Build messages array, handling images with vision API format
      const apiMessages: any[] = [
        { role: "system", content: systemPrompt },
        ...messages.map((m: any) => {
          // Check if this message has images attached
          if (m.images && Array.isArray(m.images) && m.images.length > 0) {
            // Build content array with text and images for vision
            const contentArray: any[] = [];
            
            // Add text content if present
            if (m.content) {
              contentArray.push({ type: "text", text: m.content });
            }
            
            // Add each image
            for (const img of m.images) {
              contentArray.push({
                type: "image_url",
                image_url: {
                  url: img.data, // Base64 data URL
                  detail: "high"
                }
              });
            }
            
            return {
              role: m.role,
              content: contentArray
            };
          }
          
          // Regular text message
          return {
            role: m.role,
            content: m.content
          };
        })
      ];

      // Determine if this request has images
      const hasImages = messages.some((m: any) => m.images && Array.isArray(m.images) && m.images.length > 0);
      
      // Select the best model for this task
      const modelChoice = selectModel(hasImages, true, messages.length);
      
      let completion = await openaiClient.chat.completions.create({
        model: modelChoice.model,
        messages: apiMessages,
        tools: aiTools,
        tool_choice: "auto",
        max_tokens: 1500,
        temperature: 0.3,
      });

      const actionsExecuted: { tool: string; result: string }[] = [];
      
      // Process tool calls in a loop
      let responseMessage = completion.choices[0]?.message;
      let iterations = 0;
      const maxIterations = 5;
      
      while (responseMessage?.tool_calls && responseMessage.tool_calls.length > 0 && iterations < maxIterations) {
        iterations++;
        
        // Add assistant's message with tool calls
        apiMessages.push(responseMessage);
        
        // Execute each tool call
        for (const toolCall of responseMessage.tool_calls) {
          const args = JSON.parse(toolCall.function.arguments);
          const result = await executeAiTool(toolCall.function.name, args);
          actionsExecuted.push({ tool: toolCall.function.name, result });
          
          apiMessages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: result
          });
        }
        
        // Get next response
        completion = await openaiClient.chat.completions.create({
          model: modelChoice.model,
          messages: apiMessages,
          tools: aiTools,
          tool_choice: "auto",
          max_tokens: 1500,
          temperature: 0.3,
        });
        
        responseMessage = completion.choices[0]?.message;
      }

      const response = responseMessage?.content || "I completed the requested actions.";
      
      res.json({ 
        response,
        actions: actionsExecuted.length > 0 ? actionsExecuted : undefined,
        model: { name: modelChoice.model, reason: modelChoice.reason }
      });
    } catch (error: any) {
      console.error("AI Assistant error:", error);
      res.status(500).json({ message: error.message || "AI request failed" });
    }
  });

  // ==================== AI CONVERSATIONS ROUTES ====================
  
  // Get all AI conversations
  app.get("/api/ai-conversations", async (req, res) => {
    try {
      const conversations = await storage.getAllAiConversations();
      res.json(conversations);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Get single AI conversation
  app.get("/api/ai-conversations/:id", async (req, res) => {
    try {
      const conversation = await storage.getAiConversation(req.params.id);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      res.json(conversation);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Create AI conversation
  app.post("/api/ai-conversations", async (req, res) => {
    try {
      const { title, messages } = req.body;
      const conversation = await storage.createAiConversation({ 
        title: title || "New Conversation", 
        messages: messages || [] 
      });
      res.status(201).json(conversation);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
  
  // Update AI conversation
  app.patch("/api/ai-conversations/:id", async (req, res) => {
    try {
      const conversation = await storage.updateAiConversation(req.params.id, req.body);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      res.json(conversation);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Delete AI conversation
  app.delete("/api/ai-conversations/:id", async (req, res) => {
    try {
      await storage.deleteAiConversation(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ==================== HOUSEHOLD ROUTES ====================
  
  // Get all households
  app.get("/api/households", async (req, res) => {
    try {
      const allHouseholds = await storage.getAllHouseholds();
      res.json(allHouseholds);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Get household by ID with members
  app.get("/api/households/:id", async (req, res) => {
    try {
      const household = await storage.getHousehold(req.params.id);
      if (!household) {
        return res.status(404).json({ message: "Household not found" });
      }
      const members = await storage.getHouseholdMembers(req.params.id);
      res.json({ ...household, members });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Create household with members
  app.post("/api/households", async (req, res) => {
    try {
      const { name, address, primaryPersonId, memberIds } = req.body;
      const household = await storage.createHousehold({ 
        name, 
        address, 
        primaryPersonId 
      });
      
      // Add members to household
      if (memberIds && Array.isArray(memberIds)) {
        for (const personId of memberIds) {
          await storage.addPersonToHousehold(personId, household.id);
        }
      }
      
      const members = await storage.getHouseholdMembers(household.id);
      res.status(201).json({ ...household, members });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
  
  // Update household
  app.patch("/api/households/:id", async (req, res) => {
    try {
      const { memberIds, ...updates } = req.body;
      const household = await storage.updateHousehold(req.params.id, updates);
      if (!household) {
        return res.status(404).json({ message: "Household not found" });
      }
      
      // Update members if provided
      if (memberIds && Array.isArray(memberIds)) {
        // Remove all current members
        const currentMembers = await storage.getHouseholdMembers(req.params.id);
        for (const member of currentMembers) {
          await storage.removePersonFromHousehold(member.id);
        }
        // Add new members
        for (const personId of memberIds) {
          await storage.addPersonToHousehold(personId, req.params.id);
        }
      }
      
      const members = await storage.getHouseholdMembers(req.params.id);
      res.json({ ...household, members });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
  
  // Delete household
  app.delete("/api/households/:id", async (req, res) => {
    try {
      await storage.deleteHousehold(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Add person to household
  app.post("/api/households/:id/members", async (req, res) => {
    try {
      const { personId } = req.body;
      const updated = await storage.addPersonToHousehold(personId, req.params.id);
      if (!updated) {
        return res.status(404).json({ message: "Person not found" });
      }
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
  
  // Remove person from household
  app.delete("/api/households/:householdId/members/:personId", async (req, res) => {
    try {
      const updated = await storage.removePersonFromHousehold(req.params.personId);
      if (!updated) {
        return res.status(404).json({ message: "Person not found" });
      }
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ==================== PEOPLE ROUTES ====================
  
  // Get all people
  app.get("/api/people", async (req, res) => {
    try {
      const people = await storage.getAllPeople();
      res.json(people);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Get person by ID
  app.get("/api/people/:id", async (req, res) => {
    try {
      const person = await storage.getPerson(req.params.id);
      if (!person) {
        return res.status(404).json({ message: "Person not found" });
      }
      res.json(person);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Create person
  app.post("/api/people", async (req, res) => {
    try {
      const data = validate(insertPersonSchema, req.body);
      const person = await storage.createPerson(data);
      res.status(201).json(person);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
  
  // Update person
  app.patch("/api/people/:id", async (req, res) => {
    try {
      const person = await storage.updatePerson(req.params.id, req.body);
      if (!person) {
        return res.status(404).json({ message: "Person not found" });
      }
      res.json(person);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
  
  // Delete person
  app.delete("/api/people/:id", async (req, res) => {
    try {
      await storage.deletePerson(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // ==================== DEALS ROUTES ====================
  
  // Get all deals
  app.get("/api/deals", async (req, res) => {
    try {
      const deals = await storage.getAllDeals();
      res.json(deals);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Get deal by ID
  app.get("/api/deals/:id", async (req, res) => {
    try {
      const deal = await storage.getDeal(req.params.id);
      if (!deal) {
        return res.status(404).json({ message: "Deal not found" });
      }
      res.json(deal);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Create deal
  app.post("/api/deals", async (req, res) => {
    try {
      const data = validate(insertDealSchema, req.body);
      const deal = await storage.createDeal(data);
      res.status(201).json(deal);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
  
  // Update deal
  app.patch("/api/deals/:id", async (req, res) => {
    try {
      const deal = await storage.updateDeal(req.params.id, req.body);
      if (!deal) {
        return res.status(404).json({ message: "Deal not found" });
      }
      res.json(deal);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
  
  // Delete deal
  app.delete("/api/deals/:id", async (req, res) => {
    try {
      await storage.deleteDeal(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // ==================== TASKS ROUTES ====================
  
  // Get all tasks
  app.get("/api/tasks", async (req, res) => {
    try {
      const tasks = await storage.getAllTasks();
      res.json(tasks);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Get task by ID
  app.get("/api/tasks/:id", async (req, res) => {
    try {
      const task = await storage.getTask(req.params.id);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      res.json(task);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Create task
  app.post("/api/tasks", async (req, res) => {
    try {
      const data = validate(insertTaskSchema, req.body);
      const task = await storage.createTask(data);
      res.status(201).json(task);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
  
  // Update task
  app.patch("/api/tasks/:id", async (req, res) => {
    try {
      const task = await storage.updateTask(req.params.id, req.body);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      res.json(task);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
  
  // Delete task
  app.delete("/api/tasks/:id", async (req, res) => {
    try {
      await storage.deleteTask(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // ==================== MEETINGS ROUTES ====================
  
  // Get all meetings
  app.get("/api/meetings", async (req, res) => {
    try {
      const meetings = await storage.getAllMeetings();
      res.json(meetings);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Get meeting by ID
  app.get("/api/meetings/:id", async (req, res) => {
    try {
      const meeting = await storage.getMeeting(req.params.id);
      if (!meeting) {
        return res.status(404).json({ message: "Meeting not found" });
      }
      res.json(meeting);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Create meeting
  app.post("/api/meetings", async (req, res) => {
    try {
      const data = validate(insertMeetingSchema, req.body);
      const meeting = await storage.createMeeting(data);
      res.status(201).json(meeting);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
  
  // Update meeting
  app.patch("/api/meetings/:id", async (req, res) => {
    try {
      const meeting = await storage.updateMeeting(req.params.id, req.body);
      if (!meeting) {
        return res.status(404).json({ message: "Meeting not found" });
      }
      res.json(meeting);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
  
  // Delete meeting
  app.delete("/api/meetings/:id", async (req, res) => {
    try {
      await storage.deleteMeeting(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // ==================== CALLS ROUTES ====================
  
  // Get all calls
  app.get("/api/calls", async (req, res) => {
    try {
      const calls = await storage.getAllCalls();
      res.json(calls);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Get call by ID
  app.get("/api/calls/:id", async (req, res) => {
    try {
      const call = await storage.getCall(req.params.id);
      if (!call) {
        return res.status(404).json({ message: "Call not found" });
      }
      res.json(call);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Create call
  app.post("/api/calls", async (req, res) => {
    try {
      const data = validate(insertCallSchema, req.body);
      const call = await storage.createCall(data);
      res.status(201).json(call);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
  
  // Update call
  app.patch("/api/calls/:id", async (req, res) => {
    try {
      const call = await storage.updateCall(req.params.id, req.body);
      if (!call) {
        return res.status(404).json({ message: "Call not found" });
      }
      res.json(call);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
  
  // Delete call
  app.delete("/api/calls/:id", async (req, res) => {
    try {
      await storage.deleteCall(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // ==================== WEEKLY REVIEWS ROUTES ====================
  
  // Get all weekly reviews
  app.get("/api/weekly-reviews", async (req, res) => {
    try {
      const reviews = await storage.getAllWeeklyReviews();
      res.json(reviews);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Get weekly review by ID
  app.get("/api/weekly-reviews/:id", async (req, res) => {
    try {
      const review = await storage.getWeeklyReview(req.params.id);
      if (!review) {
        return res.status(404).json({ message: "Weekly review not found" });
      }
      res.json(review);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Create weekly review
  app.post("/api/weekly-reviews", async (req, res) => {
    try {
      const data = validate(insertWeeklyReviewSchema, req.body);
      const review = await storage.createWeeklyReview(data);
      res.status(201).json(review);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
  
  // Update weekly review
  app.patch("/api/weekly-reviews/:id", async (req, res) => {
    try {
      const review = await storage.updateWeeklyReview(req.params.id, req.body);
      if (!review) {
        return res.status(404).json({ message: "Weekly review not found" });
      }
      res.json(review);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
  
  // Delete weekly review
  app.delete("/api/weekly-reviews/:id", async (req, res) => {
    try {
      await storage.deleteWeeklyReview(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // ==================== NOTES ROUTES ====================
  
  // Get all notes
  app.get("/api/notes", async (req, res) => {
    try {
      const notes = await storage.getAllNotes();
      res.json(notes);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Get note by ID
  app.get("/api/notes/:id", async (req, res) => {
    try {
      const note = await storage.getNote(req.params.id);
      if (!note) {
        return res.status(404).json({ message: "Note not found" });
      }
      res.json(note);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Create note
  app.post("/api/notes", async (req, res) => {
    try {
      const data = validate(insertNoteSchema, req.body);
      const note = await storage.createNote(data);
      res.status(201).json(note);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
  
  // Update note
  app.patch("/api/notes/:id", async (req, res) => {
    try {
      const note = await storage.updateNote(req.params.id, req.body);
      if (!note) {
        return res.status(404).json({ message: "Note not found" });
      }
      res.json(note);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
  
  // Delete note
  app.delete("/api/notes/:id", async (req, res) => {
    try {
      await storage.deleteNote(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // ==================== LISTINGS ROUTES ====================
  
  // Get all listings
  app.get("/api/listings", async (req, res) => {
    try {
      const listings = await storage.getAllListings();
      res.json(listings);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Get active listings only
  app.get("/api/listings/active", async (req, res) => {
    try {
      const listings = await storage.getActiveListings();
      res.json(listings);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Get listing by ID
  app.get("/api/listings/:id", async (req, res) => {
    try {
      const listing = await storage.getListing(req.params.id);
      if (!listing) {
        return res.status(404).json({ message: "Listing not found" });
      }
      res.json(listing);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Create listing
  app.post("/api/listings", async (req, res) => {
    try {
      const data = validate(insertListingSchema, req.body);
      const listing = await storage.createListing(data);
      res.status(201).json(listing);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
  
  // Update listing
  app.patch("/api/listings/:id", async (req, res) => {
    try {
      const listing = await storage.updateListing(req.params.id, req.body);
      if (!listing) {
        return res.status(404).json({ message: "Listing not found" });
      }
      res.json(listing);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
  
  // Delete listing
  app.delete("/api/listings/:id", async (req, res) => {
    try {
      await storage.deleteListing(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // ==================== EMAIL CAMPAIGNS ROUTES ====================
  
  // Get all email campaigns
  app.get("/api/email-campaigns", async (req, res) => {
    try {
      const campaigns = await storage.getAllEmailCampaigns();
      res.json(campaigns);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Get email campaign by ID
  app.get("/api/email-campaigns/:id", async (req, res) => {
    try {
      const campaign = await storage.getEmailCampaign(req.params.id);
      if (!campaign) {
        return res.status(404).json({ message: "Email campaign not found" });
      }
      res.json(campaign);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Create email campaign
  app.post("/api/email-campaigns", async (req, res) => {
    try {
      const data = validate(insertEmailCampaignSchema, req.body);
      const campaign = await storage.createEmailCampaign(data);
      res.status(201).json(campaign);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
  
  // Update email campaign
  app.patch("/api/email-campaigns/:id", async (req, res) => {
    try {
      const campaign = await storage.updateEmailCampaign(req.params.id, req.body);
      if (!campaign) {
        return res.status(404).json({ message: "Email campaign not found" });
      }
      res.json(campaign);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
  
  // Delete email campaign
  app.delete("/api/email-campaigns/:id", async (req, res) => {
    try {
      await storage.deleteEmailCampaign(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // ==================== SPECIAL QUERIES ====================
  
  // Get all buyers
  app.get("/api/buyers", async (req, res) => {
    try {
      const buyers = await storage.getBuyers();
      res.json(buyers);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Get realtors for newsletter
  app.get("/api/realtors/newsletter", async (req, res) => {
    try {
      const realtors = await storage.getRealtorsForNewsletter();
      res.json(realtors);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // ==================== PRICING REVIEWS ROUTES ====================
  
  // Get all pricing reviews
  app.get("/api/pricing-reviews", async (req, res) => {
    try {
      const reviews = await storage.getAllPricingReviews();
      res.json(reviews);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Get pricing review by ID
  app.get("/api/pricing-reviews/:id", async (req, res) => {
    try {
      const review = await storage.getPricingReview(req.params.id);
      if (!review) {
        return res.status(404).json({ message: "Pricing review not found" });
      }
      res.json(review);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Create pricing review
  app.post("/api/pricing-reviews", async (req, res) => {
    try {
      const data = validate(insertPricingReviewSchema, req.body);
      const review = await storage.createPricingReview(data);
      res.status(201).json(review);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
  
  // Update pricing review
  app.patch("/api/pricing-reviews/:id", async (req, res) => {
    try {
      const review = await storage.updatePricingReview(req.params.id, req.body);
      if (!review) {
        return res.status(404).json({ message: "Pricing review not found" });
      }
      res.json(review);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
  
  // Delete pricing review
  app.delete("/api/pricing-reviews/:id", async (req, res) => {
    try {
      await storage.deletePricingReview(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // ==================== BUSINESS SETTINGS ROUTES ====================
  
  // Get business settings for a year
  app.get("/api/business-settings/:year", async (req, res) => {
    try {
      const year = parseInt(req.params.year);
      let settings = await storage.getBusinessSettings(year);
      if (!settings) {
        settings = await storage.upsertBusinessSettings({ year });
      }
      res.json(settings);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Update business settings
  app.put("/api/business-settings", async (req, res) => {
    try {
      const data = validate(insertBusinessSettingsSchema, req.body);
      const settings = await storage.upsertBusinessSettings(data);
      res.json(settings);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
  
  // ==================== PIE ENTRIES ROUTES ====================
  
  // Get all PIE entries
  app.get("/api/pie-entries", async (req, res) => {
    try {
      const entries = await storage.getAllPieEntries();
      res.json(entries);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Get PIE entries by date range
  app.get("/api/pie-entries/range", async (req, res) => {
    try {
      const startDate = new Date(req.query.start as string);
      const endDate = new Date(req.query.end as string);
      const entries = await storage.getPieEntriesByDateRange(startDate, endDate);
      res.json(entries);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Create PIE entry
  app.post("/api/pie-entries", async (req, res) => {
    try {
      const data = validate(insertPieEntrySchema, req.body);
      const entry = await storage.createPieEntry(data);
      res.status(201).json(entry);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
  
  // Update PIE entry
  app.patch("/api/pie-entries/:id", async (req, res) => {
    try {
      const entry = await storage.updatePieEntry(req.params.id, req.body);
      if (!entry) {
        return res.status(404).json({ message: "PIE entry not found" });
      }
      res.json(entry);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
  
  // Delete PIE entry
  app.delete("/api/pie-entries/:id", async (req, res) => {
    try {
      await storage.deletePieEntry(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ==================== AGENT PROFILE ROUTES ====================
  
  // Get agent profile
  app.get("/api/profile", async (req, res) => {
    try {
      const profile = await storage.getAgentProfile();
      res.json(profile || null);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Alias for agent profile (used by Brand Center)
  app.get("/api/agent-profile", async (req, res) => {
    try {
      const profile = await storage.getAgentProfile();
      res.json(profile || null);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Update/create agent profile
  app.put("/api/profile", async (req, res) => {
    try {
      const data = validate(insertAgentProfileSchema, req.body);
      const profile = await storage.upsertAgentProfile(data);
      res.json(profile);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
  
  // Alias for agent profile with POST (used by Brand Center)
  // Uses partial schema to allow updating individual fields
  app.post("/api/agent-profile", async (req, res) => {
    try {
      // Get existing profile to merge with updates
      const existing = await storage.getAgentProfile();
      const mergedData = {
        name: "Agent Name", // Default if no profile exists
        ...existing,
        ...req.body,
      };
      // Validate the merged data
      const data = validate(insertAgentProfileSchema, mergedData);
      const profile = await storage.upsertAgentProfile(data);
      res.json(profile);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
  
  // Get brokerage branding info (auto-lookup)
  app.get("/api/brokerage-branding/:name", async (req, res) => {
    try {
      const name = req.params.name.toLowerCase();
      
      // Known brokerage branding data
      const brokerages: Record<string, { logo: string; color: string; fullName: string }> = {
        "exp": {
          logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f1/EXp_Realty_logo.svg/1200px-EXp_Realty_logo.svg.png",
          color: "#00A0DC",
          fullName: "eXp Realty"
        },
        "kw": {
          logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Keller_Williams_Realty_logo.svg/1200px-Keller_Williams_Realty_logo.svg.png",
          color: "#B40101",
          fullName: "Keller Williams"
        },
        "kellerwilliams": {
          logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Keller_Williams_Realty_logo.svg/1200px-Keller_Williams_Realty_logo.svg.png",
          color: "#B40101",
          fullName: "Keller Williams"
        },
        "remax": {
          logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/RE-MAX%2C_LLC_logo.svg/1200px-RE-MAX%2C_LLC_logo.svg.png",
          color: "#003DA6",
          fullName: "RE/MAX"
        },
        "coldwellbanker": {
          logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Coldwell_Banker_logo.svg/1200px-Coldwell_Banker_logo.svg.png",
          color: "#012169",
          fullName: "Coldwell Banker"
        },
        "cb": {
          logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Coldwell_Banker_logo.svg/1200px-Coldwell_Banker_logo.svg.png",
          color: "#012169",
          fullName: "Coldwell Banker"
        },
        "century21": {
          logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/Century_21_Real_Estate_logo.svg/1200px-Century_21_Real_Estate_logo.svg.png",
          color: "#866831",
          fullName: "Century 21"
        },
        "berkshirehathaway": {
          logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Berkshire_Hathaway_HomeServices_logo.svg/1200px-Berkshire_Hathaway_HomeServices_logo.svg.png",
          color: "#522D6D",
          fullName: "Berkshire Hathaway HomeServices"
        },
        "bhhs": {
          logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Berkshire_Hathaway_HomeServices_logo.svg/1200px-Berkshire_Hathaway_HomeServices_logo.svg.png",
          color: "#522D6D",
          fullName: "Berkshire Hathaway HomeServices"
        },
        "compass": {
          logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fb/Compass%2C_Inc._logo.svg/1200px-Compass%2C_Inc._logo.svg.png",
          color: "#000000",
          fullName: "Compass"
        },
        "sothebys": {
          logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Sotheby%27s_International_Realty_logo.svg/1200px-Sotheby%27s_International_Realty_logo.svg.png",
          color: "#041E42",
          fullName: "Sotheby's International Realty"
        },
        "exitrealty": {
          logo: "https://upload.wikimedia.org/wikipedia/en/thumb/e/e7/Exit_Realty_logo.svg/1200px-Exit_Realty_logo.svg.png",
          color: "#C00000",
          fullName: "EXIT Realty"
        },
        "exit": {
          logo: "https://upload.wikimedia.org/wikipedia/en/thumb/e/e7/Exit_Realty_logo.svg/1200px-Exit_Realty_logo.svg.png",
          color: "#C00000",
          fullName: "EXIT Realty"
        }
      };
      
      const branding = brokerages[name.replace(/\s+/g, '').replace("realty", "")] || null;
      res.json(branding);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ==================== REAL ESTATE REVIEWS ROUTES ====================
  
  // Get all real estate reviews
  app.get("/api/real-estate-reviews", async (req, res) => {
    try {
      const status = req.query.status as string | undefined;
      let reviews;
      if (status) {
        reviews = await storage.getRealEstateReviewsByStatus(status);
      } else {
        reviews = await storage.getAllRealEstateReviews();
      }
      res.json(reviews);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Get single real estate review
  app.get("/api/real-estate-reviews/:id", async (req, res) => {
    try {
      const review = await storage.getRealEstateReview(req.params.id);
      if (!review) {
        return res.status(404).json({ message: "Review not found" });
      }
      res.json(review);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Create real estate review with auto-generated tasks
  app.post("/api/real-estate-reviews", async (req, res) => {
    try {
      const validated = validate(insertRealEstateReviewSchema, req.body);
      const review = await storage.createRealEstateReview(validated);
      
      // Auto-generate task bundle for the review
      const taskBundle = [
        { title: "Populate property data", priority: "high" },
        { title: "Add financial checklist", priority: "medium" },
        { title: "Update component tracker", priority: "medium" },
        { title: "Import public records", priority: "medium" },
        { title: "Link Visual Pricing analysis", priority: "high" },
        { title: "Generate Gamma page", priority: "high" },
        { title: "Record Loom walkthrough", priority: "medium" },
        { title: "Send review to client", priority: "high" },
        { title: "Follow-up call", priority: "medium" },
      ];
      
      // Add print task if output type includes print
      if (validated.outputType === "digital_and_print") {
        taskBundle.push({ title: "Print and deliver physical copy", priority: "low" });
      }
      
      // Create all tasks for this review
      for (const task of taskBundle) {
        await storage.createTask({
          reviewId: review.id,
          personId: validated.personId || null,
          title: task.title,
          priority: task.priority,
          status: "pending",
          completed: false,
        });
      }
      
      res.status(201).json(review);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
  
  // Update real estate review
  app.patch("/api/real-estate-reviews/:id", async (req, res) => {
    try {
      const review = await storage.updateRealEstateReview(req.params.id, req.body);
      if (!review) {
        return res.status(404).json({ message: "Review not found" });
      }
      res.json(review);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
  
  // Delete real estate review
  app.delete("/api/real-estate-reviews/:id", async (req, res) => {
    try {
      await storage.deleteRealEstateReview(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Get tasks for a specific review
  app.get("/api/real-estate-reviews/:id/tasks", async (req, res) => {
    try {
      const tasks = await storage.getTasksByReviewId(req.params.id);
      res.json(tasks);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ==================== INTERACTIONS ROUTES ====================
  
  // Get all interactions
  app.get("/api/interactions", async (req, res) => {
    try {
      const interactions = await storage.getAllInteractions();
      res.json(interactions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Get interactions for a specific person
  app.get("/api/people/:personId/interactions", async (req, res) => {
    try {
      const interactions = await storage.getInteractionsByPerson(req.params.personId);
      res.json(interactions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Get interaction by ID
  app.get("/api/interactions/:id", async (req, res) => {
    try {
      const interaction = await storage.getInteraction(req.params.id);
      if (!interaction) {
        return res.status(404).json({ message: "Interaction not found" });
      }
      res.json(interaction);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Create interaction
  app.post("/api/interactions", async (req, res) => {
    try {
      // Convert occurredAt string to Date before validation
      const body = {
        ...req.body,
        occurredAt: req.body.occurredAt ? new Date(req.body.occurredAt) : new Date(),
      };
      const data = validate(insertInteractionSchema, body);
      const interaction = await storage.createInteraction(data);
      
      // Update person's lastContact if personId is provided
      if (data.personId) {
        await storage.updatePerson(data.personId, { lastContact: new Date(data.occurredAt) });
      }
      
      res.status(201).json(interaction);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
  
  // Update interaction
  app.patch("/api/interactions/:id", async (req, res) => {
    try {
      const interaction = await storage.updateInteraction(req.params.id, req.body);
      if (!interaction) {
        return res.status(404).json({ message: "Interaction not found" });
      }
      res.json(interaction);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
  
  // Soft delete interaction (move to Recently Deleted)
  app.post("/api/interactions/:id/delete", async (req, res) => {
    try {
      const interaction = await storage.softDeleteInteraction(req.params.id);
      if (!interaction) {
        return res.status(404).json({ message: "Interaction not found" });
      }
      res.json(interaction);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Restore interaction from Recently Deleted
  app.post("/api/interactions/:id/restore", async (req, res) => {
    try {
      const interaction = await storage.restoreInteraction(req.params.id);
      if (!interaction) {
        return res.status(404).json({ message: "Interaction not found" });
      }
      res.json(interaction);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Get all deleted interactions (Recently Deleted)
  app.get("/api/interactions/deleted", async (req, res) => {
    try {
      const deleted = await storage.getDeletedInteractions();
      res.json(deleted);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Permanently delete interaction
  app.delete("/api/interactions/:id/permanent", async (req, res) => {
    try {
      await storage.permanentlyDeleteInteraction(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Cleanup old deleted interactions (older than 30 days)
  app.post("/api/interactions/cleanup-deleted", async (req, res) => {
    try {
      const count = await storage.cleanupOldDeletedInteractions(30);
      res.json({ deletedCount: count });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Hard delete interaction (kept for compatibility, but prefer soft delete)
  app.delete("/api/interactions/:id", async (req, res) => {
    try {
      await storage.deleteInteraction(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Fathom API Integration - Import meetings
  app.post("/api/integrations/fathom/import", async (req, res) => {
    try {
      const { apiKey } = req.body;
      if (!apiKey) {
        return res.status(400).json({ message: "Fathom API key is required" });
      }

      // Fetch all meetings from Fathom API with pagination
      let allMeetings: any[] = [];
      let cursor: string | null = null;
      let pageCount = 0;
      const maxPages = 50; // Safety limit

      do {
        const url = new URL("https://api.fathom.ai/external/v1/meetings");
        url.searchParams.set("include_summary", "true");
        url.searchParams.set("include_transcript", "true");
        url.searchParams.set("calendar_invitees_domains_type", "all");
        if (cursor) {
          url.searchParams.set("cursor", cursor);
        }

        const fathomResponse = await fetch(url.toString(), {
          headers: {
            "X-Api-Key": apiKey,
            "Content-Type": "application/json",
          },
        });

        if (!fathomResponse.ok) {
          const errorText = await fathomResponse.text();
          return res.status(fathomResponse.status).json({ 
            message: `Fathom API error: ${fathomResponse.statusText}`,
            details: errorText
          });
        }

        const fathomData = await fathomResponse.json();
        const pageMeetings = fathomData.items || [];
        allMeetings = allMeetings.concat(pageMeetings);
        cursor = fathomData.next_cursor || null;
        pageCount++;
      } while (cursor && pageCount < maxPages);

      const meetings = allMeetings;
      
      if (!Array.isArray(meetings)) {
        return res.status(400).json({ message: "Unexpected response format from Fathom" });
      }

      let imported = 0;
      let skipped = 0;
      const errors: string[] = [];

      for (const meeting of meetings) {
        try {
          // Check if already imported (by external ID)
          const existingInteractions = await storage.getAllInteractions();
          const alreadyExists = existingInteractions.some(
            i => i.externalId === meeting.id || i.externalId === meeting.call_id
          );
          
          if (alreadyExists) {
            skipped++;
            continue;
          }

          // Parse meeting data from Fathom API response
          const meetingId = String(meeting.recording_id || meeting.id);
          const title = meeting.meeting_title || meeting.title || "Fathom Meeting";
          const summary = meeting.default_summary?.markdown_formatted || meeting.summary || "";
          const transcriptData = meeting.transcript || [];
          const transcript = Array.isArray(transcriptData) 
            ? transcriptData.map((t: any) => `${t.speaker?.display_name || 'Speaker'}: ${t.text}`).join('\n')
            : String(transcriptData);
          const occurredAt = meeting.recording_start_time || meeting.scheduled_start_time || meeting.created_at || new Date().toISOString();
          const startTime = meeting.recording_start_time ? new Date(meeting.recording_start_time) : null;
          const endTime = meeting.recording_end_time ? new Date(meeting.recording_end_time) : null;
          const duration = startTime && endTime ? Math.round((endTime.getTime() - startTime.getTime()) / 60000) : null;
          const participantEmails = meeting.calendar_invitees?.map((p: any) => p.email).filter(Boolean) || [];
          const participants = meeting.calendar_invitees?.map((p: any) => p.name || p.email) || [];
          const externalLink = meeting.share_url || meeting.url || `https://fathom.video/${meetingId}`;

          // Try to auto-match participant to a person in database by email
          let matchedPersonId: string | null = null;
          if (participantEmails.length > 0) {
            const allPeople = await storage.getAllPeople();
            for (const email of participantEmails) {
              const matchedPerson = allPeople.find(p => 
                p.email?.toLowerCase() === email.toLowerCase()
              );
              if (matchedPerson) {
                matchedPersonId = matchedPerson.id;
                break; // Use first match
              }
            }
          }

          // Create interaction
          const newInteraction = await storage.createInteraction({
            type: "meeting",
            source: "fathom",
            title,
            summary,
            transcript,
            externalLink,
            externalId: meetingId,
            duration,
            occurredAt: new Date(occurredAt),
            participants,
            personId: matchedPersonId, // Auto-matched by email or null
          });

          // Auto-process with AI if transcript available
          if (transcript && newInteraction.id) {
            try {
              const { processInteraction } = await import("./conversation-processor");
              await processInteraction(newInteraction.id);
            } catch (aiErr) {
              console.log("AI processing skipped for meeting:", meetingId, aiErr);
            }
          }

          imported++;
        } catch (err: any) {
          errors.push(`Failed to import meeting: ${err.message}`);
        }
      }

      res.json({
        success: true,
        imported,
        skipped,
        total: meetings.length,
        errors: errors.length > 0 ? errors : undefined,
      });
    } catch (error: any) {
      console.error("Fathom import error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Auto-match existing unlinked conversations by participant name or email
  app.post("/api/interactions/auto-match", async (req, res) => {
    try {
      const allInteractions = await storage.getAllInteractions();
      const allPeople = await storage.getAllPeople();
      
      let matched = 0;
      let alreadyLinked = 0;
      let noMatch = 0;
      
      for (const interaction of allInteractions) {
        // Skip if already linked
        if (interaction.personId) {
          alreadyLinked++;
          continue;
        }
        
        // Try to match by participant name or email
        const participants = interaction.participants || [];
        let matchedPersonId: string | null = null;
        
        for (const participant of participants) {
          const participantLower = participant.toLowerCase().trim();
          
          // Check if participant looks like an email
          if (participant.includes('@')) {
            const matchedPerson = allPeople.find(p => 
              p.email?.toLowerCase() === participantLower
            );
            if (matchedPerson) {
              matchedPersonId = matchedPerson.id;
              break;
            }
          } else {
            // Try matching by name (skip the user's own name - Nathan Desnoyers)
            if (participantLower === 'nathan desnoyers') continue;
            
            const matchedPerson = allPeople.find(p => 
              p.name.toLowerCase().trim() === participantLower
            );
            if (matchedPerson) {
              matchedPersonId = matchedPerson.id;
              break;
            }
          }
        }
        
        if (matchedPersonId) {
          await storage.updateInteraction(interaction.id, { personId: matchedPersonId });
          matched++;
        } else {
          noMatch++;
        }
      }
      
      res.json({
        success: true,
        matched,
        alreadyLinked,
        noMatch,
        total: allInteractions.length,
      });
    } catch (error: any) {
      console.error("Auto-match error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Zapier Webhook - Create conversation from external sources (Granola, etc.)
  app.post("/api/webhooks/conversation", async (req, res) => {
    try {
      const { 
        type = "meeting",
        title,
        summary,
        transcript,
        occurredAt,
        externalLink,
        externalId,
        source = "zapier",
        participants
      } = req.body;

      // Check for duplicate by externalId
      if (externalId) {
        const existing = await storage.getInteractionByExternalId(externalId);
        if (existing) {
          return res.json({ success: true, message: "Already exists", id: existing.id, skipped: true });
        }
      }

      // Build transcript from raw content if available
      let transcriptText = "";
      if (transcript) {
        transcriptText = typeof transcript === "string" ? transcript : JSON.stringify(transcript);
      }

      const interaction = await storage.createInteraction({
        type: type as any,
        personId: null, // Will be assigned manually in UI
        title: title || null,
        summary: summary || null,
        transcript: transcriptText || null,
        externalLink: externalLink || null,
        externalId: externalId || null,
        source: source,
        occurredAt: occurredAt ? new Date(occurredAt) : new Date(),
      });

      res.status(201).json({ 
        success: true, 
        id: interaction.id,
        message: "Conversation created"
      });
    } catch (error: any) {
      console.error("Webhook error:", error);
      res.status(400).json({ success: false, message: error.message });
    }
  });

  // Fathom API - Test connection
  app.post("/api/integrations/fathom/test", async (req, res) => {
    try {
      const { apiKey } = req.body;
      if (!apiKey) {
        return res.status(400).json({ message: "Fathom API key is required" });
      }

      const response = await fetch("https://api.fathom.ai/external/v1/meetings?calendar_invitees_domains_type=all", {
        headers: {
          "X-Api-Key": apiKey,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        res.json({ success: true, message: "Connection successful" });
      } else {
        res.status(response.status).json({ 
          success: false, 
          message: `Authentication failed: ${response.statusText}` 
        });
      }
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // Google Calendar API Routes
  app.get("/api/calendar/status", async (req, res) => {
    try {
      const connected = await googleCalendar.isCalendarConnected();
      res.json({ connected });
    } catch (error: any) {
      res.json({ connected: false, error: error.message });
    }
  });

  app.get("/api/calendar/calendars", async (req, res) => {
    try {
      const calendars = await googleCalendar.listCalendars();
      res.json(calendars);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/calendar/events", async (req, res) => {
    try {
      const { calendarId, timeMin, timeMax, maxResults } = req.query;
      const events = await googleCalendar.listEvents({
        calendarId: calendarId as string,
        timeMin: timeMin ? new Date(timeMin as string) : undefined,
        timeMax: timeMax ? new Date(timeMax as string) : undefined,
        maxResults: maxResults ? parseInt(maxResults as string) : undefined,
      });
      res.json(events);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/calendar/events/today", async (req, res) => {
    try {
      const events = await googleCalendar.getTodaysEvents();
      res.json(events);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/calendar/events/upcoming", async (req, res) => {
    try {
      const { days } = req.query;
      const events = await googleCalendar.getUpcomingEvents(
        days ? parseInt(days as string) : 7
      );
      res.json(events);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/calendar/events", async (req, res) => {
    try {
      const { calendarId, summary, description, start, end, attendees, location } = req.body;
      if (!summary || !start || !end) {
        return res.status(400).json({ message: "summary, start, and end are required" });
      }
      const event = await googleCalendar.createEvent({
        calendarId,
        summary,
        description,
        start: new Date(start),
        end: new Date(end),
        attendees,
        location,
      });
      res.status(201).json(event);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/calendar/events/:eventId", async (req, res) => {
    try {
      const { eventId } = req.params;
      const { calendarId, summary, description, start, end, location } = req.body;
      const event = await googleCalendar.updateEvent({
        calendarId,
        eventId,
        summary,
        description,
        start: start ? new Date(start) : undefined,
        end: end ? new Date(end) : undefined,
        location,
      });
      res.json(event);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/calendar/events/:eventId", async (req, res) => {
    try {
      const { eventId } = req.params;
      const { calendarId } = req.query;
      await googleCalendar.deleteEvent(
        (calendarId as string) || 'primary',
        eventId
      );
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Suggest PIE time from calendar events
  app.get("/api/calendar/suggest-pie", async (req, res) => {
    try {
      const { date } = req.query;
      if (!date) {
        return res.status(400).json({ message: "date parameter is required" });
      }
      
      const targetDate = new Date(date as string);
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);
      
      const events = await googleCalendar.listEvents({
        timeMin: startOfDay,
        timeMax: endOfDay,
        maxResults: 100,
      });
      
      // Categorize events into P, I, E based on keywords in title/description
      const pKeywords = [
        'showing', 'buyer consultation', 'listing presentation', 'offer', 'contract',
        'appointment', 'client meeting', 'closing', 'settlement', 'open house',
        'negotiation', 'listing appt', 'buyer appt', 'seller appt', 'walkthrough',
        'inspection', 'buyer meeting', 'seller meeting', 'presentation'
      ];
      
      const iKeywords = [
        'prospecting', 'call', 'phone', 'hour of power', 'hop', 'pop by', 'note',
        'handwritten', 'cma', 'real estate review', 'rer', 'tour', 'preview',
        'networking', 'sphere', 'database', 'follow up', 'follow-up', 'check in',
        'check-in', 'touch base', 'coffee', 'lunch', 'breakfast', 'happy hour',
        'client care', 'reach out', 'personal note', 'ford', 'prep', 'research'
      ];
      
      let pTime = 0; // in minutes
      let iTime = 0;
      let eTime = 0;
      const categorizedEvents: { title: string; duration: number; category: 'P' | 'I' | 'E'; }[] = [];
      
      for (const event of events) {
        const title = (event.summary || '').toLowerCase();
        const description = (event.description || '').toLowerCase();
        const searchText = title + ' ' + description;
        
        // Calculate duration in minutes
        let durationMinutes = 0;
        if (event.start?.dateTime && event.end?.dateTime) {
          const start = new Date(event.start.dateTime);
          const end = new Date(event.end.dateTime);
          durationMinutes = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
        } else if (event.start?.date && event.end?.date) {
          // All-day event - skip or treat as E time
          durationMinutes = 0;
        }
        
        if (durationMinutes <= 0) continue;
        
        // Categorize based on keywords
        let category: 'P' | 'I' | 'E' = 'E';
        
        if (pKeywords.some(kw => searchText.includes(kw))) {
          category = 'P';
          pTime += durationMinutes;
        } else if (iKeywords.some(kw => searchText.includes(kw))) {
          category = 'I';
          iTime += durationMinutes;
        } else {
          eTime += durationMinutes;
        }
        
        categorizedEvents.push({
          title: event.summary || 'Untitled',
          duration: durationMinutes,
          category,
        });
      }
      
      const totalTime = pTime + iTime + eTime;
      
      res.json({
        date: date,
        suggestion: {
          pTime,
          iTime,
          eTime,
          totalTime,
        },
        events: categorizedEvents,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ============ CONVERSATION INTELLIGENCE API ============
  
  // Process an interaction with AI to extract insights
  app.post("/api/interactions/:id/process", async (req, res) => {
    try {
      const { processInteraction } = await import("./conversation-processor");
      const result = await processInteraction(req.params.id);
      
      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }
      
      res.json(result);
    } catch (error: any) {
      console.error("Error processing interaction:", error);
      res.status(500).json({ message: error.message });
    }
  });
  
  // Process all unprocessed interactions
  app.post("/api/interactions/process-all", async (req, res) => {
    try {
      const { processInteraction } = await import("./conversation-processor");
      const allInteractions = await storage.getAllInteractions();
      
      let processed = 0;
      let skipped = 0;
      let failed = 0;
      
      for (const interaction of allInteractions) {
        // Skip if already processed
        const extractedData = interaction.aiExtractedData as any;
        if (extractedData?.processingStatus === "completed") {
          skipped++;
          continue;
        }
        
        // Skip if no transcript/summary
        if (!interaction.transcript && !interaction.summary) {
          skipped++;
          continue;
        }
        
        const result = await processInteraction(interaction.id);
        if (result.success) {
          processed++;
        } else {
          failed++;
        }
      }
      
      res.json({
        success: true,
        processed,
        skipped,
        failed,
        total: allInteractions.length,
      });
    } catch (error: any) {
      console.error("Error processing all interactions:", error);
      res.status(500).json({ message: error.message });
    }
  });
  
  // Get all generated drafts
  app.get("/api/generated-drafts", async (req, res) => {
    try {
      const { status, personId } = req.query;
      
      let drafts;
      if (personId) {
        drafts = await storage.getGeneratedDraftsByPerson(personId as string);
      } else if (status) {
        drafts = await storage.getGeneratedDraftsByStatus(status as string);
      } else {
        drafts = await storage.getAllGeneratedDrafts();
      }
      
      res.json(drafts);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Get drafts for a specific person
  app.get("/api/people/:id/drafts", async (req, res) => {
    try {
      const drafts = await storage.getGeneratedDraftsByPerson(req.params.id);
      res.json(drafts);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Update draft status
  app.patch("/api/generated-drafts/:id", async (req, res) => {
    try {
      const draft = await storage.updateGeneratedDraft(req.params.id, req.body);
      if (!draft) {
        return res.status(404).json({ message: "Draft not found" });
      }
      res.json(draft);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Delete draft
  app.delete("/api/generated-drafts/:id", async (req, res) => {
    try {
      await storage.deleteGeneratedDraft(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Find referral matches for a person
  app.get("/api/people/:id/referral-matches", async (req, res) => {
    try {
      const { findReferralMatches } = await import("./conversation-processor");
      const matches = await findReferralMatches(req.params.id);
      res.json(matches);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Get all referral opportunities across the network
  app.get("/api/referral-opportunities", async (req, res) => {
    try {
      const allPeople = await storage.getAllPeople();
      const opportunities: {
        id: string;
        personWithNeed: { id: string; name: string; segment: string | null };
        personWithOffer: { id: string; name: string; segment: string | null; profession: string | null };
        need: string;
        offer: string;
        matchType: "profession" | "offer";
      }[] = [];
      
      const seen = new Set<string>();
      
      for (const person of allPeople) {
        const needs = person.needs || [];
        
        for (const need of needs) {
          const needLower = need.toLowerCase();
          
          for (const other of allPeople) {
            if (other.id === person.id) continue;
            
            const offers = other.offers || [];
            for (const offer of offers) {
              const offerLower = offer.toLowerCase();
              if (offerLower.includes(needLower) || needLower.includes(offerLower)) {
                const key = `${person.id}-${other.id}-${need}-${offer}`;
                if (!seen.has(key)) {
                  seen.add(key);
                  opportunities.push({
                    id: key,
                    personWithNeed: { id: person.id, name: person.name, segment: person.segment },
                    personWithOffer: { id: other.id, name: other.name, segment: other.segment, profession: other.profession },
                    need,
                    offer,
                    matchType: "offer",
                  });
                }
              }
            }
            
            if (other.profession) {
              const profLower = other.profession.toLowerCase();
              if (profLower.includes(needLower) || needLower.includes(profLower)) {
                const key = `${person.id}-${other.id}-${need}-profession`;
                if (!seen.has(key)) {
                  seen.add(key);
                  opportunities.push({
                    id: key,
                    personWithNeed: { id: person.id, name: person.name, segment: person.segment },
                    personWithOffer: { id: other.id, name: other.name, segment: other.segment, profession: other.profession },
                    need,
                    offer: other.profession,
                    matchType: "profession",
                  });
                }
              }
            }
          }
        }
      }
      
      res.json(opportunities);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Voice Profile endpoints
  app.get("/api/voice-profile", async (req, res) => {
    try {
      const { category } = req.query;
      
      let profiles;
      if (category) {
        profiles = await storage.getVoiceProfilesByCategory(category as string);
      } else {
        profiles = await storage.getAllVoiceProfiles();
      }
      
      res.json(profiles);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/voice-profile/:id", async (req, res) => {
    try {
      await storage.deleteVoiceProfile(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Process all unprocessed interactions (batch processing)
  app.post("/api/interactions/process-all", async (req, res) => {
    try {
      const allInteractions = await storage.getAllInteractions();
      
      // Filter to only unprocessed (no aiExtractedData or status pending)
      const unprocessed = allInteractions.filter(i => {
        const data = i.aiExtractedData as any;
        return !data || !data.processingStatus || data.processingStatus === "pending";
      });

      res.json({
        message: `Starting to process ${unprocessed.length} unprocessed interactions`,
        totalUnprocessed: unprocessed.length,
        status: "started"
      });

      // Process in background (don't await)
      processAllInBackground(unprocessed.map(i => i.id));
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get processing status
  app.get("/api/interactions/process-status", async (req, res) => {
    res.json(processingStatus);
  });

  // ============ TODOIST INTEGRATION ROUTES ============
  // Uses Replit's Todoist connection: connection:conn_todoist_01KCW49R8F3ZDFCTZBVPBS2ZFF
  
  const todoistClient = await import("./todoist-client");
  
  app.get("/api/todoist/status", async (req, res) => {
    try {
      const connected = await todoistClient.isTodoistConnected();
      res.json({ connected });
    } catch (error: any) {
      res.json({ connected: false, error: error.message });
    }
  });

  app.get("/api/todoist/projects", async (req, res) => {
    try {
      const projects = await todoistClient.getTodoistProjects();
      res.json(projects);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/todoist/tasks", async (req, res) => {
    try {
      const { projectId } = req.query;
      const tasks = await todoistClient.getTodoistTasks(projectId as string | undefined);
      res.json(tasks);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/todoist/tasks", async (req, res) => {
    try {
      const { content, description, projectId, priority, dueString, labels } = req.body;
      const task = await todoistClient.createTodoistTask({
        content,
        description,
        projectId,
        priority,
        dueString,
        labels
      });
      res.json(task);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/todoist/tasks/:id/complete", async (req, res) => {
    try {
      await todoistClient.completeTodoistTask(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Sync Ninja OS tasks to Todoist
  app.post("/api/todoist/sync-tasks", async (req, res) => {
    try {
      const tasks = await storage.getAllTasks();
      const incompleteTasks = tasks.filter(t => !t.completed);
      
      let synced = 0;
      let failed = 0;
      
      for (const task of incompleteTasks) {
        try {
          // Only sync tasks that haven't been synced yet (no todoistId)
          if (!task.todoistId) {
            const person = task.personId ? await storage.getPerson(task.personId) : null;
            const description = person ? `Contact: ${person.name}` : undefined;
            
            const todoistTask = await todoistClient.createTodoistTask({
              content: task.title,
              description: description,
              dueString: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : undefined,
              priority: task.priority === "high" ? 4 : task.priority === "medium" ? 3 : 2,
              labels: ["ninja-os"]
            });
            
            // Update task with todoistId
            await storage.updateTask(task.id, { todoistId: todoistTask.id });
            synced++;
          }
        } catch (e) {
          failed++;
        }
      }
      
      res.json({ synced, failed, total: incompleteTasks.length });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  return httpServer;
}
