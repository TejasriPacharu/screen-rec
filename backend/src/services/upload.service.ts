// backend/src/services/upload.service.ts 
import fs from "fs";
import { AwsS3Service } from "../lib/s3";
import { S3_BUCKET } from "../config";

const s3Service = new AwsS3Service();

export const uploadVideoToS3 = async (
  filePath: string,
  s3Key: string
): Promise<void> => {
  const stream = fs.createReadStream(filePath);
  await s3Service.uploadFile(S3_BUCKET, s3Key, stream, "video/webm");
};