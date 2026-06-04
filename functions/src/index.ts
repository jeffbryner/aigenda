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

export const extractAgendaItem = functions.https.onRequest({
  secrets: ["GOOGLE_GENAI_API_KEY"],
  region: "us-central1",
}, async (req, res) => {
  console.log("Incoming request body:", JSON.stringify(req.body));
  const { rawText, currentTimestamp } = req.body;

  if (!rawText) {
    console.error("Missing rawText in request body");
    res.status(400).json({ error: "The function must be called with rawText." });
    return;
  }

  try {
    console.log("Starting Genkit generation...");
    const response = await ai.generate({
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

    console.log("Genkit generation successful");
    res.json(response.output);
  } catch (error: any) {
    console.error("Genkit Error Detailed:", {
      message: error.message,
      stack: error.stack,
      cause: error.cause
    });
    res.status(500).json({ error: "Failed to process AI extraction.", details: error.message, });
  }
});
