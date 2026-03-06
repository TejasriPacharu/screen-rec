// backend/src/models/User.ts
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email:        { type: String, required: true, unique: true },
  googleId:     { type: String, required: true, unique: true },
  displayName:  { type: String },
  avatar:       { type: String },

  // ── Google Drive OAuth tokens (stored for fallback upload feature) ────────
  driveAccessToken:  { type: String, default: null },
  driveRefreshToken: { type: String, default: null },
  driveTokenExpiry:  { type: Date,   default: null },

  // ── Telegram (for fallback notifications) ────────────────────────────────
  telegramChatId: { type: String, default: null },

  createdAt: { type: Date, default: Date.now },
});

export const User = mongoose.model('User', userSchema);