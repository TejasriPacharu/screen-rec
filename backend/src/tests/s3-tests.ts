import { strict as assert } from "assert";
import { AwsS3Service } from "../lib/s3";
import { S3_BUCKET, S3_ENDPOINT, S3_REGION } from "../config";

async function testS3Integration() {
  console.log("Configuration values:");
  console.log("  S3_ENDPOINT:", S3_ENDPOINT);
  console.log("  S3_REGION:", S3_REGION);
  console.log("  S3_BUCKET:", S3_BUCKET);
  console.log("");

  let s3Service: AwsS3Service;
  try {
    console.log("Initializing S3Service...");
    s3Service = new AwsS3Service();
    console.log("S3Service initialized successfully");
  } catch (error: any) {
    console.error("❌ Failed to initialize S3Service:");
    console.error("  Error name:", error?.name);
    console.error("  Error message:", error?.message);
    console.error("  Error stack:", error?.stack);
    if (error?.$metadata) {
      console.error("  Metadata:", JSON.stringify(error.$metadata, null, 2));
    }
    if (error?.cause) {
      console.error("  Cause:", error.cause);
    }
    console.error("  Full error object:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    throw error;
  }

  const testFilename = `test-${Date.now()}-${Math.random().toString(36).substring(7)}.txt`;
  const testContent = `Test file content - ${Date.now()}\nThis is a test file for S3 integration testing.`;

  try {
    console.log("Step 1: Generating signed upload URL...");
    const uploadUrl = await s3Service.generateSignedUploadUrl(
      S3_BUCKET,
      testFilename,
      "text/plain",
      3600
    );
    console.log("Upload URL generated:", uploadUrl);

    console.log("Step 2: Uploading file via HTTP PUT...");
    const uploadResponse = await fetch(uploadUrl, {
      method: "PUT",
      body: testContent,
      headers: {
        "Content-Type": "text/plain",
      },
    });

    assert.ok(uploadResponse.ok, `Upload failed with status: ${uploadResponse.status}`);
    console.log("File uploaded successfully");

    console.log("Step 3: Generating signed view URL...");
    const viewUrl = await s3Service.generateSignedViewUrl(
      S3_BUCKET,
      testFilename,
      3600
    );
    console.log("View URL generated:", viewUrl);

    console.log("Step 4: Fetching file via HTTP GET...");
    const fetchResponse = await fetch(viewUrl, {
      method: "GET",
    });

    assert.ok(fetchResponse.ok, `Fetch failed with status: ${fetchResponse.status}`);
    const fetchedContent = await fetchResponse.text();
    console.log("File fetched successfully");

    console.log("Step 5: Asserting content matches...");
    assert.strictEqual(
      fetchedContent,
      testContent,
      "Fetched content does not match uploaded content"
    );
    console.log("✓ Content matches!");

    console.log("Step 6: Cleaning up - deleting test file...");
    await s3Service.deleteFile(S3_BUCKET, testFilename);
    console.log("Test file deleted");

    console.log("\n✅ All integration tests passed!");
  } catch (error: any) {
    console.error("❌ Integration test failed:");
    console.error("  Error name:", error?.name);
    console.error("  Error message:", error?.message);
    console.error("  Error stack:", error?.stack);
    if (error?.$metadata) {
      console.error("  Metadata:", JSON.stringify(error.$metadata, null, 2));
    }
    if (error?.cause) {
      console.error("  Cause:", error.cause);
    }
    if (error?.$fault) {
      console.error("  Fault:", error.$fault);
    }
    if (error?.$response) {
      console.error("  Response:", JSON.stringify(error.$response, null, 2));
    }
    console.error("  Full error object:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    throw error;
  }
}

testS3Integration().catch((error: any) => {
  console.error("\nTest execution failed:");
  console.error("  Error name:", error?.name);
  console.error("  Error message:", error?.message);
  if (error?.stack) {
    console.error("  Error stack:", error.stack);
  }
  process.exit(1);
});