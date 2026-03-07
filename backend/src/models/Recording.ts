// backend/src/models/Recording.ts
import mongoose from "mongoose";

export type RecordingStatus =
  | "PROCESSING"
  | "TRANSCRIBED"
  | "AI_GENERATED"
  | "READY"
  | "FAILED"
  | "UPLOADED_TO_DRIVE";

const recordingSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  title:     { type: String, required: true },
  link:      { type: String, required: true, unique: true },
  s3Key:     { type: String },
  size:      { type: Number },
  duration:  { type: Number },
  views:     { type: Number, default: 0 },
  public:    { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },

  // ── AI Pipeline ───────────────────────────────────────────────────────────
  status: {
    type: String,
    enum: ["PROCESSING", "TRANSCRIBED", "AI_GENERATED", "READY", "FAILED", "UPLOADED_TO_DRIVE"],
    default: null,
    index: true,
  },
  tempFilePath: { type: String, default: null },
  transcript:   { type: String, default: null },
  error:        { type: String, default: null },
  ai: {
    title:        { type: String },
    summary:      { type: String },
    chapters:     [{ timestamp: String, heading: String }],
    keyTakeaways: [{ type: String }],
  },

  // ── Google Drive fallback ─────────────────────────────────────────────────
  driveFileId:   { type: String, default: null },
  driveFileName: { type: String, default: null },
});

export const Recording = mongoose.model("Recording", recordingSchema);