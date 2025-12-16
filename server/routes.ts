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
  insertAgentProfileSchema
} from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import multer from "multer";
import path from "path";
import fs from "fs";

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

  return httpServer;
}
