import "../config"; // ensure dotenv runs
import { AwsS3Service } from "./lib/s3";
import { S3_BUCKET } from "./config";

async function main() {
  const s3 = new AwsS3Service();
  await s3.applyCors(S3_BUCKET);
  console.log("✅ Backblaze S3 CORS applied");
}

main().catch((err) => {
  console.error("❌ Failed to apply CORS", err);
  process.exit(1);
});
