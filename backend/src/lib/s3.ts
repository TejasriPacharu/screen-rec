// backend/src/lib/s3.ts
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutBucketCorsCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import fs from "fs";
import {
  S3_ENDPOINT,
  S3_REGION,
  S3_KEY_ID,
  S3_APP_KEY,
  S3_CORS_ALLOWED_ORIGINS,
} from "../config";

export class AwsS3Service {
  private s3Client: S3Client;

  constructor() {
    this.s3Client = new S3Client({
      endpoint: S3_ENDPOINT,
      region: S3_REGION,
      credentials: {
        accessKeyId: S3_KEY_ID,
        secretAccessKey: S3_APP_KEY,
      },
      forcePathStyle: true,
    });
  }

  async generateSignedUploadUrl(
    bucketName: string,
    filename: string,
    contentType: string,
    expiresIn: number,
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: filename,
      ContentType: contentType,
    });
    return getSignedUrl(this.s3Client, command, { expiresIn });
  }

  async generateSignedViewUrl(
    bucketName: string,
    filename: string,
    expiresIn: number,
  ): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: filename,
    });
    return getSignedUrl(this.s3Client, command, { expiresIn });
  }

  async deleteFile(bucketName: string, filename: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: bucketName,
        Key: filename,
      });
      await this.s3Client.send(command);
    } catch (error) {
      // error is unknown — cast safely
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to delete file from S3: ${message}`);
    }
  }

  async uploadFile(
    bucketName: string,
    key: string,
    // Use fs.ReadStream instead of the browser ReadableStream
    body: Buffer | fs.ReadStream,
    contentType: string
  ): Promise<void> {
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: body,
      ContentType: contentType,
    });
    await this.s3Client.send(command);
  }

  // ── CORS helper (used by applyCors.ts script) ─────────────────────────────
  async applyCors(bucketName: string): Promise<void> {
    const command = new PutBucketCorsCommand({
      Bucket: bucketName,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedHeaders: ["*"],
            AllowedMethods: ["GET", "PUT", "POST", "DELETE"],
            AllowedOrigins: S3_CORS_ALLOWED_ORIGINS,
            ExposeHeaders: ["ETag"],
          },
        ],
      },
    });
    await this.s3Client.send(command);
  }
}