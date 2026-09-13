/**
 * File storage abstraction (docs/decisions.md ADR 3). Sprint 0 shipped a local-disk
 * implementation for dev; the seller panel (ADR 27) adds a real S3-compatible provider for
 * production, since seller-uploaded product photos need to survive the `deploy` branch being
 * force-pushed fresh on every build (ADR 15) - local disk under `public/uploads` has no such
 * guarantee on this project's deploy host.
 */
export interface StorageProvider {
  /** Saves a file and returns a URL the browser can load it from. */
  save(params: { buffer: Buffer; fileName: string; contentType: string }): Promise<{ url: string }>;
}

class LocalDiskStorageProvider implements StorageProvider {
  async save({ buffer, fileName }: { buffer: Buffer; fileName: string; contentType: string }) {
    const { writeFile, mkdir } = await import("node:fs/promises");
    const path = await import("node:path");

    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadsDir, { recursive: true });

    const safeName = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    await writeFile(path.join(uploadsDir, safeName), buffer);

    return { url: `/uploads/${safeName}` };
  }
}

/**
 * Works with any S3-compatible object storage - Liara Object Storage, ArvanCloud Object
 * Storage, or AWS S3 itself - since they all speak the same PutObject API; only the endpoint/
 * bucket/credentials differ. See .env.example for the exact env vars and provider-specific
 * endpoint examples.
 */
class S3StorageProvider implements StorageProvider {
  async save({ buffer, fileName, contentType }: { buffer: Buffer; fileName: string; contentType: string }) {
    const bucket = requireEnv("S3_BUCKET");
    const safeName = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const key = `uploads/${safeName}`;

    const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
    const client = new S3Client({
      endpoint: requireEnv("S3_ENDPOINT"),
      region: process.env.S3_REGION || "default",
      // Path-style addressing (https://endpoint/bucket/key) rather than virtual-hosted-style
      // (https://bucket.endpoint/key) - the form Liara/ArvanCloud document, unlike AWS S3 itself
      // which prefers virtual-hosted-style. Harmless for real AWS S3 too, just less conventional.
      forcePathStyle: true,
      credentials: {
        accessKeyId: requireEnv("S3_ACCESS_KEY_ID"),
        secretAccessKey: requireEnv("S3_SECRET_ACCESS_KEY"),
      },
    });

    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        ACL: "public-read",
      }),
    );

    // The publicly-reachable URL is often a different host than the API endpoint (a CDN domain,
    // or the same endpoint minus some API-only path) - S3_PUBLIC_URL_BASE lets that be configured
    // explicitly instead of guessed from the API endpoint, which the two Iranian providers this
    // was written for don't consistently share with the upload endpoint.
    const publicBase = requireEnv("S3_PUBLIC_URL_BASE").replace(/\/$/, "");
    return { url: `${publicBase}/${key}` };
  }
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set. Check .env / .env.example - required when STORAGE_PROVIDER="s3".`);
  }
  return value;
}

let cached: StorageProvider | undefined;

export function getStorageProvider(): StorageProvider {
  if (cached) return cached;

  switch (process.env.STORAGE_PROVIDER ?? "local") {
    case "local":
      cached = new LocalDiskStorageProvider();
      break;
    case "s3":
      cached = new S3StorageProvider();
      break;
    default:
      throw new Error(
        `Unknown STORAGE_PROVIDER "${process.env.STORAGE_PROVIDER}". Expected "local" or "s3".`,
      );
  }
  return cached;
}
