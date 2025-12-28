import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
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
  insertInteractionSchema,
  insertContentTopicSchema,
  insertContentIdeaSchema,
  insertContentCalendarSchema,
  insertDashboardWidgetSchema,
  granolaWebhookSchema,
  plaudWebhookSchema,
  captureWebhookSchema
} from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import multer from "multer";
import path from "path";
import fs from "fs";
import OpenAI from "openai";
import * as googleCalendar from "./google-calendar";
import { processInteraction, extractContentTopics } from "./conversation-processor";
import { eventBus } from "./event-bus";
import { createLogger } from "./logger";
import { verifySavedContent, verifySummary, verifyTags, type VerifierContext } from "./verifiers";
import type { SavedContent } from "@shared/schema";
import * as metaInstagram from "./meta-instagram";

const logger = createLogger('Routes');

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

// ============================================================
// Content Processing Functions (Insight Inbox)
// ============================================================

async function processContentAsync(contentId: string): Promise<void> {
  try {
    const content = await storage.getSavedContent(contentId);
    if (!content) return;
    
    await processContentWithAI(content);
  } catch (error: any) {
    logger.error('Async content processing failed', { contentId, error: error.message });
  }
}

async function processContentWithAI(content: SavedContent): Promise<SavedContent> {
  const openaiClient = getOpenAI();
  
  // Audit this action
  const aiAction = await storage.createAiAction({
    actionType: 'process_content',
    proposedBy: 'ai',
    input: { contentId: content.id, url: content.url }
  });
  
  try {
    // Step 1: Fetch and extract article content if not already present
    let articleText = content.content;
    let title = content.title;
    let author = content.author;
    let siteName = content.siteName;
    
    if (!articleText) {
      try {
        const response = await fetch(content.url);
        const html = await response.text();
        
        // Basic extraction (could be enhanced with a proper parser)
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        title = titleMatch ? titleMatch[1].trim() : null;
        
        // Extract text content (simplified)
        const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
        if (bodyMatch) {
          articleText = bodyMatch[1]
            .replace(/<script[\s\S]*?<\/script>/gi, '')
            .replace(/<style[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 10000); // Limit size
        }
        
        // Try to get og:site_name
        const siteMatch = html.match(/<meta[^>]*property="og:site_name"[^>]*content="([^"]+)"/i);
        siteName = siteMatch ? siteMatch[1] : null;
        
        // Try to get author
        const authorMatch = html.match(/<meta[^>]*name="author"[^>]*content="([^"]+)"/i);
        author = authorMatch ? authorMatch[1] : null;
      } catch (fetchError: any) {
        logger.warn('Failed to fetch article', { url: content.url, error: fetchError.message });
      }
    }
    
    // Verify content was extracted
    const verifierContext: VerifierContext = {
      actionType: 'extract_content',
      proposedBy: 'ai',
      timestamp: new Date()
    };
    
    const contentVerification = verifySavedContent(
      { url: content.url, title: title || undefined, content: articleText || undefined },
      verifierContext
    );
    
    if (!contentVerification.passed) {
      await storage.updateAiAction(aiAction.id, {
        verifierName: 'savedContent',
        verifierPassed: false,
        verifierErrors: contentVerification.errors,
        verifierScore: contentVerification.score,
        outcome: 'rejected'
      });
      
      // Still save what we have
      return await storage.updateSavedContent(content.id, {
        title: title || content.url,
        content: articleText || undefined,
        author,
        siteName
      }) || content;
    }
    
    // Step 2: Generate summary and tags with AI
    let summary: string | undefined;
    let keyPoints: string[] = [];
    let tags: string[] = [];
    
    if (articleText && openaiClient) {
      const response = await openaiClient.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You analyze articles and extract structured insights. Return JSON only.`
          },
          {
            role: "user",
            content: `Analyze this article and return a JSON object with:
- summary: 2-3 sentence summary (max 300 chars)
- keyPoints: array of 3-5 key takeaways (each max 100 chars)
- tags: array of 2-5 topic tags (lowercase, single words or hyphenated)

Article title: ${title || 'Unknown'}
Article content: ${articleText.slice(0, 4000)}`
          }
        ],
        response_format: { type: "json_object" }
      });
      
      try {
        const analysis = JSON.parse(response.choices[0].message.content || '{}');
        summary = analysis.summary;
        keyPoints = analysis.keyPoints || [];
        tags = analysis.tags || [];
      } catch (parseError) {
        logger.warn('Failed to parse AI response', { contentId: content.id });
      }
    }
    
    // Verify summary
    if (summary && articleText) {
      const summaryVerification = verifySummary(
        { original: articleText, summary },
        verifierContext
      );
      
      if (!summaryVerification.passed) {
        logger.warn('Summary verification failed', { 
          contentId: content.id, 
          errors: summaryVerification.errors 
        });
        // Don't reject, just log warning
      }
    }
    
    // Update content with processed data
    const updated = await storage.updateSavedContent(content.id, {
      title: title || content.url,
      content: articleText,
      summary,
      keyPoints,
      tags,
      author,
      siteName
    });
    
    // Record successful action
    await storage.updateAiAction(aiAction.id, {
      verifierName: 'savedContent',
      verifierPassed: true,
      verifierScore: 100,
      outcome: 'executed',
      resultData: { summary, keyPointsCount: keyPoints.length, tagsCount: tags.length },
      executedAt: new Date()
    });
    
    logger.info('Content processed successfully', { 
      contentId: content.id, 
      title,
      tagsCount: tags.length 
    });
    
    return updated || content;
  } catch (error: any) {
    await storage.updateAiAction(aiAction.id, {
      outcome: 'rejected',
      verifierErrors: [error.message]
    });
    throw error;
  }
}

async function generateDailyDigest() {
  const openaiClient = getOpenAI();
  
  // Get unread content from the last 24 hours
  const allContent = await storage.getUnreadSavedContent();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  
  const recentContent = allContent.filter(c => 
    c.createdAt && new Date(c.createdAt) > yesterday
  );
  
  if (recentContent.length === 0) {
    // Create empty digest
    const digest = await storage.createDailyDigest({
      digestDate: new Date(),
      itemCount: 0,
      contentIds: [],
      summaryHtml: '<p>No new content saved today.</p>'
    });
    return digest;
  }
  
  // Generate digest summary
  let summaryHtml = '';
  
  if (openaiClient && recentContent.length > 0) {
    const contentSummaries = recentContent.map(c => 
      `- ${c.title || c.url}: ${c.summary || 'No summary'}`
    ).join('\n');
    
    const response = await openaiClient.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You create brief, scannable daily digest summaries in HTML format.`
        },
        {
          role: "user",
          content: `Create a daily digest summary for these saved articles. Use simple HTML (h3, p, ul, li). Keep it brief and actionable.

Articles:
${contentSummaries}`
        }
      ]
    });
    
    summaryHtml = response.choices[0].message.content || '';
  } else {
    summaryHtml = `<h3>Today's Reading</h3><ul>${recentContent.map(c => 
      `<li><strong>${c.title || 'Untitled'}</strong>: ${c.summary || 'No summary available'}</li>`
    ).join('')}</ul>`;
  }
  
  // Create digest
  const digest = await storage.createDailyDigest({
    digestDate: new Date(),
    itemCount: recentContent.length,
    contentIds: recentContent.map(c => c.id),
    summaryHtml
  });
  
  // Mark content as included in digest
  for (const content of recentContent) {
    await storage.updateSavedContent(content.id, {
      digestIncludedAt: new Date()
    });
  }
  
  logger.info('Daily digest generated', { 
    digestId: digest.id, 
    itemCount: recentContent.length 
  });
  
  return digest;
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

function selectModel(hasImages: boolean, hasTools: boolean, messageCount: number): { model: string; reason: string } {
  if (hasImages) {
    return { model: "gpt-4o", reason: "Vision/image analysis" };
  }
  if (hasTools || messageCount > 6) {
    return { model: "gpt-4o", reason: "Tool calling or complex reasoning" };
  }
  return { model: "gpt-4o", reason: "Default" };
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
    const allowedExt = /pdf|csv/;
    const ext = allowedExt.test(path.extname(file.originalname).toLowerCase());
    if (ext) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF and CSV files are allowed"));
    }
  },
});

