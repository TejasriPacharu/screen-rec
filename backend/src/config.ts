import dotenv from "dotenv";
dotenv.config();

export const MONGO_CONN_STR = process.env.MONGO_CONN_STR!;
export const S3_KEY_ID = process.env.S3_KEY_ID!;
export const S3_APP_KEY = process.env.S3_APP_KEY!;
export const S3_BUCKET = process.env.S3_BUCKET!;
export const S3_REGION = process.env.S3_REGION || "us-east-005";
export const S3_CORS_ALLOWED_ORIGINS = ["http://locahost:3000"];
export const PORT = process.env.PORT || 8080;
export const JWT_SECRET = process.env.JWT_SECRET!;
export const S3_ENDPOINT = process.env.S3_ENDPOINT!;
