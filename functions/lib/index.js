"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractAgendaItem = void 0;
const functions = __importStar(require("firebase-functions/v2"));
const admin = __importStar(require("firebase-admin"));
const genkit_1 = require("genkit");
const google_genai_1 = require("@genkit-ai/google-genai");
admin.initializeApp();
const ai = (0, genkit_1.genkit)({
    plugins: [(0, google_genai_1.googleAI)()],
});
const ExtractionSchema = genkit_1.z.object({
    action_items: genkit_1.z.array(genkit_1.z.string()),
    people: genkit_1.z.array(genkit_1.z.string()),
    tags: genkit_1.z.array(genkit_1.z.string()),
    dates: genkit_1.z.array(genkit_1.z.object({
        label: genkit_1.z.string(),
        iso_date: genkit_1.z.string(),
        is_relative_inferred: genkit_1.z.boolean(),
    })),
});
exports.extractAgendaItem = functions.https.onCall(async (request) => {
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
    }
    catch (error) {
        console.error("Genkit Error:", error);
        throw new functions.https.HttpsError("internal", "Failed to process AI extraction.");
    }
});
//# sourceMappingURL=index.js.map