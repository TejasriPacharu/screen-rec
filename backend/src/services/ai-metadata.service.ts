// backend/src/services/ai-metadata.service.ts
import Groq from 'groq-sdk';
import { GROQ_API_KEY } from '../config';

const groq = new Groq({ apiKey: GROQ_API_KEY });

export interface AIMetadata {
  title: string;
  summary: string;
  chapters: { timestamp: string; heading: string }[];
  keyTakeaways: string[];
}

export const generateAIMetadata = async (transcript: string): Promise<AIMetadata> => {
  console.log('[AI Metadata] Generating metadata with Groq...');

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    temperature: 0.3,
    max_completion_tokens: 1024,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `You are an expert content analyst reviewing screen recording transcripts.
You MUST respond with a single valid JSON object — no markdown, no code fences, no extra text.
The JSON must have exactly these keys: title, summary, chapters, keyTakeaways.`,
      },
      {
        role: 'user',
        content: `Analyze this transcript and return a JSON object with this exact structure:

{
  "title": "<max 8 words, specific and descriptive, not generic like 'Screen Recording'>",
  "summary": "<max 150 words, plain prose, no bullet points>",
  "chapters": [
    { "timestamp": "MM:SS", "heading": "<max 6 words>" }
  ],
  "keyTakeaways": [
    "<actionable sentence 1>",
    "<actionable sentence 2>",
    "<actionable sentence 3>",
    "<actionable sentence 4>",
    "<actionable sentence 5>"
  ]
}

RULES:
- chapters: identify natural topic shifts (video is at most 3 minutes)
- keyTakeaways: exactly 5 items, each a single actionable sentence

TRANSCRIPT:
${transcript}`,
      },
    ],
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw) throw new Error('Groq returned empty response for AI metadata.');

  let parsed: AIMetadata;
  try {
    // Strip accidental code fences if the model adds them despite instructions
    const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    parsed = JSON.parse(clean);
  } catch {
    throw new Error(`Failed to parse Groq metadata response: ${raw}`);
  }

  if (
    !parsed.title ||
    !parsed.summary ||
    !Array.isArray(parsed.chapters) ||
    !Array.isArray(parsed.keyTakeaways)
  ) {
    throw new Error('Groq metadata response failed schema validation.');
  }

  parsed.keyTakeaways = parsed.keyTakeaways.slice(0, 5);

  console.log('[AI Metadata] Groq metadata generation complete.');
  return parsed;
};