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
  insertNoteSchema 
} from "@shared/schema";
import { fromZodError } from "zod-validation-error";

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

  return httpServer;
}
