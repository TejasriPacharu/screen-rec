// backend/src/services/ai-metadata.service.ts
import { GoogleGenAI, Type } from '@google/genai';
import { GEMINI_API_KEY } from '../config';

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

export interface AIMetadata {
  title: string;
  summary: string;
  chapters: { timestamp: string; heading: string }[];
  keyTakeaways: string[];
}

export const generateAIMetadata = async (transcript: string): Promise<AIMetadata> => {
  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: [
      {
        parts: [
          {
            text: `You are an expert content analyst reviewing a screen recording transcript.
Analyze the transcript below and return structured metadata.

TRANSCRIPT:
${transcript}

RULES:
- title: max 8 words, specific and descriptive (not generic like "Screen Recording")
- summary: max 150 words, plain prose, no bullet points
- chapters: identify natural topic shifts with MM:SS timestamps. Video is at most 3 minutes long.
- keyTakeaways: exactly 5 items, each a single actionable sentence`,
          },
        ],
      },
    ],
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: {
            type: Type.STRING,
            description: 'Max 8 words. Descriptive title.',
          },
          summary: {
            type: Type.STRING,
            description: 'Max 150 words. Concise summary.',
          },
          chapters: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                timestamp: { type: Type.STRING, description: 'Format: MM:SS' },
                heading:   { type: Type.STRING, description: 'Max 6 words' },
              },
              required: ['timestamp', 'heading'],
            },
          },
          keyTakeaways: {
            type: Type.ARRAY,
            description: 'Exactly 5 key takeaways.',
            items: { type: Type.STRING },
          },
        },
        required: ['title', 'summary', 'chapters', 'keyTakeaways'],
      },
    },
  });

  const parsed: AIMetadata = JSON.parse(response.text!);

  if (!parsed.title || !parsed.summary || !Array.isArray(parsed.chapters) || !Array.isArray(parsed.keyTakeaways)) {
    throw new Error('AI metadata response failed schema validation.');
  }

  parsed.keyTakeaways = parsed.keyTakeaways.slice(0, 5);
  return parsed;
};