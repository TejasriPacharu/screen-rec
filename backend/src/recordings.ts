import { Router, Request, Response, NextFunction } from "express";
import { Recording } from "./models/Recording";
import { authMiddleware } from "./auth";
import { S3_BUCKET } from "./config";
import { AwsS3Service } from "./lib/s3";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "./config";

export const recordingsRouter = Router();

// Conditional auth middleware: requires auth only for private recordings
const conditionalAuthMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { link } = req.params;

  try {
    // Find the recording by link
    const recording = await Recording.findOne({ link });

    // If recording doesn't exist, proceed (endpoint will handle 404)
    if (!recording) {
      return next();
    }

    // If recording is public, skip authentication
    if (recording.public) {
      return next();
    }

    // Recording is private, require authentication
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ error: "Authentication required for private recordings" });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      (req as any).userId = decoded.userId;
      next();
    } catch (err) {
      return res.status(401).json({ error: "Invalid token" });
    }
  } catch (err) {
    console.error("Conditional auth middleware error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

function generateLink() {
  // generate a link of 7 characters alphabetical, mixed upper case and lower case
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  let link = "";
  for (let i = 0; i < 7; i++) {
    link += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return link;
}

const s3Service = new AwsS3Service();

recordingsRouter.get("/", authMiddleware, async (req: Request, res: Response) => {
  const recordings = await Recording.find({ userId: (req as any).userId });
  res.json(recordings);
});

recordingsRouter.post("/", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { title, contentType = "video/webm" } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: "Title is required" });
    }
    
    // Generate S3 key for the video file
    const s3Key = `recordings/${Date.now()}-${Math.random().toString(36).substring(7)}.webm`;
    
    // Create recording entry in database
    const recording = await Recording.create({
      userId: (req as any).userId,
      title,
      link: generateLink(),
      s3Key,
    });
    
    // Generate signed upload URL for S3
    const uploadUrl = await s3Service.generateSignedUploadUrl(
      S3_BUCKET,
      s3Key,
      contentType,
      3600 // 1 hour expiry
    );
    
    res.json({ recording, uploadUrl });
  } catch (error) {
    console.error('Create recording error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

recordingsRouter.get("/:link", conditionalAuthMiddleware, async (req: Request, res: Response) => {
  const recording = await Recording.findOne({ link: req.params.link });
  if (!recording) return res.status(404).json({ error: "Recording not found" });
  if (!recording.s3Key) return res.status(404).json({ error: "Recording file not found" });

  // Increment views count
  await Recording.updateOne(
    { _id: recording._id },
    { $inc: { views: 1 } }
  );

  const viewUrl = await s3Service.generateSignedViewUrl(
    S3_BUCKET,
    recording.s3Key,
    3600
  );
  res.json({ ...recording.toObject(), viewUrl });
});

recordingsRouter.put("/:id", authMiddleware, async (req: Request, res: Response) => {
  const recording = await Recording.findOneAndUpdate(
    { _id: req.params.id, userId: (req as any).userId },
    req.body,
    { new: true },
  );
  res.json(recording);
});


recordingsRouter.delete("/:id", authMiddleware, async (req: Request, res: Response) => {
  try {
    const recording = await Recording.findOne({
      _id: req.params.id,
      userId: (req as any).userId,
    });
    
    if (recording && recording.s3Key) {
      // Delete file from S3
      try {
        await s3Service.deleteFile(S3_BUCKET, recording.s3Key);
      } catch (error) {
        console.error('Failed to delete S3 file:', error);
        // Continue with database deletion even if S3 deletion fails
      }
    }
    
    await Recording.findOneAndDelete({
      _id: req.params.id,
      userId: (req as any).userId,
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Delete recording error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
