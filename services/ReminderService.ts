import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Reminder } from "../types";

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

export class ReminderService {
  private static checkInterval: NodeJS.Timeout | null = null;

  //  AI-Powered Reminder Parser
  static async parseReminderWithAI(text: string): Promise<{
    task: string;
    datetime: Date;
    isReminder: boolean;
  } | null> {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

      const prompt = `You are a smart reminder parsing assistant. Analyze the following text and determine if it's a reminder request.

User message: "${text}"

Current date and time: ${new Date().toLocaleString()}

If this is a reminder request, extract:
1. The task/what to remind
2. The date and time

Respond ONLY with valid JSON in this exact format (no markdown, no extra text):
{
  "isReminder": true or false,
  "task": "the task description",
  "datetime": "ISO 8601 date string (YYYY-MM-DDTHH:mm:ss)"
}

Examples of valid reminders:
- "remind me to call mom tomorrow at 3pm"
- "set a reminder for my meeting on Dec 25 at 10:00"
- "don't forget to buy groceries on Friday 5pm"
- "remind me in 2 hours to take medicine"

If it's NOT a reminder request, set isReminder to false.`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text().trim();

      // Clean response (remove markdown code blocks if present)
      const cleanResponse = responseText
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

      const parsed = JSON.parse(cleanResponse);

      if (!parsed.isReminder) {
        return null;
      }

      const datetime = new Date(parsed.datetime);
      if (isNaN(datetime.getTime())) {
        console.error("Invalid date parsed by AI:", parsed.datetime);
        return null;
      }

      return {
        task: parsed.task,
        datetime,
        isReminder: true,
      };
    } catch (error) {
      console.error("❌ AI Reminder parsing error:", error);
      // Fallback to regex-based parsing
      return this.parseReminderFallback(text);
    }
  }

  // Fallback regex-based parser (if AI fails)
  private static parseReminderFallback(
    text: string
  ): { task: string; datetime: Date; isReminder: boolean } | null {
    const reminderPattern = /remind me to (.+?) (?:on|at|in) (.+)/i;
    const match = text.match(reminderPattern);

    if (!match) return null;

    const task = match[1].trim();
    const dateStr = match[2].trim();

    try {
      const datetime = new Date(dateStr);
      if (isNaN(datetime.getTime())) return null;
      return { task, datetime, isReminder: true };
    } catch {
      return null;
    }
  }

  // Schedule Reminder
  static async scheduleReminder(
    task: string,
    datetime: Date,
    email?: string
  ): Promise<Reminder> {
    const reminder: Reminder = {
      id: Date.now().toString(),
      task,
      datetime,
      status: "pending",
      email,
    };

    const reminders = this.getReminders();
    reminders.push(reminder);
    localStorage.setItem("reminders", JSON.stringify(reminders));

    if (!this.checkInterval) {
      this.startReminderChecker();
    }

    return reminder;
  }

  // Get All Reminders
  static getReminders(): Reminder[] {
    const stored = localStorage.getItem("reminders");
    if (!stored) return [];
    return JSON.parse(stored).map((r: any) => ({
      ...r,
      datetime: new Date(r.datetime),
    }));
  }

  // Start Reminder Checker
  private static startReminderChecker() {
    this.checkInterval = setInterval(() => {
      const reminders = this.getReminders();
      const now = new Date();

      reminders.forEach((reminder) => {
        if (reminder.status === "pending" && reminder.datetime <= now) {
          this.sendReminder(reminder);
        }
      });
    }, 30000); // Check every 30 seconds
  }

  // Send Reminder Notification
  private static async sendReminder(reminder: Reminder) {
    console.log("📧 Sending reminder:", reminder);

    // Browser notification
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("⏰ Reminder Alert", {
        body: `Time to: ${reminder.task}`,
        icon: "⏰",
        requireInteraction: true,
      });
    }

    // Update status
    const reminders = this.getReminders();
    const index = reminders.findIndex((r) => r.id === reminder.id);
    if (index !== -1) {
      reminders[index].status = "sent";
      localStorage.setItem("reminders", JSON.stringify(reminders));
    }

    // Alert user
    alert(`⏰ REMINDER: ${reminder.task}`);

    
    try {
      const audio = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYHF2m98OScTgwOUKzn77ZqHwU7k9n0y3cqBSF1yPDajz4JFF2z6OyrWBUIRp/h8L9vIgUsgs/y2Ik2BxdpvfDjnE4MDlCs5++2ah8FO5PZ9Mt3KgUhdcjw2o8+CRRds+jsq1gVCEaf4fC/byIFLILP8tiJNgcXab3w45xODA5QrOfvtmofBTuT2fTLdyoFIXXI8NqPPgkUXbPo7KtYFQhGn+HwvGgg");
      audio.play();
    } catch (e) {
      
    }
  }

  // 🗑️ Delete Reminder
  static deleteReminder(id: string) {
    const reminders = this.getReminders();
    const filtered = reminders.filter((r) => r.id !== id);
    localStorage.setItem("reminders", JSON.stringify(filtered));
  }

  // 🧹 Clear All Reminders
  static clearAllReminders() {
    localStorage.removeItem("reminders");
  }
}