// backend/src/config.ts
import dotenv from "dotenv";
dotenv.config();

export const MONGO_CONN_STR         = process.env.MONGO_CONN_STR!;
export const PORT                   = process.env.PORT || 8080;
export const JWT_SECRET             = process.env.JWT_SECRET!;

// ── S3 ────────────────────────────────────────────────────────────────────
export const S3_KEY_ID              = process.env.S3_KEY_ID!;
export const S3_APP_KEY             = process.env.S3_APP_KEY!;
export const S3_BUCKET              = process.env.S3_BUCKET!;
export const S3_REGION              = process.env.S3_REGION || "us-east-005";
export const S3_ENDPOINT            = process.env.S3_ENDPOINT!;
export const S3_CORS_ALLOWED_ORIGINS = ["http://localhost:3000"];

// ── AI Services ───────────────────────────────────────────────────────────
export const GROQ_API_KEY           = process.env.GROQ_API_KEY!; 
export const ELEVENLABS_API_KEY     = process.env.ELEVENLABS_API_KEY!;

// ── Redis ─────────────────────────────────────────────────────────────────
export const REDIS_HOST             = process.env.REDIS_HOST;
export const REDIS_PORT             = Number(process.env.REDIS_PORT) || 6379;
export const REDIS_PASSWORD         = process.env.REDIS_PASSWORD ;

// ── Google OAuth ──────────────────────────────────────────────────────────
export const GOOGLE_CLIENT_ID       = process.env.GOOGLE_CLIENT_ID!;
export const GOOGLE_CLIENT_SECRET   = process.env.GOOGLE_CLIENT_SECRET!;
// Must match exactly what you set in Google Cloud Console
export const GOOGLE_CALLBACK_URL    = process.env.GOOGLE_CALLBACK_URL
  || "http://localhost:8989/auth/google/callback";
// Frontend URL — redirect here after successful OAuth
export const FRONTEND_URL           = process.env.FRONTEND_URL
  || "http://localhost:3000";

// ── n8n Fallback ──────────────────────────────────────────────────────────────
// Webhook URL from n8n — set after creating the workflow
export const N8N_WEBHOOK_URL         = process.env.N8N_WEBHOOK_URL || "";
// Shared secret between backend and n8n for internal endpoints
export const INTERNAL_SECRET         = process.env.INTERNAL_SECRET!;
