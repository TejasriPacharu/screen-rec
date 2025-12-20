import mongoose from 'mongoose';

const recordingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  title: { type: String, required: true },
  link: { type: String, required: true, unique: true },
  s3Key: { type: String },
  size: { type: Number },
  duration: { type: Number },
  views: { type: Number, default: 0 },
  public: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

export const Recording = mongoose.model('Recording', recordingSchema);
