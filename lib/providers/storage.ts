/**
 * File storage abstraction (docs/decisions.md ADR 3). Sprint 0 ships a local-disk
 * implementation for dev; production moves to an S3-compatible bucket (Liara/Arvan per
 * project-plan-v1.md §7) by adding a provider here, without touching call sites.
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

let cached: StorageProvider | undefined;

export function getStorageProvider(): StorageProvider {
  if (cached) return cached;

  switch (process.env.STORAGE_PROVIDER ?? "local") {
    case "local":
      cached = new LocalDiskStorageProvider();
      break;
    default:
      throw new Error(
        `Unknown STORAGE_PROVIDER "${process.env.STORAGE_PROVIDER}". Only "local" is implemented in Sprint 0.`,
      );
  }
  return cached;
}
