// backend/src/config.ts
import dotenv from "dotenv";
dotenv.config();

export const MONGO_CONN_STR = process.env.MONGO_CONN_STR!;
export const S3_KEY_ID = process.env.S3_KEY_ID!;
export const S3_APP_KEY = process.env.S3_APP_KEY!;
export const S3_BUCKET = process.env.S3_BUCKET!;
export const S3_REGION = process.env.S3_REGION || "us-east-005";
export const S3_CORS_ALLOWED_ORIGINS = ["http://localhost:3000"];
export const PORT = process.env.PORT || 8080;
export const JWT_SECRET = process.env.JWT_SECRET!;
export const S3_ENDPOINT = process.env.S3_ENDPOINT!;

// ── New ────────────────────────────────────────────────────────────────────
export const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
export const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY!;
export const REDIS_HOST = process.env.REDIS_HOST || "localhost";
export const REDIS_PORT = Number(process.env.REDIS_PORT) || 6379;
export const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;