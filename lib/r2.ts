import "server-only";

import { AwsClient } from "aws4fetch";

const DEFAULT_UPLOAD_TTL_SECONDS = 10 * 60;
const DEFAULT_DOWNLOAD_TTL_SECONDS = 5 * 60;

type R2Config = {
  endpoint: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
};

type R2Storage = "private" | "public";

function getR2Config(storage: R2Storage = "private"): R2Config {
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const endpoint = (process.env.R2_ENDPOINT?.trim() ||
    (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : "")).replace(/\/$/, "");

  const publicAccessKeyId = process.env.R2_PUBLIC_ACCESS_KEY_ID?.trim();
  const publicSecretAccessKey = process.env.R2_PUBLIC_SECRET_ACCESS_KEY?.trim();

  const accessKeyId =
    storage === "public" && publicAccessKeyId && publicSecretAccessKey
      ? publicAccessKeyId
      : process.env.R2_ACCESS_KEY_ID?.trim();

  const secretAccessKey =
    storage === "public" && publicAccessKeyId && publicSecretAccessKey
      ? publicSecretAccessKey
      : process.env.R2_SECRET_ACCESS_KEY?.trim();

  const bucket =
    (storage === "public"
      ? process.env.R2_PUBLIC_BUCKET_NAME?.trim()
      : process.env.R2_BUCKET_NAME?.trim()) ||
    (storage === "private" ? process.env.R2_BUCKET_NAME?.trim() : "");

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !endpoint) {
    throw new Error(
      storage === "public"
        ? "Public R2 is not configured. Set R2_PUBLIC_BUCKET_NAME and, if needed, R2_PUBLIC_ACCESS_KEY_ID/R2_PUBLIC_SECRET_ACCESS_KEY."
        : "R2 is not configured. Check R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME and R2_ENDPOINT."
    );
  }

  return { endpoint, bucket, accessKeyId, secretAccessKey };
}

export function hasPublicR2Delivery() {
  return Boolean(
    process.env.R2_PUBLIC_BUCKET_NAME?.trim() &&
    process.env.R2_PUBLIC_BASE_URL?.trim()
  );
}

export function getPublicR2Url(key: string) {
  if (!isR2DocumentKey(key)) {
    throw new Error("Invalid R2 document key.");
  }

  const baseUrl = process.env.R2_PUBLIC_BASE_URL?.trim().replace(/\/$/, "");
  if (!baseUrl) {
    throw new Error("R2_PUBLIC_BASE_URL is not configured.");
  }

  return `${baseUrl}/${encodeObjectKey(key)}`;
}

function getR2Client(config: R2Config) {
  return new AwsClient({
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    service: "s3",
    region: "auto",
    retries: 0,
  });
}

function encodeObjectKey(key: string) {
  return key
    .split("/")
    .map(part => encodeURIComponent(part))
    .join("/");
}

export function isR2DocumentKey(key: string | null | undefined): key is string {
  return typeof key === "string" && key.startsWith("documents/") && key.length > "documents/".length;
}

export function sanitizeR2FileName(fileName: string) {
  const normalized = fileName.normalize("NFKC").trim();
  const safe = normalized
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 160);

  return safe || "document";
}

export function makeR2DocumentKey(
  documentId: string,
  fileName: string,
  variantId?: string | null
) {
  const safeName = sanitizeR2FileName(fileName);
  const unique = crypto.randomUUID();

  if (variantId) {
    return `documents/${documentId}/levels/${variantId}/${unique}-${safeName}`;
  }

  return `documents/${documentId}/${unique}-${safeName}`;
}

export async function createR2PresignedUrl(params: {
  key: string;
  method: "GET" | "PUT";
  expiresIn?: number;
  contentType?: string | null;
  storage?: R2Storage;
  cacheControl?: string | null;
}) {
  if (!isR2DocumentKey(params.key)) {
    throw new Error("Invalid R2 document key.");
  }

  const storage = params.storage ?? "private";
  const config = getR2Config(storage);
  const client = getR2Client(config);
  const expiresIn = Math.max(
    1,
    Math.min(
      params.expiresIn ??
        (params.method === "PUT"
          ? DEFAULT_UPLOAD_TTL_SECONDS
          : DEFAULT_DOWNLOAD_TTL_SECONDS),
      7 * 24 * 60 * 60
    )
  );

  const url = new URL(
    `${config.endpoint}/${encodeURIComponent(config.bucket)}/${encodeObjectKey(params.key)}`
  );
  url.searchParams.set("X-Amz-Expires", String(expiresIn));

  const headers =
    params.method === "PUT"
      ? {
          ...(params.contentType ? { "Content-Type": params.contentType } : {}),
          ...(params.cacheControl ? { "Cache-Control": params.cacheControl } : {}),
        }
      : undefined;

  const signed = await client.sign(url.toString(), {
    method: params.method,
    headers,
    aws: {
      signQuery: true,
    },
  });

  return signed.url.toString();
}

export async function deleteR2Object(
  key: string,
  storage: R2Storage = "private"
) {
  if (!isR2DocumentKey(key)) return;

  const config = getR2Config(storage);
  const client = getR2Client(config);
  const url = `${config.endpoint}/${encodeURIComponent(config.bucket)}/${encodeObjectKey(key)}`;

  const response = await client.fetch(url, { method: "DELETE" });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(
      `R2 object deletion failed (${response.status})${message ? `: ${message.slice(0, 300)}` : "."}`
    );
  }
}
