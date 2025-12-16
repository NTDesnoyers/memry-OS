import { 
  type User, type InsertUser,
  type Person, type InsertPerson,
  type Deal, type InsertDeal,
  type Task, type InsertTask,
  type Meeting, type InsertMeeting,
  type Call, type InsertCall,
  type WeeklyReview, type InsertWeeklyReview,
  type Note, type InsertNote,
  users, people, deals, tasks, meetings, calls, weeklyReviews, notes
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, isNull, or } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // People
  getAllPeople(): Promise<Person[]>;
  getPerson(id: string): Promise<Person | undefined>;
  createPerson(person: InsertPerson): Promise<Person>;
  updatePerson(id: string, person: Partial<InsertPerson>): Promise<Person | undefined>;
  deletePerson(id: string): Promise<void>;
  
  // Deals
  getAllDeals(): Promise<Deal[]>;
  getDeal(id: string): Promise<Deal | undefined>;
  createDeal(deal: InsertDeal): Promise<Deal>;
  updateDeal(id: string, deal: Partial<InsertDeal>): Promise<Deal | undefined>;
  deleteDeal(id: string): Promise<void>;
  
  // Tasks
  getAllTasks(): Promise<Task[]>;
  getTask(id: string): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: string, task: Partial<InsertTask>): Promise<Task | undefined>;
  deleteTask(id: string): Promise<void>;
  
  // Meetings
  getAllMeetings(): Promise<Meeting[]>;
  getMeeting(id: string): Promise<Meeting | undefined>;
  createMeeting(meeting: InsertMeeting): Promise<Meeting>;
  updateMeeting(id: string, meeting: Partial<InsertMeeting>): Promise<Meeting | undefined>;
  deleteMeeting(id: string): Promise<void>;
  
  // Calls
  getAllCalls(): Promise<Call[]>;
  getCall(id: string): Promise<Call | undefined>;
  createCall(call: InsertCall): Promise<Call>;
  updateCall(id: string, call: Partial<InsertCall>): Promise<Call | undefined>;
  deleteCall(id: string): Promise<void>;
  
  // Weekly Reviews
  getAllWeeklyReviews(): Promise<WeeklyReview[]>;
  getWeeklyReview(id: string): Promise<WeeklyReview | undefined>;
  createWeeklyReview(review: InsertWeeklyReview): Promise<WeeklyReview>;
  updateWeeklyReview(id: string, review: Partial<InsertWeeklyReview>): Promise<WeeklyReview | undefined>;
  deleteWeeklyReview(id: string): Promise<void>;
  
  // Notes
  getAllNotes(): Promise<Note[]>;
  getNote(id: string): Promise<Note | undefined>;
  createNote(note: InsertNote): Promise<Note>;
  updateNote(id: string, note: Partial<InsertNote>): Promise<Note | undefined>;
  deleteNote(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }
  
  // People
  async getAllPeople(): Promise<Person[]> {
    return await db.select().from(people).orderBy(desc(people.createdAt));
  }
  
  async getPerson(id: string): Promise<Person | undefined> {
    const [person] = await db.select().from(people).where(eq(people.id, id));
    return person || undefined;
  }
  
  async createPerson(insertPerson: InsertPerson): Promise<Person> {
    const [person] = await db
      .insert(people)
      .values({ ...insertPerson, updatedAt: new Date() })
      .returning();
    return person;
  }
  
  async updatePerson(id: string, person: Partial<InsertPerson>): Promise<Person | undefined> {
    const [updated] = await db
      .update(people)
      .set({ ...person, updatedAt: new Date() })
      .where(eq(people.id, id))
      .returning();
    return updated || undefined;
  }
  
  async deletePerson(id: string): Promise<void> {
    await db.delete(people).where(eq(people.id, id));
  }
  
  // Deals
  async getAllDeals(): Promise<Deal[]> {
    return await db.select().from(deals).orderBy(desc(deals.createdAt));
  }
  
  async getDeal(id: string): Promise<Deal | undefined> {
    const [deal] = await db.select().from(deals).where(eq(deals.id, id));
    return deal || undefined;
  }
  
  async createDeal(insertDeal: InsertDeal): Promise<Deal> {
    const [deal] = await db
      .insert(deals)
      .values({ ...insertDeal, updatedAt: new Date() })
      .returning();
    return deal;
  }
  
  async updateDeal(id: string, deal: Partial<InsertDeal>): Promise<Deal | undefined> {
    const [updated] = await db
      .update(deals)
      .set({ ...deal, updatedAt: new Date() })
      .where(eq(deals.id, id))
      .returning();
    return updated || undefined;
  }
  
  async deleteDeal(id: string): Promise<void> {
    await db.delete(deals).where(eq(deals.id, id));
  }
  
  // Tasks
  async getAllTasks(): Promise<Task[]> {
    return await db.select().from(tasks).orderBy(desc(tasks.createdAt));
  }
  
  async getTask(id: string): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task || undefined;
  }
  
  async createTask(insertTask: InsertTask): Promise<Task> {
    const [task] = await db
      .insert(tasks)
      .values({ ...insertTask, updatedAt: new Date() })
      .returning();
    return task;
  }
  
  async updateTask(id: string, task: Partial<InsertTask>): Promise<Task | undefined> {
    const [updated] = await db
      .update(tasks)
      .set({ ...task, updatedAt: new Date() })
      .where(eq(tasks.id, id))
      .returning();
    return updated || undefined;
  }
  
  async deleteTask(id: string): Promise<void> {
    await db.delete(tasks).where(eq(tasks.id, id));
  }
  
  // Meetings
  async getAllMeetings(): Promise<Meeting[]> {
    return await db.select().from(meetings).orderBy(desc(meetings.createdAt));
  }
  
  async getMeeting(id: string): Promise<Meeting | undefined> {
    const [meeting] = await db.select().from(meetings).where(eq(meetings.id, id));
    return meeting || undefined;
  }
  
  async createMeeting(insertMeeting: InsertMeeting): Promise<Meeting> {
    const [meeting] = await db
      .insert(meetings)
      .values({ ...insertMeeting, updatedAt: new Date() })
      .returning();
    return meeting;
  }
  
  async updateMeeting(id: string, meeting: Partial<InsertMeeting>): Promise<Meeting | undefined> {
    const [updated] = await db
      .update(meetings)
      .set({ ...meeting, updatedAt: new Date() })
      .where(eq(meetings.id, id))
      .returning();
    return updated || undefined;
  }
  
  async deleteMeeting(id: string): Promise<void> {
    await db.delete(meetings).where(eq(meetings.id, id));
  }
  
  // Calls
  async getAllCalls(): Promise<Call[]> {
    return await db.select().from(calls).orderBy(desc(calls.createdAt));
  }
  
  async getCall(id: string): Promise<Call | undefined> {
    const [call] = await db.select().from(calls).where(eq(calls.id, id));
    return call || undefined;
  }
  
  async createCall(insertCall: InsertCall): Promise<Call> {
    const [call] = await db
      .insert(calls)
      .values({ ...insertCall, updatedAt: new Date() })
      .returning();
    return call;
  }
  
  async updateCall(id: string, call: Partial<InsertCall>): Promise<Call | undefined> {
    const [updated] = await db
      .update(calls)
      .set({ ...call, updatedAt: new Date() })
      .where(eq(calls.id, id))
      .returning();
    return updated || undefined;
  }
  
  async deleteCall(id: string): Promise<void> {
    await db.delete(calls).where(eq(calls.id, id));
  }
  
  // Weekly Reviews
  async getAllWeeklyReviews(): Promise<WeeklyReview[]> {
    return await db.select().from(weeklyReviews).orderBy(desc(weeklyReviews.weekStartDate));
  }
  
  async getWeeklyReview(id: string): Promise<WeeklyReview | undefined> {
    const [review] = await db.select().from(weeklyReviews).where(eq(weeklyReviews.id, id));
    return review || undefined;
  }
  
  async createWeeklyReview(insertReview: InsertWeeklyReview): Promise<WeeklyReview> {
    const [review] = await db
      .insert(weeklyReviews)
      .values({ ...insertReview, updatedAt: new Date() })
      .returning();
    return review;
  }
  
  async updateWeeklyReview(id: string, review: Partial<InsertWeeklyReview>): Promise<WeeklyReview | undefined> {
    const [updated] = await db
      .update(weeklyReviews)
      .set({ ...review, updatedAt: new Date() })
      .where(eq(weeklyReviews.id, id))
      .returning();
    return updated || undefined;
  }
  
  async deleteWeeklyReview(id: string): Promise<void> {
    await db.delete(weeklyReviews).where(eq(weeklyReviews.id, id));
  }
  
  // Notes
  async getAllNotes(): Promise<Note[]> {
    return await db.select().from(notes).orderBy(desc(notes.createdAt));
  }
  
  async getNote(id: string): Promise<Note | undefined> {
    const [note] = await db.select().from(notes).where(eq(notes.id, id));
    return note || undefined;
  }
  
  async createNote(insertNote: InsertNote): Promise<Note> {
    const [note] = await db
      .insert(notes)
      .values({ ...insertNote, updatedAt: new Date() })
      .returning();
    return note;
  }
  
  async updateNote(id: string, note: Partial<InsertNote>): Promise<Note | undefined> {
    const [updated] = await db
      .update(notes)
      .set({ ...note, updatedAt: new Date() })
      .where(eq(notes.id, id))
      .returning();
    return updated || undefined;
  }
  
  async deleteNote(id: string): Promise<void> {
    await db.delete(notes).where(eq(notes.id, id));
  }
}

export const storage = new DatabaseStorage();
