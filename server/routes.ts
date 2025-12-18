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
  insertRealEstateReviewSchema
} from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import multer from "multer";
import path from "path";
import fs from "fs";
import OpenAI from "openai";
import * as XLSX from "xlsx";

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
      
      const properties: any[] = [];
      for (const row of rows) {
        // Extract key fields for Visual Pricing - handle various column naming conventions
        const cleanPrice = (p: any) => {
          if (!p) return null;
          const str = String(p);
          const num = parseInt(str.replace(/[$,]/g, ''));
          return isNaN(num) ? null : num;
        };
        
        const getString = (keys: string[]) => {
          for (const k of keys) {
            if (row[k] !== undefined && row[k] !== '') return String(row[k]);
          }
          return '';
        };
        
        const getNumber = (keys: string[], defaultVal = 0) => {
          for (const k of keys) {
            if (row[k] !== undefined && row[k] !== '') {
              const val = parseFloat(String(row[k]).replace(/[,$]/g, ''));
              if (!isNaN(val)) return val;
            }
          }
          return defaultVal;
        };
        
        properties.push({
          mlsNumber: getString(['MLSNumber', 'MLS #', 'MLS Number', 'ListingId', 'Listing ID']),
          address: getString(['Address', 'Full Address', 'Street Address', 'Property Address']),
          status: getString(['Status', 'Listing Status', 'PropertyStatus']),
          soldPrice: cleanPrice(row['SoldPrice'] || row['Sold Price'] || row['ClosePrice'] || row['Close Price']),
          originalPrice: cleanPrice(row['OriginalPrice'] || row['Original Price'] || row['OriginalListPrice']),
          currentPrice: cleanPrice(row['CurrentPrice'] || row['Current Price'] || row['ListPrice'] || row['List Price']),
          lastListPrice: cleanPrice(row['Last List Price'] || row['LastListPrice']),
          dom: getNumber(['DOM', 'Days On Market', 'DaysOnMarket', 'CDOM']),
          listDate: getString(['ListDate', 'List Date', 'ListingDate', 'Listing Date']),
          settledDate: getString(['SettledDate', 'Settled Date', 'CloseDate', 'Close Date', 'SoldDate', 'Sold Date']),
          statusDate: getString(['StatusDate', 'Status Date', 'StatusChangeDate']),
          sqft: getNumber(['InteriorSqFt', 'Interior SqFt', 'SqFt', 'Sq Ft', 'Square Feet', 'LivingArea', 'Living Area', 'TotalSqFt', 'Total SqFt', 'GLA']),
          aboveGradeSqft: getNumber(['AboveGradeSqFt', 'Above Grade SqFt', 'AboveGrade']),
          belowGradeSqft: getNumber(['BelowGradeSqFt', 'Below Grade SqFt', 'BelowGrade']),
          beds: getNumber(['Bedrooms', 'Beds', 'BedroomsTotal', 'Bedrooms Total', 'BR']),
          baths: getNumber(['Baths', 'Bathrooms', 'BathroomsFull', 'BathroomsTotal', 'Full Baths', 'BA']),
          yearBuilt: getNumber(['HomeBuilt', 'Year Built', 'YearBuilt', 'Built']),
          acres: getNumber(['Acres', 'Lot Acres', 'LotAcres', 'Lot Size']),
          subdivision: getString(['Subdivision', 'SubdivisionName', 'Neighborhood']),
          city: getString(['City', 'PropertyCity']),
          zipCode: getString(['Zip Code', 'ZipCode', 'Zip', 'PostalCode', 'Postal Code']),
          style: getString(['Style', 'PropertyStyle', 'Property Style', 'ArchitecturalStyle']),
          condition: getString(['PropertyCondition', 'Property Condition', 'Condition']),
        });
      }
      
      // Calculate market statistics
      const closed = properties.filter(p => p.status === 'Closed' || p.status === 'Sold');
      const active = properties.filter(p => ['Active', 'ComingSoon', 'Coming Soon', 'For Sale'].includes(p.status));
      const pending = properties.filter(p => ['Pending', 'ActiveUnderContract', 'Under Contract', 'Contingent'].includes(p.status));
      
      const avgSoldPrice = closed.length > 0 
        ? Math.round(closed.reduce((sum, p) => sum + (p.soldPrice || 0), 0) / closed.length)
        : 0;
      const avgDOM = closed.length > 0
        ? Math.round(closed.reduce((sum, p) => sum + p.dom, 0) / closed.length)
        : 0;
      const closedWithSqft = closed.filter(p => p.sqft > 0 && p.soldPrice);
      const avgPricePerSqft = closedWithSqft.length > 0
        ? Math.round(closedWithSqft.reduce((sum, p) => sum + ((p.soldPrice || 0) / p.sqft), 0) / closedWithSqft.length)
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
- category: Category or type of contact (e.g., client, lead, vendor)
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
        if (mapping.category) person.category = getFirstValue(mapping.category, row);
        
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

  // AI Assistant - general purpose conversational AI
  app.post("/api/ai-assistant", async (req, res) => {
    try {
      const { messages, context } = req.body;
      
      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ message: "Messages array required" });
      }

      const openaiClient = getOpenAI();
      
      const systemPrompt = `You are the Ninja AI Assistant, an intelligent second brain built into Ninja OS - a real estate business operating system following the Ninja Selling methodology.

Your role is to:
- Help real estate agents be more productive and successful
- Answer questions about their business, contacts, deals, and market
- Provide advice based on Ninja Selling principles (relationship-first, value-driven, helping vs selling)
- Suggest actions, follow-ups, and strategies
- Help with email drafts, talking points, and client communications
- Be concise but thorough - agents are busy

Current context:
- User is on: ${context?.pageDescription || context?.currentPage || 'Ninja OS'}
- App: ${context?.appDescription || 'Real Estate Business Operating System'}

Ninja Selling key principles to reference:
- Build relationships before transactions
- FORD: Ask about Family, Occupation, Recreation, Dreams
- 50 Hot/50 Warm contact strategy
- Weekly flow: Reviews, Hot/Warm contact, database touches
- Focus on helping, not selling
- Consistent daily habits (Ninja Nine)

Be helpful, knowledgeable, and supportive. Keep responses concise but valuable.`;

      const completion = await openaiClient.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.map((m: any) => ({
            role: m.role as "user" | "assistant",
            content: m.content
          }))
        ],
        max_tokens: 1000,
        temperature: 0.7,
      });

      const response = completion.choices[0]?.message?.content || "I'm not sure how to help with that. Could you rephrase?";
      
      res.json({ response });
    } catch (error: any) {
      console.error("AI Assistant error:", error);
      res.status(500).json({ message: error.message || "AI request failed" });
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

  return httpServer;
}
