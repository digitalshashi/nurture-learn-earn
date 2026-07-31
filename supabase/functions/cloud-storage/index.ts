/**
 * S3-compatible storage for Cloudflare R2 and AWS S3.
 * Bucket default: 1corehub
 *
 * Secrets (set via `supabase secrets set`):
 *   STORAGE_PROVIDER          r2 | s3          (default: r2)
 *   STORAGE_BUCKET            bucket name      (default: 1corehub)
 *   STORAGE_ACCESS_KEY_ID     access key
 *   STORAGE_SECRET_ACCESS_KEY secret key
 *   STORAGE_REGION            auto | region    (default: auto for r2, us-east-1 for s3)
 *   STORAGE_ENDPOINT          R2 endpoint e.g. https://<ACCOUNT_ID>.r2.cloudflarestorage.com
 *   STORAGE_PUBLIC_URL        Public base URL  e.g. https://cdn.1corehub.com or https://pub-xxx.r2.dev
 *
 * Actions (POST JSON):
 *   { action: "presign", path, contentType, contentLength? }
 *   { action: "delete",  path | url }
 *   { action: "list",    prefix, maxKeys? }
 *   { action: "config" }  → public config (bucket, publicUrl, provider) for the client
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from "npm:@aws-sdk/client-s3@3.758.0";
import { getSignedUrl } from "npm:@aws-sdk/s3-request-presigner@3.758.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function storageConfig() {
  const provider = (Deno.env.get("STORAGE_PROVIDER") || "r2").toLowerCase();
  const bucket = Deno.env.get("STORAGE_BUCKET") || "1corehub";
  const accessKeyId = Deno.env.get("STORAGE_ACCESS_KEY_ID") || "";
  const secretAccessKey = Deno.env.get("STORAGE_SECRET_ACCESS_KEY") || "";
  const endpoint = Deno.env.get("STORAGE_ENDPOINT") || "";
  const region =
    Deno.env.get("STORAGE_REGION") ||
    (provider === "r2" ? "auto" : "us-east-1");
  const publicUrl = (Deno.env.get("STORAGE_PUBLIC_URL") || "").replace(/\/$/, "");

  return { provider, bucket, accessKeyId, secretAccessKey, endpoint, region, publicUrl };
}

function getS3Client() {
  const cfg = storageConfig();
  if (!cfg.accessKeyId || !cfg.secretAccessKey) {
    throw new Error(
      "Storage is not configured. Set STORAGE_ACCESS_KEY_ID and STORAGE_SECRET_ACCESS_KEY secrets.",
    );
  }
  if (cfg.provider === "r2" && !cfg.endpoint) {
    throw new Error(
      "R2 requires STORAGE_ENDPOINT (e.g. https://<ACCOUNT_ID>.r2.cloudflarestorage.com).",
    );
  }
  if (!cfg.publicUrl) {
    throw new Error(
      "Set STORAGE_PUBLIC_URL to your public CDN / R2.dev / S3 website base URL.",
    );
  }

  return {
    client: new S3Client({
      region: cfg.region,
      endpoint: cfg.endpoint || undefined,
      credentials: {
        accessKeyId: cfg.accessKeyId,
        secretAccessKey: cfg.secretAccessKey,
      },
      // Path-style works reliably with custom endpoints (R2) and many S3-compatible APIs.
      forcePathStyle: !!cfg.endpoint,
    }),
    cfg,
  };
}

function sanitizePath(raw: string, userId: string): string {
  let path = (raw || "").replace(/^\/+/, "").replace(/\.\./g, "");
  if (!path) throw new Error("path is required");
  // Always namespace under the authenticated user to avoid cross-user overwrites
  if (!path.startsWith(`${userId}/`) && !path.includes(`/${userId}/`)) {
    path = `${userId}/${path}`;
  }
  return path;
}

function pathFromUrl(url: string, publicBase: string): string | null {
  try {
    if (publicBase && url.startsWith(publicBase + "/")) {
      return decodeURIComponent(url.slice(publicBase.length + 1).split("?")[0]);
    }
    const u = new URL(url);
    // /bucket/key path-style or /key virtual-hosted
    const parts = u.pathname.replace(/^\/+/, "").split("/");
    if (parts.length >= 2 && parts[0] === (Deno.env.get("STORAGE_BUCKET") || "1corehub")) {
      return decodeURIComponent(parts.slice(1).join("/"));
    }
    return decodeURIComponent(parts.join("/")) || null;
  } catch {
    return null;
  }
}

function publicObjectUrl(publicBase: string, path: string) {
  return `${publicBase}/${path.split("/").map(encodeURIComponent).join("/")}`;
}

async function requireUser(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw Object.assign(new Error("Unauthorized"), { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    throw Object.assign(new Error("Unauthorized"), { status: 401 });
  }
  return data.user;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action || "presign";

    // Public-ish config for UI (still requires auth)
    const user = await requireUser(req);

    if (action === "config") {
      const cfg = storageConfig();
      return json({
        provider: cfg.provider,
        bucket: cfg.bucket,
        publicUrl: cfg.publicUrl,
        configured: !!(cfg.accessKeyId && cfg.secretAccessKey && cfg.publicUrl && (cfg.provider !== "r2" || cfg.endpoint)),
      });
    }

    const { client, cfg } = getS3Client();

    if (action === "presign") {
      const path = sanitizePath(String(body.path || ""), user.id);
      const contentType = String(body.contentType || "application/octet-stream");
      const expiresIn = Math.min(Number(body.expiresIn) || 900, 3600);

      const command = new PutObjectCommand({
        Bucket: cfg.bucket,
        Key: path,
        ContentType: contentType,
      });

      const uploadUrl = await getSignedUrl(client, command, { expiresIn });
      const publicUrl = publicObjectUrl(cfg.publicUrl, path);

      return json({
        uploadUrl,
        publicUrl,
        path,
        bucket: cfg.bucket,
        provider: cfg.provider,
        headers: {
          "Content-Type": contentType,
        },
        expiresIn,
      });
    }

    if (action === "delete") {
      let path = body.path ? String(body.path) : null;
      if (!path && body.url) {
        path = pathFromUrl(String(body.url), cfg.publicUrl);
      }
      if (!path) return json({ error: "path or url required" }, 400);

      path = path.replace(/^\/+/, "");
      // Users may only delete their own objects (admins/super_admin could be extended later)
      if (!path.startsWith(`${user.id}/`) && !path.includes(`/${user.id}/`)) {
        return json({ error: "Forbidden: can only delete your own files" }, 403);
      }

      await client.send(
        new DeleteObjectCommand({
          Bucket: cfg.bucket,
          Key: path,
        }),
      );
      return json({ ok: true, path });
    }

    if (action === "list") {
      const rawPrefix = String(body.prefix || "");
      // Force listing under user namespace
      let prefix = rawPrefix.replace(/^\/+/, "");
      if (!prefix.startsWith(`${user.id}/`) && !prefix.includes(`/${user.id}/`)) {
        prefix = prefix ? `${user.id}/${prefix}` : `${user.id}/`;
      }

      const maxKeys = Math.min(Number(body.maxKeys) || 100, 1000);
      const result = await client.send(
        new ListObjectsV2Command({
          Bucket: cfg.bucket,
          Prefix: prefix,
          MaxKeys: maxKeys,
        }),
      );

      const items = (result.Contents || []).map((obj) => ({
        key: obj.Key,
        size: obj.Size || 0,
        lastModified: obj.LastModified?.toISOString() || null,
        publicUrl: obj.Key ? publicObjectUrl(cfg.publicUrl, obj.Key) : null,
      }));

      return json({ items, prefix, bucket: cfg.bucket });
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (err: any) {
    const status = err?.status || 500;
    console.error("cloud-storage error:", err);
    return json({ error: err?.message || "Internal error" }, status);
  }
});
