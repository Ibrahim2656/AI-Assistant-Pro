import { HfInference } from "@huggingface/inference";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Message } from "../types";
import { ReminderService } from "./ReminderService";
import { EmbeddingService } from "./EmbeddingService";

const hf = new HfInference(import.meta.env.VITE_HF_API_KEY);
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

const IMAGE_GENERATION_KEYWORDS =
  /\b(generate|create|draw|imagine|make|show me)\s+(an?|some)?\s*image[s]?\s+of\b/i;

// Helper: Blob to Base64
const blobToDataURL = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

// Helper: File to Base64
const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

// Generate Image
const generateImage = async (prompt: string): Promise<Partial<Message>> => {
  const cleanPrompt = prompt.replace(IMAGE_GENERATION_KEYWORDS, "").trim();

  try {
    const response = await hf.textToImage({
      model: "stabilityai/stable-diffusion-xl-base-1.0",
      inputs: `A high-quality, detailed image of ${cleanPrompt}`,
      parameters: {
        negative_prompt:
          "blurry, ugly, deformed, pixelated, low quality, garbled",
        num_inference_steps: 30,
        guidance_scale: 7.5,
      },
    });

    const blob = new Blob([response], { type: "image/jpeg" });
    const imageUrl = await blobToDataURL(blob);

    return {
      text: `Here's what I imagined for "${cleanPrompt}":`,
      imageUrl,
    };
  } catch (error) {
    console.error("🖼️ Image generation error:", error);
    return { text: "⚠️ Error generating the image. Please try again later." };
  }
};

// Generate Text
const generateText = async (
  prompt: string,
  context?: string
): Promise<string> => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    let enhancedPrompt = prompt;
    if (context) {
      enhancedPrompt = `Based on our previous conversations:\n${context}\n\nCurrent question: ${prompt}`;
    }

    const result = await model.generateContent(enhancedPrompt);
    return result.response.text();
  } catch (error) {
    console.error("💬 Text generation error:", error);
    return "⚠️ Sorry, I couldn't generate a response.";
  }
};

// Main Bot Response Handler
export const getBotResponse = async (
  prompt: string,
  files?: File[]
): Promise<Partial<Message>> => {
  // 1️⃣ 🤖 AI-POWERED REMINDER PARSING (AI AGENT)
  const reminderData = await ReminderService.parseReminderWithAI(prompt);
  if (reminderData && reminderData.isReminder) {
    await ReminderService.scheduleReminder(
      reminderData.task,
      reminderData.datetime
    );
    return {
      text: `✅ Reminder set by AI Agent!\n\n📋 Task: ${reminderData.task}\n⏰ Time: ${reminderData.datetime.toLocaleString()}\n\nI'll notify you when it's time! 🔔`,
    };
  }

  // 2️⃣ Image generation request
  if (IMAGE_GENERATION_KEYWORDS.test(prompt)) {
    return generateImage(prompt);
  }

  // 3️⃣ If files are attached
  if (files && files.length > 0) {
    try {
      const imageFiles = files.filter((f) => f.type.startsWith("image/"));
      const textFiles = files.filter((f) => !f.type.startsWith("image/"));

      // Handle image files
      if (imageFiles.length > 0) {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

        const imageParts = await Promise.all(
          imageFiles.map(async (file) => {
            const base64Data = await fileToBase64(file);
            return {
              inlineData: {
                data: base64Data.split(",")[1],
                mimeType: file.type,
              },
            };
          })
        );

        const result = await model.generateContent({
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }, ...imageParts],
            },
          ],
        });

        const responseText = result.response.text();
        await EmbeddingService.saveMemory(prompt, responseText);
        return { text: responseText };
      }

      // Handle text files
      if (textFiles.length > 0) {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

        const textContents = await Promise.all(textFiles.map((f) => f.text()));
        const combinedPrompt = `${prompt}\n\nFile contents:\n${textContents.join(
          "\n\n"
        )}`;

        const result = await model.generateContent(combinedPrompt);
        const responseText = result.response.text();
        await EmbeddingService.saveMemory(prompt, responseText);
        return { text: responseText };
      }
    } catch (error) {
      console.error("📎 File processing error:", error);
      return {
        text: `⚠️ Error processing files: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  }

  // 4️⃣ Use embeddings to find similar conversations for context
  const similarConvos = await EmbeddingService.findSimilarConversations(prompt);
  const context =
    similarConvos.length > 0
      ? similarConvos
          .map((c) => `User: ${c.userMessage}\nBot: ${c.botResponse}`)
          .join("\n\n")
      : undefined;

  // 5️⃣ Generate text response with context
  const responseText = await generateText(prompt, context);

  // Save to memory
  await EmbeddingService.saveMemory(prompt, responseText);

  return { text: responseText };
};