const uploadAudio = multer({
  storage: storage_multer,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedMime = /audio\/(webm|mp4|mpeg|wav|ogg|flac|m4a)|video\/webm/;
    if (allowedMime.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only audio files are allowed"));
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

  // ==================== VOICE MEMORY ROUTES ====================
  
  // Transcribe voice recording using OpenAI Whisper
  app.post("/api/voice-memories/transcribe", uploadAudio.single("audio"), async (req, res) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ message: "No audio file uploaded" });
      }
      
      const openai = getOpenAI();
      const filePath = path.join(uploadDir, file.filename);
      
      const transcription = await openai.audio.transcriptions.create({
        file: fs.createReadStream(filePath),
        model: "whisper-1",
      });
      
      // Clean up the audio file after transcription
      fs.unlinkSync(filePath);
      
      res.json({ 
        transcript: transcription.text,
        duration: (transcription as any).duration || 0,
      });
    } catch (error: any) {
      console.error("Voice transcription error:", error);
      res.status(500).json({ message: error.message || "Failed to transcribe audio" });
    }
  });
  
  // Create voice memory interaction and process it
  app.post("/api/voice-memories", async (req, res) => {
    try {
      const { transcript, personId, occurredAt } = req.body;
      
      if (!transcript || transcript.trim().length < 10) {
        return res.status(400).json({ message: "Transcript is too short" });
      }
      
      // Create the interaction
      const interaction = await storage.createInteraction({
        type: "voice_note",
        personId: personId || null,
        title: `Voice Memory - ${new Date(occurredAt || Date.now()).toLocaleDateString()}`,
        summary: transcript.slice(0, 500),
        transcript: transcript,
        occurredAt: occurredAt ? new Date(occurredAt) : new Date(),
        source: "voice_memory",
      });
      
      // Update person's lastContact if linked
      if (personId) {
        await storage.updatePerson(personId, { lastContact: new Date(occurredAt || Date.now()) });
      }
      
      // Process the interaction asynchronously (FORD extraction, draft generation)
      const { processInteraction } = await import("./conversation-processor");
      const processResult = await processInteraction(interaction.id);
      
      res.json({
        success: true,
        interactionId: interaction.id,
        processed: processResult.success,
        draftsCreated: processResult.draftsCreated || 0,
      });
    } catch (error: any) {
      console.error("Voice memory creation error:", error);
      res.status(500).json({ message: error.message || "Failed to create voice memory" });
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
      
      let rows: any[] = [];
      
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
- segment: Relationship segment (A - Advocate, B - Fan, C - Network, D - Nurture/8x8)
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
    },
    {
      type: "function",
      function: {
        name: "link_household",
        description: "Link people together as a household. Creates a household and assigns all specified people to it. They will count as one unit for FORD conversations and mailers. If no name is provided, automatically generates '[Last Name] Family' from the first person's name.",
        parameters: {
          type: "object",
          properties: {
            personIds: { 
              type: "array", 
              items: { type: "string" },
              description: "Array of person IDs to link together in the same household" 
            },
            householdName: { 
              type: "string", 
              description: "Optional name for the household. If not provided, auto-generates '[Last Name] Family'" 
            }
          },
          required: ["personIds"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "post_to_instagram",
        description: "Post content to Instagram. Requires at least one image URL. This will publish immediately to the connected Instagram Business/Creator account.",
        parameters: {
          type: "object",
          properties: {
            caption: { 
              type: "string", 
              description: "The caption/text for the Instagram post. Can include hashtags." 
            },
            imageUrls: { 
              type: "array",
              items: { type: "string" },
              description: "Array of publicly accessible image URLs to post. For a single image, provide one URL. For a carousel, provide 2-10 URLs."
            }
          },
          required: ["caption", "imageUrls"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "post_to_facebook",
        description: "Post content to the connected Facebook Page. Can be text-only or include an image.",
        parameters: {
          type: "object",
          properties: {
            message: { 
              type: "string", 
              description: "The text content for the Facebook post" 
            },
            imageUrl: { 
              type: "string", 
              description: "Optional publicly accessible image URL to include with the post" 
            }
          },
          required: ["message"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "check_social_connection",
        description: "Check if Instagram/Facebook is connected and get the account details",
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
          const queryWords = query.split(/\s+/).filter((w: string) => w.length > 0);
          
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
              title: `${args.side === "seller" ? "Seller" : "Buyer"} - Deal`,
              value: args.estimatedPrice || null,
              commissionPercent: args.commissionPercent || null,
              painPleasureRating: args.painPleasure || null
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
        
        case "link_household": {
          if (!args.personIds || !Array.isArray(args.personIds) || args.personIds.length < 2) {
            return `Error: personIds must be an array with at least 2 person IDs`;
          }
          
          // Get person details to auto-generate household name if not provided
          const peopleForHousehold: { id: string; name: string }[] = [];
          for (const personId of args.personIds) {
            const person = await storage.getPerson(personId);
            if (person) {
              peopleForHousehold.push({ id: person.id, name: person.name || personId });
            }
          }
          
          // Auto-generate household name from last name if not provided
          let householdName = args.householdName;
          if (!householdName && peopleForHousehold.length > 0) {
            // Extract last name from first person's name
            const firstPersonName = peopleForHousehold[0].name;
            const nameParts = firstPersonName.trim().split(/\s+/);
            const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : firstPersonName;
            householdName = `${lastName} Family`;
          }
          
          if (!householdName) {
            return `Error: Could not determine household name`;
          }
          
          const household = await storage.createHousehold({ 
            name: householdName,
            address: null
          });
          
          const linkedNames: string[] = [];
          for (const personId of args.personIds) {
            const updated = await storage.addPersonToHousehold(personId, household.id);
            if (updated) {
              linkedNames.push(updated.name || personId);
            }
          }
          
          if (linkedNames.length === 0) {
            return `Error: Could not link any people to the household`;
          }
          
          return `Created "${householdName}" and linked ${linkedNames.join(", ")}. They will now count as one household for FORD conversations and mailers.`;
        }
        
        case "post_to_instagram": {
          if (!args.caption) {
            return `Error: caption is required for Instagram posts`;
          }
          if (!args.imageUrls || !Array.isArray(args.imageUrls) || args.imageUrls.length === 0) {
            return `Error: imageUrls array with at least one URL is required for Instagram posts`;
          }
          
          const result = await metaInstagram.postToInstagram(args.caption, args.imageUrls);
          
          if (result.success) {
            return `Successfully posted to Instagram! View your post: ${result.permalink}`;
          } else {
            return `Failed to post to Instagram: ${result.error}`;
          }
        }
        
        case "post_to_facebook": {
          if (!args.message) {
            return `Error: message is required for Facebook posts`;
          }
          
          const imageUrls = args.imageUrl ? [args.imageUrl] : undefined;
          const result = await metaInstagram.postToFacebook(args.message, imageUrls);
          
          if (result.success) {
            return `Successfully posted to Facebook! Post ID: ${result.postId}`;
          } else {
            return `Failed to post to Facebook: ${result.error}`;
          }
        }
        
        case "check_social_connection": {
          const status = await metaInstagram.getMetaConnectionStatus();
          
          if (status.connected) {
            return JSON.stringify({
              connected: true,
              accountName: status.accountName,
              instagramUsername: status.instagramUsername,
              expiresAt: status.expiresAt
            });
          } else {
            return `Instagram/Facebook is not connected. Please go to Settings to connect your Meta account.`;
          }
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
      
      const systemPrompt = `You are the Flow AI Assistant - an AGENTIC AI with full control to search, view, and modify data in Flow OS (a real estate business operating system).

YOU CAN TAKE ACTION. When the user asks you to do something, USE YOUR TOOLS to actually do it:
- Search for people by name/email/segment
- View complete person details including FORD notes and deals
- Update person information (segment, FORD notes, buyer needs, contact info)
- Create new contacts
- Log interactions/conversations
- Create tasks and follow-ups
- Update deal stages (warm → hot → in_contract → closed)
- Get Hot/Warm lists and today's tasks
- Link people together as a household (they count as one for FORD conversations)
- POST TO INSTAGRAM AND FACEBOOK: You can post content directly to social media if connected

WORKFLOW:
1. When user mentions a person, FIRST search for them to get their ID
2. Then use get_person_details to see their full record
3. Make the requested changes using update_person, log_interaction, etc.
4. Confirm what you did

Current context: User is on ${context?.pageDescription || context?.currentPage || 'Flow OS'}

Relationship selling principles:
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
          const tc = toolCall as any;
          const args = JSON.parse(tc.function.arguments);
          const result = await executeAiTool(tc.function.name, args);
          actionsExecuted.push({ tool: tc.function.name, result });
          
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
  
  // Get contacts due for follow-up (must be before :id route)
  app.get("/api/people/due-for-contact", async (req, res) => {
    try {
      const dueContacts = await storage.getContactsDueForFollowUp();
      res.json(dueContacts);
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
  
  // Get person with full context (unified data layer)
  app.get("/api/people/:id/full", async (req, res) => {
    try {
      const context = await storage.getPersonFullContext(req.params.id);
      if (!context) {
        return res.status(404).json({ message: "Person not found" });
      }
      res.json(context);
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
      
      // Emit deal created event
      eventBus.emitDealCreated(deal.id, deal.personId, { 
        title: deal.title, 
        stage: deal.stage, 
        type: deal.type,
        value: deal.value 
      });
      
      res.status(201).json(deal);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
  
  // Update deal
  app.patch("/api/deals/:id", async (req, res) => {
    try {
      // Get current deal to check for stage changes
      const currentDeal = await storage.getDeal(req.params.id);
      if (!currentDeal) {
        return res.status(404).json({ message: "Deal not found" });
      }
      
      const deal = await storage.updateDeal(req.params.id, req.body);
      if (!deal) {
        return res.status(404).json({ message: "Deal not found" });
      }
      
      // Emit stage change event if stage changed
      if (req.body.stage && req.body.stage !== currentDeal.stage) {
        eventBus.emitDealStageChanged(deal.id, deal.personId, currentDeal.stage, deal.stage);
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
  
  // Generate follow-up tasks for overdue contacts
  app.post("/api/tasks/generate-followup", async (req, res) => {
    try {
      const dueContacts = await storage.getContactsDueForFollowUp();
      const createdTasks = [];
      
      for (const due of dueContacts) {
        const reasonLabel = {
          hot: 'Hot List (weekly)',
          warm: 'Warm List (monthly)',
          segment_a: 'A Contact (monthly)',
          segment_b: 'B Contact (every 2 months)',
          segment_c: 'C Contact (quarterly)',
          segment_d: 'D Contact (quarterly - review to develop or delete)',
        }[due.dueReason];
        
        const task = await storage.createTask({
          title: `Follow up with ${due.person.name}`,
          description: `${reasonLabel} - ${due.daysOverdue} days overdue. Last contact: ${due.daysSinceContact} days ago.`,
          personId: due.person.id,
          dueDate: new Date(),
          priority: due.dueReason === 'hot' ? 'high' : due.dueReason === 'warm' ? 'medium' : 'low',
        });
        createdTasks.push(task);
      }
      
      res.json({ 
        message: `Created ${createdTasks.length} follow-up tasks`,
        tasks: createdTasks 
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // ==================== 8x8 CAMPAIGNS ROUTES ====================
  
  // Get all 8x8 campaigns
  app.get("/api/8x8-campaigns", async (req, res) => {
    try {
      const campaigns = await storage.getAll8x8Campaigns();
      res.json(campaigns);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Get 8x8 campaign by ID
  app.get("/api/8x8-campaigns/:id", async (req, res) => {
    try {
      const campaign = await storage.get8x8Campaign(req.params.id);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      res.json(campaign);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Create 8x8 campaign
  app.post("/api/8x8-campaigns", async (req, res) => {
    try {
      const campaign = await storage.create8x8Campaign(req.body);
      res.status(201).json(campaign);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
  
  // Update 8x8 campaign
  app.patch("/api/8x8-campaigns/:id", async (req, res) => {
    try {
      const campaign = await storage.update8x8Campaign(req.params.id, req.body);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      res.json(campaign);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
  
  // Record a touch in an 8x8 campaign
  app.post("/api/8x8-campaigns/:id/touch", async (req, res) => {
    try {
      const campaign = await storage.get8x8Campaign(req.params.id);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      
      const { type, notes } = req.body;
      const touches = campaign.touches || [];
      const newTouch = {
        step: touches.length + 1,
        type,
        completedAt: new Date().toISOString(),
        notes,
      };
      touches.push(newTouch);
      
      const isComplete = touches.length >= 8;
      const updated = await storage.update8x8Campaign(req.params.id, {
        touches,
        completedSteps: touches.length,
        currentStep: Math.min(touches.length + 1, 8),
        status: isComplete ? 'completed' : 'active',
        completedAt: isComplete ? new Date() : undefined,
      });
      
      // If completed, flag person for review
      if (isComplete && campaign.personId) {
        await storage.flagContactForReview(campaign.personId, 'needs_review');
      }
      
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
  
  // Complete 8x8 campaign with outcome
  app.post("/api/8x8-campaigns/:id/complete", async (req, res) => {
    try {
      const { outcome, outcomeNotes } = req.body;
      const campaign = await storage.update8x8Campaign(req.params.id, {
        status: 'completed',
        outcome,
        outcomeNotes,
        completedAt: new Date(),
      });
      
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      
      // Update person based on outcome
      if (campaign.personId) {
        if (outcome === 'deleted') {
          await storage.deletePerson(campaign.personId);
        } else if (outcome?.startsWith('promoted_to_')) {
          const newSegment = outcome.replace('promoted_to_', '').toUpperCase();
          await storage.updatePerson(campaign.personId, { 
            segment: newSegment,
            segmentEnteredAt: new Date(),
            reviewStatus: null,
          });
        }
      }
      
      res.json(campaign);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
  
  // Delete 8x8 campaign
  app.delete("/api/8x8-campaigns/:id", async (req, res) => {
    try {
      await storage.delete8x8Campaign(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // ==================== D CONTACT REVIEW ROUTES ====================
  
  // Get D contacts needing review (stale, low engagement, or campaign completed)
  app.get("/api/d-contacts/review", async (req, res) => {
    try {
      const contacts = await storage.getDContactsNeedingReview();
      res.json(contacts);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Get stale D contacts (6+ months in segment)
  app.get("/api/d-contacts/stale", async (req, res) => {
    try {
      const contacts = await storage.getStaleDContacts();
      res.json(contacts);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Get low engagement D contacts
  app.get("/api/d-contacts/low-engagement", async (req, res) => {
    try {
      const contacts = await storage.getLowEngagementDContacts();
      res.json(contacts);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Generate quarterly D review task
  app.post("/api/d-contacts/generate-review-task", async (req, res) => {
    try {
      const reviewContacts = await storage.getDContactsNeedingReview();
      
      if (reviewContacts.length === 0) {
        return res.json({ message: "No D contacts need review", task: null });
      }
      
      const staleCt = reviewContacts.filter(c => c.reason === 'stale').length;
      const lowEngagementCt = reviewContacts.filter(c => c.reason === 'low_engagement').length;
      const campaignCompletedCt = reviewContacts.filter(c => c.reason === 'campaign_completed').length;
      
      const task = await storage.createTask({
        title: `Quarterly D Contact Review (${reviewContacts.length} contacts)`,
        description: `Review D contacts to develop or delete:\n- ${staleCt} stale (6+ months)\n- ${lowEngagementCt} low engagement (3+ attempts, no response)\n- ${campaignCompletedCt} completed 8x8 campaigns`,
        dueDate: new Date(),
        priority: 'medium',
      });
      
      res.json({ 
        message: `Created D contact review task for ${reviewContacts.length} contacts`,
        task,
        summary: { stale: staleCt, lowEngagement: lowEngagementCt, campaignCompleted: campaignCompletedCt }
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Batch update D contacts (promote, keep, or delete)
  app.post("/api/d-contacts/batch-action", async (req, res) => {
    try {
      const { personIds, action, newSegment } = req.body;
      const results = [];
      
      for (const personId of personIds) {
        if (action === 'delete') {
          await storage.deletePerson(personId);
          results.push({ personId, action: 'deleted' });
        } else if (action === 'promote' && newSegment) {
          const updated = await storage.updatePerson(personId, {
            segment: newSegment,
            segmentEnteredAt: new Date(),
            reviewStatus: null,
          });
          results.push({ personId, action: 'promoted', newSegment });
        } else if (action === 'keep') {
          await storage.flagContactForReview(personId, 'keep');
          results.push({ personId, action: 'kept' });
        }
      }
      
      res.json({ 
        message: `Processed ${results.length} contacts`,
        results 
      });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
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
      // Convert date string to Date object before validation
      const body = {
        ...req.body,
        date: req.body.date ? new Date(req.body.date) : undefined,
      };
      const data = validate(insertPieEntrySchema, body);
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

  // Extract PIE data from screenshot using AI vision
  app.post("/api/pie-entries/extract-from-image", upload.single("image"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No image file provided" });
      }

      const openai = getOpenAI();
      const imagePath = req.file.path;
      const imageBuffer = fs.readFileSync(imagePath);
      const base64Image = imageBuffer.toString("base64");
      const mimeType = req.file.mimetype || "image/png";

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a data extraction assistant. Extract PIE (Productive, Indirect, Everything Else) time tracking data from the provided screenshot.

Return a JSON array of entries with this structure:
{
  "entries": [
    {
      "date": "YYYY-MM-DD",
      "pTime": number (minutes of Productive time),
      "iTime": number (minutes of Indirect time),
      "eTime": number (minutes of Everything Else time),
      "totalTime": number (total minutes)
    }
  ]
}

Guidelines:
- If times are in hours (e.g., "2.5" or "2:30"), convert to minutes
- P/Productive time = income-producing activities (calls, meetings, prospecting)
- I/Indirect time = supporting activities (admin, education, planning)
- E/Everything Else = other work time
- If a column is missing, use 0 for that value
- Parse dates in any format and convert to YYYY-MM-DD
- If totalTime is provided but P/I/E are not, set totalTime and leave others as 0

Return ONLY valid JSON, no explanations.`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extract all PIE time tracking entries from this screenshot. Return as JSON."
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`
                }
              }
            ]
          }
        ],
        max_tokens: 4000,
        temperature: 0.1
      });

      // Clean up uploaded file
      fs.unlinkSync(imagePath);

      const content = response.choices[0]?.message?.content || "{}";
      
      // Try to parse the JSON response
      let parsed;
      try {
        // Remove markdown code blocks if present
        const cleanContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        parsed = JSON.parse(cleanContent);
      } catch (parseError) {
        console.error("Failed to parse AI response:", content);
        return res.status(400).json({ 
          message: "Failed to extract data from image. Please try a clearer screenshot.",
          rawResponse: content
        });
      }

      res.json(parsed);
    } catch (error: any) {
      console.error("PIE image extraction error:", error);
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
  
  // Get processing status (must be before :id route)
  app.get("/api/interactions/process-status", async (req, res) => {
    res.json(processingStatus);
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
        // Emit contact made event
        eventBus.emitContactMade(data.personId, interaction.id, interaction.type);
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
  
  // Coaching analysis for an interaction
  app.post("/api/interactions/:id/coaching-analysis", async (req, res) => {
    try {
      const { analyzeConversationForCoaching } = await import("./conversation-processor");
      const interaction = await storage.getInteraction(req.params.id);
      
      if (!interaction) {
        return res.status(404).json({ message: "Interaction not found" });
      }
      
      if (!interaction.transcript || interaction.transcript.length < 100) {
        return res.status(400).json({ message: "Interaction has no transcript to analyze" });
      }
      
      const person = interaction.personId 
        ? (await storage.getPerson(interaction.personId)) ?? null
        : null;
      
      const analysis = await analyzeConversationForCoaching(interaction, person);
      
      await storage.updateInteraction(req.params.id, {
        coachingAnalysis: analysis,
      });
      
      res.json({ success: true, analysis });
    } catch (error: any) {
      console.error("Error analyzing conversation for coaching:", error);
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
  
  // Batch coaching analysis for all conversations with transcripts
  app.post("/api/interactions/analyze-all-coaching", async (req, res) => {
    try {
      const { analyzeConversationForCoaching } = await import("./conversation-processor");
      const allInteractions = await storage.getAllInteractions();
      
      let analyzed = 0;
      let skipped = 0;
      let failed = 0;
      
      // Filter to only conversations with transcripts that haven't been analyzed
      const toAnalyze = allInteractions.filter(i => 
        i.transcript && 
        i.transcript.length >= 100 && 
        !i.coachingAnalysis
      );
      
      console.log(`[Batch Coaching] Starting analysis of ${toAnalyze.length} conversations...`);
      
      for (const interaction of toAnalyze) {
        try {
          const person = interaction.personId 
            ? (await storage.getPerson(interaction.personId)) ?? null
            : null;
          
          const analysis = await analyzeConversationForCoaching(interaction, person);
          await storage.updateInteraction(interaction.id, { coachingAnalysis: analysis });
          analyzed++;
          console.log(`[Batch Coaching] Analyzed: ${interaction.title || 'Untitled'} - Score: ${analysis.overallScore}`);
        } catch (error: any) {
          failed++;
          console.error(`[Batch Coaching] Failed to analyze ${interaction.id}:`, error.message);
        }
      }
      
      skipped = allInteractions.length - toAnalyze.length;
      
      console.log(`[Batch Coaching] Complete: ${analyzed} analyzed, ${skipped} skipped, ${failed} failed`);
      
      res.json({
        success: true,
        analyzed,
        skipped,
        failed,
        total: allInteractions.length,
        eligibleForAnalysis: toAnalyze.length,
      });
    } catch (error: any) {
      console.error("Error in batch coaching analysis:", error);
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

  // ============ GMAIL INTEGRATION ROUTES ============
  // Uses Replit's Gmail connection: connection:conn_google-mail_01KCW4C87PFGRAKYSAWHY140MP
  
  const gmailClient = await import("./gmail-client");
  
  app.get("/api/gmail/status", async (req, res) => {
    try {
      const connected = await gmailClient.isGmailConnected();
      if (connected) {
        const profile = await gmailClient.getGmailProfile();
        res.json({ connected: true, email: profile.emailAddress });
      } else {
        res.json({ connected: false });
      }
    } catch (error: any) {
      res.json({ connected: false, error: error.message });
    }
  });

  app.post("/api/gmail/send", async (req, res) => {
    try {
      const { to, subject, body, draftId } = req.body;
      
      if (!to || !subject || !body) {
        return res.status(400).json({ message: "Missing required fields: to, subject, body" });
      }
      
      const result = await gmailClient.sendEmail({ to, subject, body });
      
      // If this was sent from a draft, mark it as sent
      if (draftId) {
        await storage.updateGeneratedDraft(draftId, { status: "sent", sentAt: new Date() });
      }
      
      res.json({ success: true, messageId: result.id });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/gmail/draft", async (req, res) => {
    try {
      const { to, subject, body } = req.body;
      
      if (!to || !subject || !body) {
        return res.status(400).json({ message: "Missing required fields: to, subject, body" });
      }
      
      const result = await gmailClient.createDraft({ to, subject, body });
      res.json({ success: true, draftId: result.id });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
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

  // Sync Flow OS tasks to Todoist
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
              labels: ["flow-os"]
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

  // ============ META/INSTAGRAM API ROUTES ============
  
  // Get OAuth URL for connecting Meta account
  app.get("/api/meta/oauth-url", async (req, res) => {
    try {
      const host = req.get('host') || 'localhost:5000';
      const protocol = req.headers['x-forwarded-proto'] || 'http';
      const redirectUri = `${protocol}://${host}/api/meta/callback`;
      
      const oauthUrl = metaInstagram.getMetaOAuthUrl(redirectUri);
      res.json({ url: oauthUrl, redirectUri });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // OAuth callback from Meta
  app.get("/api/meta/callback", async (req, res) => {
    try {
      const { code, error, error_description } = req.query;
      
      if (error) {
        return res.redirect(`/settings?meta_error=${encodeURIComponent(error_description as string || error as string)}`);
      }
      
      if (!code) {
        return res.redirect('/settings?meta_error=No authorization code received');
      }
      
      const host = req.get('host') || 'localhost:5000';
      const protocol = req.headers['x-forwarded-proto'] || 'http';
      const redirectUri = `${protocol}://${host}/api/meta/callback`;
      
      // Exchange code for short-lived token
      const shortTokenResult = await metaInstagram.exchangeCodeForToken(code as string, redirectUri);
      
      // Exchange for long-lived token (60 days)
      const longTokenResult = await metaInstagram.getLongLivedToken(shortTokenResult.access_token);
      
      // Get Facebook Pages
      const pages = await metaInstagram.getFacebookPages(longTokenResult.access_token);
      
      if (pages.length === 0) {
        return res.redirect('/settings?meta_error=No Facebook Pages found. Please ensure you have a Facebook Page linked to your Instagram account.');
      }
      
      // Use first page (user can change later if needed)
      const page = pages[0];
      
      // Get Instagram Business Account linked to the page
      const instagramAccount = await metaInstagram.getInstagramAccount(page.id, page.access_token);
      
      // Deactivate any existing Meta connections
      const existingConnections = await storage.getAllSocialConnections();
      for (const conn of existingConnections.filter(c => c.platform === 'meta')) {
        await storage.updateSocialConnection(conn.id, { isActive: false });
      }
      
      // Calculate expiration (60 days for long-lived tokens)
      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + (longTokenResult.expires_in || 5184000));
      
      // Store the connection
      await storage.createSocialConnection({
        platform: 'meta',
        accessToken: page.access_token, // Use page access token for posting
        accessTokenExpiresAt: expiresAt,
        platformUserId: page.id,
        platformPageId: page.id,
        instagramAccountId: instagramAccount?.id || null,
        accountName: page.name,
        scopes: ['instagram_basic', 'instagram_content_publish', 'pages_show_list'],
        metadata: {
          pageName: page.name,
          instagramUsername: instagramAccount?.username,
          instagramName: instagramAccount?.name
        },
        isActive: true
      });
      
      res.redirect('/settings?meta_connected=true');
    } catch (error: any) {
      console.error('Meta OAuth error:', error);
      res.redirect(`/settings?meta_error=${encodeURIComponent(error.message)}`);
    }
  });
  
  // Get Meta connection status
  app.get("/api/meta/status", async (req, res) => {
    try {
      const status = await metaInstagram.getMetaConnectionStatus();
      res.json(status);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Disconnect Meta account
  app.post("/api/meta/disconnect", async (req, res) => {
    try {
      const connection = await storage.getActiveSocialConnection('meta');
      if (connection) {
        await storage.deleteSocialConnection(connection.id);
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Post to Instagram (manual API call)
  app.post("/api/meta/post/instagram", async (req, res) => {
    try {
      const { caption, imageUrls } = req.body;
      
      if (!caption || !imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
        return res.status(400).json({ message: "Caption and at least one image URL are required" });
      }
      
      const result = await metaInstagram.postToInstagram(caption, imageUrls);
      
      if (result.success) {
        // Save the post record
        await storage.createSocialPost({
          platform: 'instagram',
          postType: 'feed',
          content: caption,
          mediaUrls: imageUrls,
          status: 'published',
          publishedAt: new Date(),
          platformPostId: result.postId,
          platformPostUrl: result.permalink
        });
        
        res.json(result);
      } else {
        res.status(400).json({ message: result.error });
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Post to Facebook (manual API call)
  app.post("/api/meta/post/facebook", async (req, res) => {
    try {
      const { message, imageUrl } = req.body;
      
      if (!message) {
        return res.status(400).json({ message: "Message is required" });
      }
      
      const imageUrls = imageUrl ? [imageUrl] : undefined;
      const result = await metaInstagram.postToFacebook(message, imageUrls);
      
      if (result.success) {
        // Save the post record
        await storage.createSocialPost({
          platform: 'facebook',
          postType: 'feed',
          content: message,
          mediaUrls: imageUrls || null,
          status: 'published',
          publishedAt: new Date(),
          platformPostId: result.postId,
          platformPostUrl: result.permalink
        });
        
        res.json(result);
      } else {
        res.status(400).json({ message: result.error });
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Get post history
  app.get("/api/meta/posts", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const posts = await storage.getAllSocialPosts(limit);
      res.json(posts);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ============ SYNC API ROUTES ============
  // API endpoints for local sync agents (Granola, Plaud, iMessage, WhatsApp)
  
  // Get sync status and logs
  app.get("/api/sync/logs", async (req, res) => {
    try {
      const { source } = req.query;
      const logs = source 
        ? await storage.getSyncLogsBySource(source as string)
        : await storage.getAllSyncLogs();
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Main sync endpoint - receives data from local agents
  app.post("/api/sync/push", async (req, res) => {
    try {
      const { source, syncType, items, metadata } = req.body;
      
      if (!source || !["granola", "plaud", "imessage", "whatsapp"].includes(source)) {
        return res.status(400).json({ message: "Invalid source. Must be one of: granola, plaud, imessage, whatsapp" });
      }
      
      if (!items || !Array.isArray(items)) {
        return res.status(400).json({ message: "Items array required" });
      }
      
      // Create sync log
      const syncLog = await storage.createSyncLog({
        source,
        syncType: syncType || "incremental",
        status: "processing",
        itemsReceived: items.length,
        itemsProcessed: 0,
        itemsFailed: 0,
        metadata: metadata || null,
      });
      
      let processed = 0;
      let failed = 0;
      const results: { id: string; status: string; personId?: string; interactionId?: string; error?: string }[] = [];
      
      for (const item of items) {
        try {
          // Each item should have: externalId, type, content, timestamp, participants
          const { externalId, type, title, content, summary, transcript, timestamp, participants, duration, personHint } = item;
          
          if (!externalId) {
            results.push({ id: "unknown", status: "failed", error: "Missing externalId" });
            failed++;
            continue;
          }
          
          // Check if this interaction already exists (deduplication)
          const existing = await storage.getInteractionByExternalId(externalId);
          if (existing) {
            results.push({ id: externalId, status: "skipped", interactionId: existing.id });
            processed++;
            continue;
          }
          
          // Try to match to a person
          let personId: string | undefined;
          
          // Try by phone number from participants
          if (participants && Array.isArray(participants)) {
            for (const participant of participants) {
              if (participant.phone) {
                const person = await storage.getPersonByPhone(participant.phone);
                if (person) {
                  personId = person.id;
                  break;
                }
              }
              if (participant.email) {
                const person = await storage.getPersonByEmail(participant.email);
                if (person) {
                  personId = person.id;
                  break;
                }
              }
              if (participant.name) {
                const matches = await storage.searchPeopleByName(participant.name);
                if (matches.length === 1) {
                  personId = matches[0].id;
                  break;
                }
              }
            }
          }
          
          // Use personHint if provided and no match yet
          if (!personId && personHint) {
            if (personHint.id) {
              personId = personHint.id;
            } else if (personHint.phone) {
              const person = await storage.getPersonByPhone(personHint.phone);
              if (person) personId = person.id;
            } else if (personHint.email) {
              const person = await storage.getPersonByEmail(personHint.email);
              if (person) personId = person.id;
            } else if (personHint.name) {
              const matches = await storage.searchPeopleByName(personHint.name);
              if (matches.length === 1) personId = matches[0].id;
            }
          }
          
          // Create the interaction
          const interaction = await storage.createInteraction({
            personId: personId || null,
            type: type || "meeting",
            source,
            title: title || `${source.charAt(0).toUpperCase() + source.slice(1)} ${type || "interaction"}`,
            summary: summary || null,
            transcript: transcript || content || null,
            externalId,
            externalLink: item.externalLink || null,
            duration: duration || null,
            occurredAt: timestamp ? new Date(timestamp) : new Date(),
            participants: participants?.map((p: any) => p.name || p.phone || p.email).filter(Boolean) || null,
            tags: [source],
            aiExtractedData: null,
            deletedAt: null,
          });
          
          // Update person's lastContact if we matched
          if (personId) {
            await storage.updatePerson(personId, { 
              lastContact: interaction.occurredAt 
            });
          }
          
          results.push({ 
            id: externalId, 
            status: "created", 
            personId: personId || undefined,
            interactionId: interaction.id 
          });
          processed++;
        } catch (itemError: any) {
          results.push({ id: item.externalId || "unknown", status: "failed", error: itemError.message });
          failed++;
        }
      }
      
      // Update sync log
      await storage.updateSyncLog(syncLog.id, {
        status: "completed",
        itemsProcessed: processed,
        itemsFailed: failed,
        completedAt: new Date(),
      });
      
      res.json({
        syncId: syncLog.id,
        received: items.length,
        processed,
        failed,
        results,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Transcribe audio and create interaction (for Plaud)
  app.post("/api/sync/transcribe", async (req, res) => {
    try {
      const { audioUrl, audioBase64, source, externalId, timestamp, personHint } = req.body;
      
      if (!audioUrl && !audioBase64) {
        return res.status(400).json({ message: "Either audioUrl or audioBase64 required" });
      }
      
      if (!externalId) {
        return res.status(400).json({ message: "externalId required for deduplication" });
      }
      
      // Check for existing
      const existing = await storage.getInteractionByExternalId(externalId);
      if (existing) {
        return res.json({ 
          status: "skipped", 
          message: "Already exists",
          interactionId: existing.id 
        });
      }
      
      // Transcribe with Whisper
      let transcript: string;
      const openaiClient = getOpenAI();
      
      if (audioBase64) {
        // Decode base64 to buffer
        const buffer = Buffer.from(audioBase64, 'base64');
        const tempPath = path.join(uploadDir, `temp_${Date.now()}.m4a`);
        fs.writeFileSync(tempPath, buffer);
        
        const file = fs.createReadStream(tempPath);
        const transcription = await openaiClient.audio.transcriptions.create({
          file,
          model: "whisper-1",
          response_format: "text",
        });
        transcript = transcription;
        
        // Clean up temp file
        fs.unlinkSync(tempPath);
      } else {
        // Download from URL
        const response = await fetch(audioUrl);
        const buffer = Buffer.from(await response.arrayBuffer());
        const tempPath = path.join(uploadDir, `temp_${Date.now()}.m4a`);
        fs.writeFileSync(tempPath, buffer);
        
        const file = fs.createReadStream(tempPath);
        const transcription = await openaiClient.audio.transcriptions.create({
          file,
          model: "whisper-1",
          response_format: "text",
        });
        transcript = transcription;
        
        fs.unlinkSync(tempPath);
      }
      
      // Try to match person
      let personId: string | undefined;
      if (personHint) {
        if (personHint.id) {
          personId = personHint.id;
        } else if (personHint.phone) {
          const person = await storage.getPersonByPhone(personHint.phone);
          if (person) personId = person.id;
        } else if (personHint.name) {
          const matches = await storage.searchPeopleByName(personHint.name);
          if (matches.length === 1) personId = matches[0].id;
        }
      }
      
      // Create interaction
      const interaction = await storage.createInteraction({
        personId: personId || null,
        type: "call",
        source: source || "plaud",
        title: `Plaud Recording ${new Date(timestamp || Date.now()).toLocaleDateString()}`,
        summary: null,
        transcript,
        externalId,
        externalLink: audioUrl || null,
        duration: null,
        occurredAt: timestamp ? new Date(timestamp) : new Date(),
        participants: null,
        tags: ["plaud", "transcribed"],
        aiExtractedData: null,
        deletedAt: null,
      });
      
      // Update person's lastContact if matched
      if (personId) {
        await storage.updatePerson(personId, { lastContact: interaction.occurredAt });
      }
      
      res.json({
        status: "created",
        interactionId: interaction.id,
        personId,
        transcriptLength: transcript.length,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Search people (for local agents to find person matches)
  app.get("/api/sync/search-person", async (req, res) => {
    try {
      const { phone, email, name } = req.query;
      
      if (phone) {
        const person = await storage.getPersonByPhone(phone as string);
        return res.json({ matches: person ? [person] : [] });
      }
      
      if (email) {
        const person = await storage.getPersonByEmail(email as string);
        return res.json({ matches: person ? [person] : [] });
      }
      
      if (name) {
        const matches = await storage.searchPeopleByName(name as string);
        return res.json({ matches });
      }
      
      res.json({ matches: [] });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ===== HANDWRITTEN NOTE UPLOADS =====
  
  // Get all handwritten note uploads
  app.get("/api/handwritten-notes", async (req, res) => {
    try {
      const { status } = req.query;
      let uploads;
      if (status) {
        uploads = await storage.getHandwrittenNoteUploadsByStatus(status as string);
      } else {
        uploads = await storage.getAllHandwrittenNoteUploads();
      }
      res.json(uploads);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Upload a handwritten note image
  app.post("/api/handwritten-notes/upload", upload.single("image"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No image file provided" });
      }
      
      const imageUrl = `/uploads/${req.file.filename}`;
      
      const noteUpload = await storage.createHandwrittenNoteUpload({
        imageUrl,
        status: "pending_ocr",
      });
      
      res.json(noteUpload);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Run OCR on a handwritten note
  app.post("/api/handwritten-notes/:id/ocr", async (req, res) => {
    try {
      const noteUpload = await storage.getHandwrittenNoteUpload(req.params.id);
      if (!noteUpload) {
        return res.status(404).json({ message: "Note upload not found" });
      }
      
      // Read the image file and convert to base64
      const imagePath = path.join(process.cwd(), noteUpload.imageUrl);
      if (!fs.existsSync(imagePath)) {
        return res.status(404).json({ message: "Image file not found" });
      }
      
      const imageBuffer = fs.readFileSync(imagePath);
      const base64Image = imageBuffer.toString("base64");
      const mimeType = noteUpload.imageUrl.endsWith(".png") ? "image/png" : "image/jpeg";
      
      // Use OpenAI Vision to extract text
      const client = getOpenAI();
      const response = await client.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `This is a handwritten thank-you note or personal note. Please extract:
1. The full text of the note exactly as written
2. The recipient's first name (if visible, usually after "Dear" or at the top)

Respond in JSON format:
{
  "text": "the full transcribed text of the note",
  "recipientName": "the recipient's first name or null if not found"
}`
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`
                }
              }
            ]
          }
        ],
        max_tokens: 1000,
      });
      
      const content = response.choices[0]?.message?.content || "";
      let ocrText = content;
      let recipientName = null;
      
      // Try to parse JSON response
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          ocrText = parsed.text || content;
          recipientName = parsed.recipientName || null;
        }
      } catch {
        // Keep raw content if JSON parse fails
      }
      
      // Update the note upload with OCR results
      const updated = await storage.updateHandwrittenNoteUpload(req.params.id, {
        ocrText,
        recipientName,
        status: "pending_tag",
      });
      
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Update a handwritten note (tag person, etc.)
  app.patch("/api/handwritten-notes/:id", async (req, res) => {
    try {
      const updated = await storage.updateHandwrittenNoteUpload(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ message: "Note upload not found" });
      }
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Delete a handwritten note upload
  app.delete("/api/handwritten-notes/:id", async (req, res) => {
    try {
      await storage.deleteHandwrittenNoteUpload(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Add handwritten note text to voice profile
  app.post("/api/handwritten-notes/:id/add-to-voice-profile", async (req, res) => {
    try {
      const noteUpload = await storage.getHandwrittenNoteUpload(req.params.id);
      if (!noteUpload) {
        return res.status(404).json({ message: "Note upload not found" });
      }
      
      if (!noteUpload.ocrText) {
        return res.status(400).json({ message: "Note has not been processed with OCR yet" });
      }
      
      // Add the note text as a voice profile pattern
      const pattern = await storage.upsertVoicePattern(
        "handwritten_notes",
        noteUpload.ocrText,
        "handwritten_note",
        `handwritten_note_${noteUpload.id}`
      );
      
      // Mark as complete
      await storage.updateHandwrittenNoteUpload(req.params.id, {
        status: "complete",
      });
      
      res.json({ success: true, pattern });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // =========================================================================
  // CONTENT INTELLIGENCE - Topics, Ideas, Calendar
  // =========================================================================
  
  // Content Topics
  app.get("/api/content-topics", async (req, res) => {
    try {
      const status = req.query.status as string | undefined;
      const topics = status === 'active' 
        ? await storage.getActiveContentTopics()
        : await storage.getAllContentTopics();
      res.json(topics);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Mining status - MUST be before :id route
  let topicMiningStatus = {
    isProcessing: false,
    total: 0,
    processed: 0,
    topicsFound: 0,
    newTopics: 0,
  };
  
  app.get("/api/content-topics/mining-status", async (req, res) => {
    res.json(topicMiningStatus);
  });
  
  app.post("/api/content-topics/mine-all", async (req, res) => {
    if (topicMiningStatus.isProcessing) {
      return res.status(409).json({ 
        message: "Topic mining already in progress",
        status: topicMiningStatus
      });
    }
    
    const interactions = await storage.getAllInteractions();
    const interactionsWithTranscripts = interactions.filter(
      i => (i.transcript && i.transcript.length >= 200) || (i.summary && i.summary.length >= 200)
    );
    
    topicMiningStatus = {
      isProcessing: true,
      total: interactionsWithTranscripts.length,
      processed: 0,
      topicsFound: 0,
      newTopics: 0,
    };
    
    res.json({ 
      message: "Topic mining started",
      totalToProcess: interactionsWithTranscripts.length
    });
    
    (async () => {
      for (const interaction of interactionsWithTranscripts) {
        try {
          const transcript = interaction.transcript || interaction.summary || "";
          const result = await extractContentTopics(transcript, interaction.id);
          topicMiningStatus.topicsFound += result.topicsFound;
          topicMiningStatus.newTopics += result.newTopics;
        } catch (error) {
          console.error(`Error mining topics from interaction ${interaction.id}:`, error);
        }
        topicMiningStatus.processed++;
      }
      topicMiningStatus.isProcessing = false;
    })();
  });
  
  app.get("/api/content-topics/:id", async (req, res) => {
    try {
      const topic = await storage.getContentTopic(req.params.id);
      if (!topic) {
        return res.status(404).json({ message: "Topic not found" });
      }
      res.json(topic);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  app.post("/api/content-topics", async (req, res) => {
    try {
      const parsed = insertContentTopicSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: fromZodError(parsed.error).message });
      }
      const topic = await storage.createContentTopic(parsed.data);
      res.status(201).json(topic);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  app.patch("/api/content-topics/:id", async (req, res) => {
    try {
      const updated = await storage.updateContentTopic(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ message: "Topic not found" });
      }
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  app.post("/api/content-topics/:id/increment", async (req, res) => {
    try {
      const { quote, interactionId } = req.body;
      const updated = await storage.incrementTopicMention(req.params.id, quote, interactionId);
      if (!updated) {
        return res.status(404).json({ message: "Topic not found" });
      }
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  app.delete("/api/content-topics/:id", async (req, res) => {
    try {
      await storage.deleteContentTopic(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Content Ideas
  app.get("/api/content-ideas", async (req, res) => {
    try {
      const { topicId, status } = req.query;
      let ideas;
      if (topicId) {
        ideas = await storage.getContentIdeasByTopic(topicId as string);
      } else if (status) {
        ideas = await storage.getContentIdeasByStatus(status as string);
      } else {
        ideas = await storage.getAllContentIdeas();
      }
      res.json(ideas);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  app.get("/api/content-ideas/:id", async (req, res) => {
    try {
      const idea = await storage.getContentIdea(req.params.id);
      if (!idea) {
        return res.status(404).json({ message: "Content idea not found" });
      }
      res.json(idea);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  app.post("/api/content-ideas", async (req, res) => {
    try {
      const parsed = insertContentIdeaSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: fromZodError(parsed.error).message });
      }
      const idea = await storage.createContentIdea(parsed.data);
      res.status(201).json(idea);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  app.patch("/api/content-ideas/:id", async (req, res) => {
    try {
      const updated = await storage.updateContentIdea(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ message: "Content idea not found" });
      }
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  app.delete("/api/content-ideas/:id", async (req, res) => {
    try {
      await storage.deleteContentIdea(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // AI Generate Content Ideas from Topic
  app.post("/api/content-topics/:id/generate-ideas", async (req, res) => {
    try {
      const topic = await storage.getContentTopic(req.params.id);
      if (!topic) {
        return res.status(404).json({ message: "Topic not found" });
      }
      
      // Get voice profile for authentic content
      const voicePatterns = await storage.getAllVoiceProfiles();
      const voiceContext = voicePatterns.length > 0 
        ? `Voice style notes: ${voicePatterns.slice(0, 5).map(p => p.value).join('; ')}`
        : '';
      
      const openaiClient = getOpenAI();
      const response = await openaiClient.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a content strategist for a real estate professional. Generate content ideas based on topics that have come up in client conversations. The content should educate clients and establish expertise.
            
${voiceContext}

For each content type, provide a specific, actionable idea with a compelling title.`
          },
          {
            role: "user",
            content: `Topic: "${topic.title}"
Description: ${topic.description || 'N/A'}
Times mentioned in conversations: ${topic.mentionCount}
Sample quotes from clients: ${topic.sampleQuotes?.slice(0, 3).join(' | ') || 'None recorded'}

Generate content ideas for:
1. Blog post (educational, 800-1200 words)
2. Short-form video (60 seconds, TikTok/Instagram Reels)
3. Long-form video (5-10 min YouTube)
4. Email newsletter segment
5. FAQ entry

Respond in JSON:
{
  "ideas": [
    {"type": "blog", "title": "...", "description": "..."},
    {"type": "video_short", "title": "...", "description": "..."},
    {"type": "video_long", "title": "...", "description": "..."},
    {"type": "email_newsletter", "title": "...", "description": "..."},
    {"type": "faq", "title": "...", "description": "..."}
  ]
}`
          }
        ],
        response_format: { type: "json_object" },
      });
      
      const content = response.choices[0]?.message?.content || "{}";
      const parsed = JSON.parse(content);
      
      // Save ideas to database
      const createdIdeas = [];
      for (const idea of parsed.ideas || []) {
        const created = await storage.createContentIdea({
          topicId: topic.id,
          title: idea.title,
          description: idea.description,
          contentType: idea.type,
          aiGenerated: true,
          priority: topic.mentionCount || 1,
        });
        createdIdeas.push(created);
      }
      
      // Update topic with AI suggestions
      await storage.updateContentTopic(topic.id, {
        aiSuggestions: {
          blogPostIdeas: parsed.ideas?.filter((i: any) => i.type === 'blog').map((i: any) => i.title),
          videoTopics: parsed.ideas?.filter((i: any) => i.type.includes('video')).map((i: any) => i.title),
          faqQuestions: parsed.ideas?.filter((i: any) => i.type === 'faq').map((i: any) => i.title),
        }
      });
      
      res.json({ ideas: createdIdeas });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // AI Generate Draft Content
  app.post("/api/content-ideas/:id/generate-draft", async (req, res) => {
    try {
      const idea = await storage.getContentIdea(req.params.id);
      if (!idea) {
        return res.status(404).json({ message: "Content idea not found" });
      }
      
      // Get topic for context
      const topic = idea.topicId ? await storage.getContentTopic(idea.topicId) : null;
      
      // Get voice profile
      const voicePatterns = await storage.getAllVoiceProfiles();
      const voiceContext = voicePatterns.length > 0 
        ? voicePatterns.slice(0, 10).map(p => `${p.category}: "${p.value}"`).join('\n')
        : '';
      
      const contentTypePrompts: Record<string, string> = {
        blog: "Write a blog post (800-1200 words) that educates readers and establishes expertise. Use clear headings, practical examples, and actionable advice.",
        video_short: "Write a script for a 60-second video. Include hook (first 3 seconds), main point, and call to action. Keep it punchy and engaging.",
        video_long: "Write a detailed script for a 5-10 minute video. Include intro hook, main sections with talking points, and strong conclusion with CTA.",
        email_newsletter: "Write an email newsletter section (300-500 words). Conversational tone, practical tips, and gentle call to action.",
        podcast: "Write talking points and an outline for a 15-20 minute podcast episode. Include intro, 3-4 main discussion points, and outro.",
        faq: "Write a comprehensive FAQ answer (150-300 words). Be clear, helpful, and thorough.",
        social: "Write 3-5 social media posts for this topic. Include hashtag suggestions.",
      };
      
      const openaiClient = getOpenAI();
      const response = await openaiClient.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a content writer for a real estate professional. Write in their authentic voice based on these patterns:

${voiceContext}

Keep the content professional but warm and approachable. Focus on educating and helping, not selling.`
          },
          {
            role: "user",
            content: `Create content for:
Title: "${idea.title}"
Type: ${idea.contentType}
Description: ${idea.description || 'N/A'}
${topic ? `Related Topic: "${topic.title}" (mentioned ${topic.mentionCount} times)` : ''}
${topic?.sampleQuotes?.length ? `Client quotes about this: ${topic.sampleQuotes.slice(0, 3).join(' | ')}` : ''}

${contentTypePrompts[idea.contentType] || 'Write appropriate content for this format.'}`
          }
        ],
      });
      
      const draft = response.choices[0]?.message?.content || "";
      
      // Update idea with draft
      const updated = await storage.updateContentIdea(idea.id, {
        draft,
        status: 'drafted',
      });
      
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Content Calendar
  app.get("/api/content-calendar", async (req, res) => {
    try {
      const { start, end } = req.query;
      let items;
      if (start && end) {
        items = await storage.getContentCalendarByDateRange(
          new Date(start as string),
          new Date(end as string)
        );
      } else {
        items = await storage.getAllContentCalendarItems();
      }
      res.json(items);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  app.get("/api/content-calendar/:id", async (req, res) => {
    try {
      const item = await storage.getContentCalendarItem(req.params.id);
      if (!item) {
        return res.status(404).json({ message: "Calendar item not found" });
      }
      res.json(item);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  app.post("/api/content-calendar", async (req, res) => {
    try {
      const parsed = insertContentCalendarSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: fromZodError(parsed.error).message });
      }
      const item = await storage.createContentCalendarItem(parsed.data);
      res.status(201).json(item);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  app.patch("/api/content-calendar/:id", async (req, res) => {
    try {
      const updated = await storage.updateContentCalendarItem(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ message: "Calendar item not found" });
      }
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  app.delete("/api/content-calendar/:id", async (req, res) => {
    try {
      await storage.deleteContentCalendarItem(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Schedule content idea to calendar
  app.post("/api/content-ideas/:id/schedule", async (req, res) => {
    try {
      const idea = await storage.getContentIdea(req.params.id);
      if (!idea) {
        return res.status(404).json({ message: "Content idea not found" });
      }
      
      const { scheduledDate, channel } = req.body;
      
      const calendarItem = await storage.createContentCalendarItem({
        contentIdeaId: idea.id,
        title: idea.title,
        contentType: idea.contentType,
        channel,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
        status: 'planned',
      });
      
      res.status(201).json(calendarItem);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Listening Analysis - NVC + Question-Based Selling
  app.get("/api/listening-analysis", async (req, res) => {
    try {
      const analyses = await storage.getAllListeningAnalysis();
      res.json(analyses);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  app.get("/api/listening-analysis/interaction/:interactionId", async (req, res) => {
    try {
      const analysis = await storage.getListeningAnalysisByInteraction(req.params.interactionId);
      if (!analysis) {
        return res.status(404).json({ message: "No listening analysis found for this interaction" });
      }
      res.json(analysis);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  app.post("/api/listening-analysis/analyze", async (req, res) => {
    try {
      const { analyzeAllConversationsForListening } = await import("./listening-analyzer");
      const result = await analyzeAllConversationsForListening();
      res.json({ 
        message: `Analyzed ${result.analyzed} conversations, generated ${result.insights} coaching insights`,
        ...result 
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  app.post("/api/listening-analysis/analyze-single/:interactionId", async (req, res) => {
    try {
      const interaction = await storage.getInteraction(req.params.interactionId);
      if (!interaction) {
        return res.status(404).json({ message: "Interaction not found" });
      }
      if (!interaction.transcript) {
        return res.status(400).json({ message: "Interaction has no transcript to analyze" });
      }
      
      const { analyzeListening } = await import("./listening-analyzer");
      const result = await analyzeListening(interaction.id, interaction.transcript);
      
      if (!result) {
        return res.status(400).json({ message: "Could not analyze this conversation" });
      }
      
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Coaching Insights
  app.get("/api/coaching-insights", async (req, res) => {
    try {
      const status = req.query.status as string | undefined;
      const insights = status === 'active' 
        ? await storage.getActiveCoachingInsights()
        : await storage.getAllCoachingInsights();
      res.json(insights);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  app.get("/api/coaching-insights/:id", async (req, res) => {
    try {
      const insight = await storage.getCoachingInsight(req.params.id);
      if (!insight) {
        return res.status(404).json({ message: "Coaching insight not found" });
      }
      
      await storage.updateCoachingInsight(insight.id, {
        viewCount: (insight.viewCount || 0) + 1
      });
      
      res.json(insight);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  app.patch("/api/coaching-insights/:id", async (req, res) => {
    try {
      const updated = await storage.updateCoachingInsight(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ message: "Coaching insight not found" });
      }
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  app.post("/api/coaching-insights/:id/feedback", async (req, res) => {
    try {
      const { feedback } = req.body;
      if (!['accurate', 'not_right', 'tell_me_more'].includes(feedback)) {
        return res.status(400).json({ message: "Invalid feedback. Use 'accurate', 'not_right', or 'tell_me_more'" });
      }
      
      const updated = await storage.updateCoachingInsight(req.params.id, { userFeedback: feedback });
      if (!updated) {
        return res.status(404).json({ message: "Coaching insight not found" });
      }
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  app.delete("/api/coaching-insights/:id", async (req, res) => {
    try {
      await storage.deleteCoachingInsight(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Listening Patterns
  app.get("/api/listening-patterns", async (req, res) => {
    try {
      const patterns = await storage.getAllListeningPatterns();
      res.json(patterns);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Get aggregate listening stats across all analyzed conversations
  app.get("/api/listening-analysis/stats", async (req, res) => {
    try {
      const analyses = await storage.getAllListeningAnalysis();
      
      if (analyses.length === 0) {
        return res.json({
          totalAnalyzed: 0,
          message: "No conversations have been analyzed yet"
        });
      }
      
      const stats = {
        totalAnalyzed: analyses.length,
        avgObservationRatio: analyses.reduce((sum, a) => 
          sum + ((a.observationCount || 0) / ((a.observationCount || 0) + (a.interpretationCount || 0) + 1)), 0) / analyses.length,
        avgFeelingAcknowledgments: analyses.reduce((sum, a) => sum + (a.feelingAcknowledgments || 0), 0) / analyses.length,
        avgNeedClarifications: analyses.reduce((sum, a) => sum + (a.needClarifications || 0), 0) / analyses.length,
        avgAssumedNeeds: analyses.reduce((sum, a) => sum + (a.assumedNeeds || 0), 0) / analyses.length,
        avgRequestConfirmations: analyses.reduce((sum, a) => sum + (a.requestConfirmations || 0), 0) / analyses.length,
        questionBreakdown: {
          exploratory: analyses.reduce((sum, a) => sum + (a.exploratoryQuestions || 0), 0) / analyses.length,
          clarifying: analyses.reduce((sum, a) => sum + (a.clarifyingQuestions || 0), 0) / analyses.length,
          feelingBased: analyses.reduce((sum, a) => sum + (a.feelingQuestions || 0), 0) / analyses.length,
          needBased: analyses.reduce((sum, a) => sum + (a.needQuestions || 0), 0) / analyses.length,
          solutionLeading: analyses.reduce((sum, a) => sum + (a.solutionLeadingQuestions || 0), 0) / analyses.length,
          closed: analyses.reduce((sum, a) => sum + (a.closedQuestions || 0), 0) / analyses.length,
        },
        avgDepthScore: analyses.reduce((sum, a) => sum + (a.conversationDepthScore || 0), 0) / analyses.length,
        avgTrustScore: analyses.reduce((sum, a) => sum + (a.trustBuildingScore || 0), 0) / analyses.length,
      };
      
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Fathom.video sync routes
  const { runFathomSync, getFathomSyncStatus } = await import("./fathom-sync");
  
  app.get("/api/fathom/status", async (req, res) => {
    try {
      const status = getFathomSyncStatus();
      res.json(status);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  app.post("/api/fathom/sync", async (req, res) => {
    try {
      const result = await runFathomSync();
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Dashboard Widgets
  app.get("/api/dashboard-widgets", async (req, res) => {
    try {
      const widgets = await storage.getAllDashboardWidgets();
      res.json(widgets);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/dashboard-widgets", async (req, res) => {
    try {
      const result = insertDashboardWidgetSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).message });
      }
      const widget = await storage.createDashboardWidget(result.data);
      res.status(201).json(widget);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/dashboard-widgets/:id", async (req, res) => {
    try {
      const widget = await storage.updateDashboardWidget(req.params.id, req.body);
      if (!widget) {
        return res.status(404).json({ message: "Widget not found" });
      }
      res.json(widget);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/dashboard-widgets/:id", async (req, res) => {
    try {
      await storage.deleteDashboardWidget(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/dashboard-widgets/positions", async (req, res) => {
    try {
      const { widgets } = req.body as { widgets: { id: string; position: number }[] };
      if (!Array.isArray(widgets)) {
        return res.status(400).json({ message: "widgets array required" });
      }
      await storage.updateDashboardWidgetPositions(widgets);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Initialize default dashboard widgets if none exist
  app.post("/api/dashboard-widgets/initialize", async (req, res) => {
    try {
      const existing = await storage.getAllDashboardWidgets();
      if (existing.length > 0) {
        return res.json({ message: "Widgets already exist", widgets: existing });
      }
      
      const defaultWidgets = [
        { widgetType: 'gci_ytd', title: 'GCI Year-to-Date', position: 0 },
        { widgetType: 'closed_units', title: 'Closed Units', position: 1 },
        { widgetType: 'ford_tracker', title: 'FORD Conversations', position: 2 },
        { widgetType: 'pipeline_value', title: 'Pipeline Value', position: 3 },
        { widgetType: 'ai_status', title: 'AI Status', position: 4 },
        { widgetType: 'todoist_tasks', title: 'Today\'s Tasks', position: 5 },
      ];
      
      const created = [];
      for (const w of defaultWidgets) {
        const widget = await storage.createDashboardWidget(w);
        created.push(widget);
      }
      
      res.status(201).json({ message: "Default widgets created", widgets: created });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Life Event Alerts
  app.get("/api/life-event-alerts", async (req, res) => {
    try {
      const alerts = await storage.getAllLifeEventAlerts();
      res.json(alerts);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/life-event-alerts/:id", async (req, res) => {
    try {
      const alert = await storage.getLifeEventAlert(req.params.id);
      if (!alert) {
        return res.status(404).json({ message: "Alert not found" });
      }
      res.json(alert);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/people/:personId/life-event-alerts", async (req, res) => {
    try {
      const alerts = await storage.getLifeEventAlertsByPerson(req.params.personId);
      res.json(alerts);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/life-event-alerts", async (req, res) => {
    try {
      const alert = await storage.createLifeEventAlert(req.body);
      
      // Emit life event detected event
      if (alert.personId) {
        eventBus.emitLifeEventDetected(alert.personId, alert.id, alert.eventType, alert.eventCategory);
      }
      
      res.status(201).json(alert);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/life-event-alerts/:id", async (req, res) => {
    try {
      const alert = await storage.updateLifeEventAlert(req.params.id, req.body);
      if (!alert) {
        return res.status(404).json({ message: "Alert not found" });
      }
      res.json(alert);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/life-event-alerts/:id", async (req, res) => {
    try {
      await storage.deleteLifeEventAlert(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ============================================
  // Event Bus & Orchestration Layer Routes
  // ============================================

  // System Events - Event Log
  app.get("/api/events", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const events = await storage.getAllSystemEvents(limit);
      res.json(events);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/events/stats", async (req, res) => {
    try {
      const stats = await eventBus.getStats();
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/events/unprocessed", async (req, res) => {
    try {
      const events = await storage.getUnprocessedEvents();
      res.json(events);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/events/category/:category", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const events = await storage.getSystemEventsByCategory(req.params.category, limit);
      res.json(events);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/events/type/:type", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const events = await storage.getSystemEventsByType(req.params.type, limit);
      res.json(events);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/events/:id", async (req, res) => {
    try {
      const event = await storage.getSystemEvent(req.params.id);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      res.json(event);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/people/:personId/events", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const events = await storage.getSystemEventsByPerson(req.params.personId, limit);
      res.json(events);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Agent Actions - Approval Workflow
  app.get("/api/agent-actions", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const actions = await storage.getAllAgentActions(limit);
      res.json(actions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/agent-actions/pending", async (req, res) => {
    try {
      const actions = await storage.getPendingApprovals();
      res.json(actions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/agent-actions/status/:status", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const actions = await storage.getAgentActionsByStatus(req.params.status, limit);
      res.json(actions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/agent-actions/agent/:agentName", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const actions = await storage.getAgentActionsByAgent(req.params.agentName, limit);
      res.json(actions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/agent-actions/:id", async (req, res) => {
    try {
      const action = await storage.getAgentAction(req.params.id);
      if (!action) {
        return res.status(404).json({ message: "Action not found" });
      }
      res.json(action);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/agent-actions/:id/approve", async (req, res) => {
    try {
      const action = await storage.approveAgentAction(req.params.id, 'user');
      if (!action) {
        return res.status(404).json({ message: "Action not found" });
      }
      res.json(action);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/agent-actions/:id/reject", async (req, res) => {
    try {
      const action = await storage.rejectAgentAction(req.params.id);
      if (!action) {
        return res.status(404).json({ message: "Action not found" });
      }
      res.json(action);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/agent-actions/:id/execute", async (req, res) => {
    try {
      const { targetEntityId } = req.body;
      const action = await storage.markAgentActionExecuted(req.params.id, targetEntityId);
      if (!action) {
        return res.status(404).json({ message: "Action not found" });
      }
      res.json(action);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Leads - Top of funnel management
  app.get("/api/leads", async (req, res) => {
    try {
      const { status, source } = req.query;
      let leadsList;
      if (status) {
        leadsList = await storage.getLeadsByStatus(status as string);
      } else if (source) {
        leadsList = await storage.getLeadsBySource(source as string);
      } else {
        leadsList = await storage.getAllLeads();
      }
      res.json(leadsList);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/leads/new", async (req, res) => {
    try {
      const newLeads = await storage.getNewLeads();
      res.json(newLeads);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/leads/:id", async (req, res) => {
    try {
      const lead = await storage.getLead(req.params.id);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }
      res.json(lead);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/leads", async (req, res) => {
    try {
      const lead = await storage.createLead(req.body);
      await eventBus.emitLeadCreated(lead.id, lead.source, {
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        interestedIn: lead.interestedIn,
        timeline: lead.timeline,
        budget: lead.budget,
      });
      res.status(201).json(lead);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/leads/:id", async (req, res) => {
    try {
      const lead = await storage.updateLead(req.params.id, req.body);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }
      res.json(lead);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/leads/:id", async (req, res) => {
    try {
      await storage.deleteLead(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/leads/:id/convert", async (req, res) => {
    try {
      const result = await storage.convertLeadToPerson(req.params.id);
      if (!result) {
        return res.status(404).json({ message: "Lead not found" });
      }
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Agent Subscriptions
  app.get("/api/agent-subscriptions", async (req, res) => {
    try {
      const subscriptions = await storage.getAllAgentSubscriptions();
      res.json(subscriptions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/agent-subscriptions", async (req, res) => {
    try {
      const subscription = await storage.createAgentSubscription(req.body);
      res.status(201).json(subscription);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/agent-subscriptions/:id", async (req, res) => {
    try {
      await storage.deleteAgentSubscription(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Observer Suggestions API - AI Chief of Staff proactive suggestions
  app.get("/api/observer/suggestions", async (req, res) => {
    try {
      const suggestions = await storage.getPendingObserverSuggestions();
      res.json(suggestions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/observer/suggestions/all", async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const suggestions = await storage.getAllObserverSuggestions(limit);
      res.json(suggestions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/observer/suggestions/:id", async (req, res) => {
    try {
      const suggestion = await storage.getObserverSuggestion(req.params.id);
      if (!suggestion) {
        return res.status(404).json({ message: "Suggestion not found" });
      }
      res.json(suggestion);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/observer/suggestions/:id/accept", async (req, res) => {
    try {
      const suggestion = await storage.acceptObserverSuggestion(req.params.id);
      if (!suggestion) {
        return res.status(404).json({ message: "Suggestion not found" });
      }
      res.json(suggestion);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/observer/suggestions/:id/snooze", async (req, res) => {
    try {
      const { minutes = 60 } = req.body;
      const until = new Date(Date.now() + minutes * 60 * 1000);
      const suggestion = await storage.snoozeObserverSuggestion(req.params.id, until);
      if (!suggestion) {
        return res.status(404).json({ message: "Suggestion not found" });
      }
      res.json(suggestion);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/observer/suggestions/:id/dismiss", async (req, res) => {
    try {
      const { feedbackNote } = req.body;
      const suggestion = await storage.dismissObserverSuggestion(req.params.id, feedbackNote);
      if (!suggestion) {
        return res.status(404).json({ message: "Suggestion not found" });
      }
      res.json(suggestion);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Observer Patterns API - Learned behavior patterns
  app.get("/api/observer/patterns", async (req, res) => {
    try {
      const patterns = await storage.getEnabledObserverPatterns();
      res.json(patterns);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/observer/patterns/:id/feedback", async (req, res) => {
    try {
      const { delta } = req.body;
      const pattern = await storage.updatePatternFeedback(req.params.id, delta || 1);
      if (!pattern) {
        return res.status(404).json({ message: "Pattern not found" });
      }
      res.json(pattern);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/observer/patterns/by-key/:patternId/feedback", async (req, res) => {
    try {
      const { delta } = req.body;
      const patternId = req.params.patternId;
      const patterns = await storage.getEnabledObserverPatterns();
      const pattern = patterns.find(p => {
        const triggerConditions = p.triggerConditions as any;
        return triggerConditions?.patternId === patternId;
      });
      if (!pattern) {
        return res.status(404).json({ message: "Pattern not found" });
      }
      const updated = await storage.updatePatternFeedback(pattern.id, delta || 1);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Trigger context-aware suggestions (for testing/manual triggers)
  app.post("/api/observer/trigger", async (req, res) => {
    try {
      const { route, entityType, entityId } = req.body;
      const { triggerContextSuggestions } = await import("./workflow-coach-agent");
      await triggerContextSuggestions(route || '/', entityType, entityId);
      res.json({ success: true, message: "Context suggestions triggered" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ============================================================
  // Dormant Lead Revival API - Find and revive old opportunities
  // ============================================================
  
  // Get all dormant opportunities (sorted by score)
  app.get("/api/dormant-opportunities", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const opportunities = await storage.getAllDormantOpportunities(limit);
      res.json(opportunities);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Get pending opportunities only (review queue)
  app.get("/api/dormant-opportunities/pending", async (req, res) => {
    try {
      const opportunities = await storage.getPendingDormantOpportunities();
      
      // Enrich with person data
      const enriched = await Promise.all(opportunities.map(async (opp) => {
        const person = opp.personId ? await storage.getPerson(opp.personId) : null;
        return { ...opp, person };
      }));
      
      res.json(enriched);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Get single opportunity
  app.get("/api/dormant-opportunities/:id", async (req, res) => {
    try {
      const opportunity = await storage.getDormantOpportunity(req.params.id);
      if (!opportunity) {
        return res.status(404).json({ message: "Opportunity not found" });
      }
      
      const person = opportunity.personId ? await storage.getPerson(opportunity.personId) : null;
      res.json({ ...opportunity, person });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Approve opportunity (ready for campaign)
  app.post("/api/dormant-opportunities/:id/approve", async (req, res) => {
    try {
      const opportunity = await storage.approveDormantOpportunity(req.params.id);
      if (!opportunity) {
        return res.status(404).json({ message: "Opportunity not found" });
      }
      res.json(opportunity);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Dismiss opportunity
  app.post("/api/dormant-opportunities/:id/dismiss", async (req, res) => {
    try {
      const { reason } = req.body;
      const opportunity = await storage.dismissDormantOpportunity(req.params.id, reason);
      if (!opportunity) {
        return res.status(404).json({ message: "Opportunity not found" });
      }
      res.json(opportunity);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Trigger Gmail scan for dormant leads
  app.post("/api/dormant-opportunities/scan", async (req, res) => {
    try {
      const { minDaysSinceContact = 180, maxResults = 50, scanDays = 1095 } = req.body;
      
      const { scanGmailForDormantLeads } = await import("./dormant-lead-scanner");
      const result = await scanGmailForDormantLeads({
        minDaysSinceContact,
        maxResults,
        scanDays,
      });
      
      res.json({
        success: true,
        message: `Scan complete: found ${result.found}, created ${result.created}, skipped ${result.skipped}`,
        ...result,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Scan contacts (without Gmail) for dormant leads
  app.post("/api/dormant-opportunities/scan-contacts", async (req, res) => {
    try {
      const { minDaysSinceContact = 180, maxResults = 50 } = req.body;
      
      const { scanContactsForDormantLeads } = await import("./dormant-lead-scanner");
      const result = await scanContactsForDormantLeads({
        minDaysSinceContact,
        maxResults,
      });
      
      res.json({
        success: true,
        message: `Scan complete: found ${result.found}, created ${result.created}, skipped ${result.skipped}`,
        ...result,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Generate revival campaign for approved opportunity
  app.post("/api/dormant-opportunities/:id/generate-campaign", async (req, res) => {
    try {
      const { generateRevivalCampaign } = await import("./dormant-lead-scanner");
      const result = await generateRevivalCampaign(req.params.id);
      
      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }
      
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Delete opportunity
  app.delete("/api/dormant-opportunities/:id", async (req, res) => {
    try {
      await storage.deleteDormantOpportunity(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ============================================================
  // Insight Inbox API - Content Capture & Daily Digest
  // Pattern: AI proposes → Verifier checks → Execute or Review
  // ============================================================
  
  // Get all saved content
  app.get("/api/content", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const content = await storage.getAllSavedContent(limit);
      res.json(content);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Get unread content only
  app.get("/api/content/unread", async (req, res) => {
    try {
      const content = await storage.getUnreadSavedContent();
      res.json(content);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Get single content item
  app.get("/api/content/:id", async (req, res) => {
    try {
      const content = await storage.getSavedContent(req.params.id);
      if (!content) {
        return res.status(404).json({ message: "Content not found" });
      }
      res.json(content);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Capture new content (URL submission)
  app.post("/api/content/capture", async (req, res) => {
    try {
      const { url, source = 'manual', notes } = req.body;
      
      if (!url) {
        return res.status(400).json({ message: "URL is required" });
      }
      
      // Check if URL already exists
      const existing = await storage.getSavedContentByUrl(url);
      if (existing) {
        return res.status(409).json({ 
          message: "Content already saved",
          content: existing
        });
      }
      
      // Create with minimal data first
      const content = await storage.createSavedContent({
        url,
        source,
        notes,
        status: 'unread'
      });
      
      // Queue for AI processing (async - don't wait)
      processContentAsync(content.id).catch(err => {
        logger.error('Content processing failed', { contentId: content.id, error: err.message });
      });
      
      res.status(201).json(content);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Update content
  app.put("/api/content/:id", async (req, res) => {
    try {
      const content = await storage.updateSavedContent(req.params.id, req.body);
      if (!content) {
        return res.status(404).json({ message: "Content not found" });
      }
      res.json(content);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Mark content as read
  app.post("/api/content/:id/read", async (req, res) => {
    try {
      const content = await storage.markContentRead(req.params.id);
      if (!content) {
        return res.status(404).json({ message: "Content not found" });
      }
      res.json(content);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Archive content
  app.post("/api/content/:id/archive", async (req, res) => {
    try {
      const content = await storage.archiveContent(req.params.id);
      if (!content) {
        return res.status(404).json({ message: "Content not found" });
      }
      res.json(content);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Delete content
  app.delete("/api/content/:id", async (req, res) => {
    try {
      await storage.deleteSavedContent(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Process content with AI (manual trigger)
  app.post("/api/content/:id/process", async (req, res) => {
    try {
      const content = await storage.getSavedContent(req.params.id);
      if (!content) {
        return res.status(404).json({ message: "Content not found" });
      }
      
      const processed = await processContentWithAI(content);
      res.json(processed);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Daily Digest API
  app.get("/api/digests", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 30;
      const digests = await storage.getAllDailyDigests(limit);
      res.json(digests);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  app.get("/api/digests/today", async (req, res) => {
    try {
      const digest = await storage.getTodaysDigest();
      if (!digest) {
        return res.status(404).json({ message: "No digest for today yet" });
      }
      res.json(digest);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  app.get("/api/digests/:id", async (req, res) => {
    try {
      const digest = await storage.getDailyDigest(req.params.id);
      if (!digest) {
        return res.status(404).json({ message: "Digest not found" });
      }
      res.json(digest);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Generate today's digest manually
  app.post("/api/digests/generate", async (req, res) => {
    try {
      const digest = await generateDailyDigest();
      res.json(digest);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // AI Actions audit trail
  app.get("/api/ai-actions", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const actions = await storage.getAllAiActions(limit);
      res.json(actions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  app.get("/api/ai-actions/:type", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const actions = await storage.getAiActionsByType(req.params.type, limit);
      res.json(actions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // User Core Profile API - Guiding Principles & Personalization
  app.get("/api/profile/:betaUserId", async (req, res) => {
    try {
      const profile = await storage.getUserCoreProfile(req.params.betaUserId);
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }
      res.json(profile);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  app.post("/api/profile", async (req, res) => {
    try {
      const { insertUserCoreProfileSchema } = await import("@shared/schema");
      const parsed = insertUserCoreProfileSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: fromZodError(parsed.error).message });
      }
      const profile = await storage.upsertUserCoreProfile(parsed.data);
      res.status(201).json(profile);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  app.patch("/api/profile/:betaUserId", async (req, res) => {
    try {
      const { insertUserCoreProfileSchema } = await import("@shared/schema");
      
      // Validate with partial schema
      const updateSchema = insertUserCoreProfileSchema.partial().omit({ betaUserId: true });
      const parsed = updateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: fromZodError(parsed.error).message });
      }
      
      const profile = await storage.updateUserCoreProfile(req.params.betaUserId, parsed.data);
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }
      res.json(profile);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Get profile for current session (simplified for single-user mode)
  app.get("/api/profile", async (req, res) => {
    try {
      // For single-user mode, get the first/only profile
      const { userCoreProfile } = await import("@shared/schema");
      const [profile] = await db.select().from(userCoreProfile).limit(1);
      if (!profile) {
        // Return empty profile structure for intake wizard
        return res.json({ 
          intakeStep: 0, 
          intakeCompletedAt: null,
          mtp: null,
          missionStatement: null,
          coreValues: [],
          philosophy: null,
          decisionFramework: null,
          yearsExperience: null,
          teamStructure: null,
          annualGoalTransactions: null,
          annualGoalGci: null,
          specializations: [],
          focusAreas: [],
          familySummary: null,
          hobbies: [],
          communityInvolvement: null
        });
      }
      res.json(profile);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Update profile (single-user mode)
  app.put("/api/profile", async (req, res) => {
    try {
      const { userCoreProfile, betaUsers, insertUserCoreProfileSchema } = await import("@shared/schema");
      const { eq: eqOp } = await import("drizzle-orm");
      
      // Validate request body with partial schema (all fields optional for updates)
      const updateSchema = insertUserCoreProfileSchema.partial().omit({ betaUserId: true });
      const parsed = updateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: fromZodError(parsed.error).message });
      }
      
      // Get or create beta user for single-user mode
      let [betaUser] = await db.select().from(betaUsers).limit(1);
      if (!betaUser) {
        [betaUser] = await db.insert(betaUsers).values({
          name: "Default User",
          email: "user@flow-os.local"
        }).returning();
      }
      
      // Check if profile exists
      let [existing] = await db.select().from(userCoreProfile).limit(1);
      
      const profileData = {
        ...parsed.data,
        betaUserId: betaUser.id,
        updatedAt: new Date()
      };
      
      if (existing) {
        const [updated] = await db.update(userCoreProfile)
          .set(profileData)
          .where(eqOp(userCoreProfile.id, existing.id))
          .returning();
        res.json(updated);
      } else {
        const [created] = await db.insert(userCoreProfile)
          .values(profileData)
          .returning();
        res.status(201).json(created);
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // CRM Integrations API
  app.get("/api/crm/integrations", async (req, res) => {
    try {
      const { crmSyncService } = await import("./crm-sync");
      const integrations = await crmSyncService.getActiveIntegrations();
      res.json(integrations);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/crm/integrations/all", async (req, res) => {
    try {
      const { crmIntegrations } = await import("@shared/schema");
      const integrations = await db.select().from(crmIntegrations);
      res.json(integrations);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/crm/integrations", async (req, res) => {
    try {
      const { crmIntegrations, insertCrmIntegrationSchema } = await import("@shared/schema");
      const parsed = insertCrmIntegrationSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: fromZodError(parsed.error).message });
      }
      const [integration] = await db.insert(crmIntegrations).values(parsed.data).returning();
      res.status(201).json(integration);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/crm/integrations/:id", async (req, res) => {
    try {
      const { crmIntegrations } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      const [integration] = await db
        .update(crmIntegrations)
        .set({ ...req.body, updatedAt: new Date() })
        .where(eq(crmIntegrations.id, req.params.id))
        .returning();
      if (!integration) {
        return res.status(404).json({ message: "Integration not found" });
      }
      res.json(integration);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/crm/integrations/:id", async (req, res) => {
    try {
      const { crmIntegrations } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      await db.delete(crmIntegrations).where(eq(crmIntegrations.id, req.params.id));
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/crm/integrations/:id/test", async (req, res) => {
    try {
      const { crmSyncService } = await import("./crm-sync");
      const result = await crmSyncService.testConnection(req.params.id);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/crm/sync/process", async (req, res) => {
    try {
      const { crmSyncService } = await import("./crm-sync");
      const limit = parseInt(req.query.limit as string) || 10;
      const result = await crmSyncService.processQueue(limit);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/crm/sync/queue", async (req, res) => {
    try {
      const { crmSyncQueue } = await import("@shared/schema");
      const { desc } = await import("drizzle-orm");
      const items = await db
        .select()
        .from(crmSyncQueue)
        .orderBy(desc(crmSyncQueue.createdAt))
        .limit(50);
      res.json(items);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Capture Tool Integrations API
  app.get("/api/capture/integrations", async (req, res) => {
    try {
      const { captureIntegrations } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      const integrations = await db
        .select()
        .from(captureIntegrations)
        .where(eq(captureIntegrations.isActive, true));
      res.json(integrations);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/capture/integrations/all", async (req, res) => {
    try {
      const { captureIntegrations } = await import("@shared/schema");
      const integrations = await db.select().from(captureIntegrations);
      res.json(integrations);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/capture/integrations", async (req, res) => {
    try {
      const { captureIntegrations, insertCaptureIntegrationSchema } = await import("@shared/schema");
      const parsed = insertCaptureIntegrationSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: fromZodError(parsed.error).message });
      }
      const [integration] = await db.insert(captureIntegrations).values(parsed.data).returning();
      res.status(201).json(integration);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/capture/integrations/:id", async (req, res) => {
    try {
      const { captureIntegrations } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      const [integration] = await db
        .update(captureIntegrations)
        .set({ ...req.body, updatedAt: new Date() })
        .where(eq(captureIntegrations.id, req.params.id))
        .returning();
      if (!integration) {
        return res.status(404).json({ message: "Integration not found" });
      }
      res.json(integration);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Beta Users API
  app.get("/api/beta/users", async (req, res) => {
    try {
      const { betaUsers, betaIntake, userConnectors } = await import("@shared/schema");
      const { desc, eq } = await import("drizzle-orm");
      const users = await db.select().from(betaUsers).orderBy(desc(betaUsers.createdAt));
      
      const usersWithDetails = await Promise.all(users.map(async (user) => {
        const [intake] = await db.select().from(betaIntake).where(eq(betaIntake.betaUserId, user.id));
        const connectors = await db.select().from(userConnectors).where(eq(userConnectors.betaUserId, user.id));
        return { ...user, intake, connectors };
      }));
      
      res.json(usersWithDetails);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/beta/users/:id", async (req, res) => {
    try {
      const { betaUsers, betaIntake, userConnectors } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      const [user] = await db.select().from(betaUsers).where(eq(betaUsers.id, req.params.id));
      if (!user) {
        return res.status(404).json({ message: "Beta user not found" });
      }
      const [intake] = await db.select().from(betaIntake).where(eq(betaIntake.betaUserId, user.id));
      const connectors = await db.select().from(userConnectors).where(eq(userConnectors.betaUserId, user.id));
      res.json({ ...user, intake, connectors });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/beta/users", async (req, res) => {
    try {
      const { betaUsers, insertBetaUserSchema } = await import("@shared/schema");
      const parsed = insertBetaUserSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: fromZodError(parsed.error).message });
      }
      const [user] = await db.insert(betaUsers).values(parsed.data).returning();
      res.status(201).json(user);
    } catch (error: any) {
      if (error.code === '23505') {
        return res.status(400).json({ message: "A user with this email already exists" });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/beta/users/:id", async (req, res) => {
    try {
      const { betaUsers } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      const [user] = await db
        .update(betaUsers)
        .set({ ...req.body, updatedAt: new Date() })
        .where(eq(betaUsers.id, req.params.id))
        .returning();
      if (!user) {
        return res.status(404).json({ message: "Beta user not found" });
      }
      res.json(user);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Beta Intake API - Combined user + intake in single transaction
  app.post("/api/beta/intake", async (req, res) => {
    try {
      const { betaIntake, betaUsers, userConnectors, insertBetaUserSchema } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      
      const { user: userData, ...intakeData } = req.body;
      
      // If user data provided, create user and intake together in a transaction
      if (userData) {
        const userParsed = insertBetaUserSchema.safeParse(userData);
        if (!userParsed.success) {
          return res.status(400).json({ message: fromZodError(userParsed.error).message });
        }
        
        // Check if user already exists and has intake (outside transaction for early return)
        const [existingUser] = await db.select().from(betaUsers).where(eq(betaUsers.email, userData.email));
        if (existingUser) {
          const [existingIntake] = await db.select().from(betaIntake).where(eq(betaIntake.betaUserId, existingUser.id));
          if (existingIntake) {
            return res.status(400).json({ message: "This user has already completed the intake form" });
          }
        }
        
        // Use transaction for atomic operations
        const result = await db.transaction(async (tx) => {
          let userId: string;
          
          if (existingUser) {
            userId = existingUser.id;
          } else {
            const [newUser] = await tx.insert(betaUsers).values(userParsed.data).returning();
            userId = newUser.id;
          }
          
          // Create intake
          const [intake] = await tx.insert(betaIntake).values({
            betaUserId: userId,
            meetingTools: intakeData.meetingTools,
            callTools: intakeData.callTools,
            messagingTools: intakeData.messagingTools,
            emailTools: intakeData.emailTools,
            crmTools: intakeData.crmTools,
            otherTools: intakeData.otherTools,
            priorities: intakeData.priorities,
            painPoints: intakeData.painPoints,
          }).returning();
          
          // Auto-create connector entries based on intake
          const connectorInserts: any[] = [];
          
          const toolCategories = [
            { tools: intakeData.meetingTools, category: 'meeting' },
            { tools: intakeData.callTools, category: 'call' },
            { tools: intakeData.messagingTools, category: 'messaging' },
            { tools: intakeData.emailTools, category: 'email' },
          ];
          
          for (const { tools, category } of toolCategories) {
            if (tools && tools.length > 0) {
              for (const tool of tools) {
                connectorInserts.push({
                  betaUserId: userId,
                  provider: tool,
                  category: category,
                  status: 'pending',
                });
              }
            }
          }
          
          if (connectorInserts.length > 0) {
            await tx.insert(userConnectors).values(connectorInserts);
          }
          
          return { userId, intake };
        });
        
        res.status(201).json(result);
      } else {
        // Legacy path: just intake with existing user
        if (!intakeData.betaUserId) {
          return res.status(400).json({ message: "betaUserId is required" });
        }
        
        // Check for existing intake
        const [existingIntake] = await db.select().from(betaIntake).where(eq(betaIntake.betaUserId, intakeData.betaUserId));
        if (existingIntake) {
          return res.status(400).json({ message: "This user has already completed the intake form" });
        }
        
        // Use transaction for atomic operations
        const result = await db.transaction(async (tx) => {
          const [intake] = await tx.insert(betaIntake).values(intakeData).returning();
          
          // Auto-create connector entries
          const connectorInserts: any[] = [];
          const toolCategories = [
            { tools: intakeData.meetingTools, category: 'meeting' },
            { tools: intakeData.callTools, category: 'call' },
            { tools: intakeData.messagingTools, category: 'messaging' },
            { tools: intakeData.emailTools, category: 'email' },
          ];
          
          for (const { tools, category } of toolCategories) {
            if (tools && tools.length > 0) {
              for (const tool of tools) {
                connectorInserts.push({
                  betaUserId: intakeData.betaUserId,
                  provider: tool,
                  category: category,
                  status: 'pending',
                });
              }
            }
          }
          
          if (connectorInserts.length > 0) {
            await tx.insert(userConnectors).values(connectorInserts);
          }
          
          return intake;
        });
        
        res.status(201).json(result);
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // User Connectors API
  app.get("/api/beta/connectors/:betaUserId", async (req, res) => {
    try {
      const { userConnectors } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      const connectors = await db
        .select()
        .from(userConnectors)
        .where(eq(userConnectors.betaUserId, req.params.betaUserId));
      res.json(connectors);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/beta/connectors/:id", async (req, res) => {
    try {
      const { userConnectors } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      const [connector] = await db
        .update(userConnectors)
        .set({ ...req.body, updatedAt: new Date() })
        .where(eq(userConnectors.id, req.params.id))
        .returning();
      if (!connector) {
        return res.status(404).json({ message: "Connector not found" });
      }
      res.json(connector);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/beta/connectors", async (req, res) => {
    try {
      const { userConnectors, insertUserConnectorSchema } = await import("@shared/schema");
      const parsed = insertUserConnectorSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: fromZodError(parsed.error).message });
      }
      const [connector] = await db.insert(userConnectors).values(parsed.data).returning();
      res.status(201).json(connector);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Beta Feedback API
  app.post("/api/feedback", async (req, res) => {
    try {
      const { betaFeedback, insertBetaFeedbackSchema } = await import("@shared/schema");
      const parsed = insertBetaFeedbackSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: fromZodError(parsed.error).message });
      }
      const [feedback] = await db.insert(betaFeedback).values(parsed.data).returning();
      res.status(201).json(feedback);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/feedback", async (req, res) => {
    try {
      const { betaFeedback } = await import("@shared/schema");
      const { desc } = await import("drizzle-orm");
      const feedback = await db.select().from(betaFeedback).orderBy(desc(betaFeedback.createdAt));
      res.json(feedback);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Health Check API for monitoring
  app.get("/api/health", async (req, res) => {
    try {
      const { sql } = await import("drizzle-orm");
      await db.execute(sql`SELECT 1`);
      res.json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        database: "connected",
        version: process.env.npm_package_version || "1.0.0",
      });
    } catch (error: any) {
      res.status(503).json({
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        database: "disconnected",
        error: error.message,
      });
    }
  });

  // Webhook authentication helper
  const verifyWebhookSecret = async (req: any, provider: string): Promise<boolean> => {
    const authHeader = req.headers?.authorization;
    if (!authHeader) return false;
    
    const token = authHeader.replace('Bearer ', '');
    if (!token) return false;
    
    try {
      const { captureIntegrations } = await import("@shared/schema");
      const { eq, and } = await import("drizzle-orm");
      const [integration] = await db
        .select()
        .from(captureIntegrations)
        .where(and(
          eq(captureIntegrations.provider, provider),
          eq(captureIntegrations.isActive, true)
        ));
      
      const config = integration?.config as { webhookSecret?: string } | null;
      if (!config?.webhookSecret) return false;
      return token === config.webhookSecret;
    } catch {
      return false;
    }
  };

  // Webhook endpoints for capture tools (Granola, Plaud via Zapier)
  app.post("/api/webhooks/granola", async (req, res) => {
    try {
      const isAuthenticated = await verifyWebhookSecret(req, 'granola');
      if (!isAuthenticated && process.env.NODE_ENV === 'production') {
        return res.status(401).json({ message: 'Unauthorized: Missing or invalid webhook secret' });
      }
      
      const parsed = granolaWebhookSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: fromZodError(parsed.error).message });
      }
      
      const { title, notes, transcript, date, attendees, enhanced_notes } = parsed.data;
      
      const interaction = await storage.createInteraction({
        type: 'meeting',
        source: 'granola',
        title: title || 'Granola Meeting',
        summary: enhanced_notes || notes,
        transcript: transcript,
        occurredAt: date ? new Date(date) : new Date(),
        participants: attendees,
        externalId: req.body.id || `granola-${Date.now()}`,
      });
      
      eventBus.emit({
        eventType: 'interaction.created',
        eventCategory: 'communication',
        sourceEntity: 'interaction',
        sourceEntityId: interaction.id,
        payload: { source: 'granola', type: 'meeting' },
      });
      
      res.json({ success: true, interactionId: interaction.id });
    } catch (error: any) {
      console.error('Granola webhook error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/webhooks/plaud", async (req, res) => {
    try {
      const isAuthenticated = await verifyWebhookSecret(req, 'plaud');
      if (!isAuthenticated && process.env.NODE_ENV === 'production') {
        return res.status(401).json({ message: 'Unauthorized: Missing or invalid webhook secret' });
      }
      
      const parsed = plaudWebhookSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: fromZodError(parsed.error).message });
      }
      
      const { title, transcript, summary, duration, date, participants, recording_url } = parsed.data;
      
      const interaction = await storage.createInteraction({
        type: 'call',
        source: 'plaud',
        title: title || 'Plaud Recording',
        summary: summary,
        transcript: transcript,
        occurredAt: date ? new Date(date) : new Date(),
        duration: duration,
        participants: participants,
        externalLink: recording_url,
        externalId: req.body.id || `plaud-${Date.now()}`,
      });
      
      eventBus.emit({
        eventType: 'interaction.created',
        eventCategory: 'communication',
        sourceEntity: 'interaction',
        sourceEntityId: interaction.id,
        payload: { source: 'plaud', type: 'call' },
      });
      
      res.json({ success: true, interactionId: interaction.id });
    } catch (error: any) {
      console.error('Plaud webhook error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // Generic Zapier webhook for any capture tool
  app.post("/api/webhooks/capture", async (req, res) => {
    try {
      const source = req.body.source || 'zapier';
      const isAuthenticated = await verifyWebhookSecret(req, source);
      if (!isAuthenticated && process.env.NODE_ENV === 'production') {
        return res.status(401).json({ message: 'Unauthorized: Missing or invalid webhook secret' });
      }
      
      const parsed = captureWebhookSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: fromZodError(parsed.error).message });
      }
      
      const { type, title, content, transcript, date, duration, participants, external_id, external_url } = parsed.data;
      
      const interaction = await storage.createInteraction({
        type: type || 'note',
        source: source || 'zapier',
        title: title,
        summary: content,
        transcript: transcript,
        occurredAt: date ? new Date(date) : new Date(),
        duration: duration,
        participants: participants,
        externalLink: external_url,
        externalId: external_id || `capture-${Date.now()}`,
      });
      
      eventBus.emit({
        eventType: 'interaction.created',
        eventCategory: 'communication',
        sourceEntity: 'interaction',
        sourceEntityId: interaction.id,
        payload: { source: source || 'zapier', type: type || 'note' },
      });
      
      res.json({ success: true, interactionId: interaction.id });
    } catch (error: any) {
      console.error('Capture webhook error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // Maintenance API endpoints
  app.get("/api/maintenance/stats", async (_req, res) => {
    try {
      const { getEventStats } = await import("./maintenance");
      const stats = await getEventStats();
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/maintenance/cleanup", async (req, res) => {
    try {
      const { cleanupOldEvents } = await import("./maintenance");
      const retentionDays = req.body.retentionDays || 7;
      const result = await cleanupOldEvents(retentionDays);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  return httpServer;
}
