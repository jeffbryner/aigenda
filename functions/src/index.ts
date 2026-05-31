import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";
import { genkit, z } from "genkit";
import { googleAI } from "@genkit-ai/google-genai";

admin.initializeApp();

const ai = genkit({
  plugins: [googleAI()],
});

const ExtractionSchema = z.object({
  action_items: z.array(z.string()),
  people: z.array(z.string()),
  tags: z.array(z.string()),
  dates: z.array(z.object({
    label: z.string(),
    iso_date: z.string(),
    is_relative_inferred: z.boolean(),
  })),
});

export const extractAgendaItem = functions.https.onCall(async (request) => {
  const { rawText, currentTimestamp } = request.data;

  if (!rawText) {
    throw new functions.https.HttpsError("invalid-argument", "The function must be called with rawText.");
  }

  try {
    const response = await ai.generate({
      // Using gemini-3-flash-preview as requested
      model: "googleai/gemini-3-flash-preview",
      prompt: `
        You are an expert PIM (Personal Information Manager) data extractor.
        Analyze the following raw text and extract structured information.
        
        Current Timestamp: ${currentTimestamp || new Date().toISOString()}
        Raw Text: "${rawText}"
        
        Rules:
        1. Extract action items (what needs to be done).
        2. Extract people mentioned (names starting with @ or naturally occurring).
        3. Extract tags (topics starting with # or naturally occurring).
        4. Extract dates. If relative dates like "tomorrow", "next Tuesday", or "Friday" are used, 
           calculate the ISO date based on the Current Timestamp provided.
        5. Return ONLY a JSON object matching the requested schema.
      `,
      output: {
        schema: ExtractionSchema,
      },
    });

    return response.output;
  } catch (error) {
    console.error("Genkit Error:", error);
    throw new functions.https.HttpsError("internal", "Failed to process AI extraction.");
  }
});
