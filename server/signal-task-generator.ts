import { storage, TenantContext } from "./storage";
import { FollowUpSignal, Person } from "@shared/schema";
import { openai } from "./ai/trackedOpenAI";
import { addDays } from "date-fns";

export async function generateTaskFromSignal(
  signal: FollowUpSignal,
  person: Person,
  ctx?: TenantContext
): Promise<void> {
  const firstName = person.name?.split(' ')[0] || 'contact';
  
  let taskTitle: string;
  
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Generate a short, action-oriented task title (5-8 words max).
Rules:
- Start with a verb (Follow up, Research, Send, Schedule, Check, Call, etc.)
- Be specific to the context
- Include the person's first name
- No punctuation at the end

Examples:
- "Follow up with John about property tour"
- "Research appraisal options for Sarah"
- "Send market report to Mike"
- "Schedule coffee meeting with Lisa"`
        },
        {
          role: "user",
          content: `Person: ${person.name}
Signal context: ${signal.reasoning}

Generate a task title:`
        }
      ],
      temperature: 0.7,
      max_tokens: 50
    });
    
    taskTitle = response.choices[0]?.message?.content?.trim() || 
      `Follow up with ${firstName}`;
  } catch (error) {
    console.warn("Failed to generate AI task title, using fallback");
    taskTitle = `Follow up with ${firstName}`;
  }
  
  const today = new Date();
  const threeDaysOut = addDays(today, 3);
  const signalExpiry = new Date(signal.expiresAt);
  const dueDate = signalExpiry < threeDaysOut ? signalExpiry : threeDaysOut;
  
  await storage.createTask({
    personId: person.id,
    title: taskTitle,
    description: signal.reasoning,
    dueDate: dueDate,
    priority: (signal.priorityScore ?? 0) >= 70 ? 'high' : 'medium',
    status: 'pending',
    completed: false
  }, ctx);
  
  console.log(`[TaskFromSignal] Created task "${taskTitle}" for ${person.name}, due ${dueDate.toLocaleDateString()}`);
}
