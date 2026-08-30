# Storage CORS — fixing "Network error during upload"

## What the error means

Uploads do **not** pass through the app or the edge function. The function only
signs a URL; the browser then `PUT`s the file straight to R2/S3. That request is
cross-origin, so the bucket itself has to allow it. If it does not, the browser
blocks the request before it leaves — the app sees a failure with no status code
and no body, which is all an `xhr.onerror` gives you.

## The checksum trap

The obvious reading — "the origin is not allowlisted" — is often wrong. From
`@aws-sdk/client-s3` **3.729** onward, `PutObjectCommand` attaches a CRC32
checksum by default (`requestChecksumCalculation: "WHEN_SUPPORTED"`). On a
*presigned* URL that lands in `X-Amz-SignedHeaders`, so the browser is obliged
to send `x-amz-checksum-crc32` and `x-amz-sdk-checksum-algorithm`, and its
preflight asks the bucket whether it may. A bucket whose `allowed_headers` is
just `Content-Type` says no — with the origin and the method both allowlisted
and looking perfectly correct.

Two independent fixes, and this repo carries both:

1. `scripts/storage-cors.json` allows the `x-amz-*` headers.
2. `supabase/functions/cloud-storage/index.ts` builds its S3 client with
   `requestChecksumCalculation: "WHEN_REQUIRED"`, so nothing asks for those
   headers in the first place. **Needs a redeploy to take effect:**
   `supabase functions deploy cloud-storage`.

## R2 (the default provider)

```bash
npm run storage:cors                 # applies scripts/storage-cors.json
npm run storage:cors:list            # shows what the bucket has now
```

Both wrap wrangler and need `wrangler login` (or `CLOUDFLARE_API_TOKEN`) first,
with a token holding **Workers R2 Storage: Edit**. The bucket name comes from
`STORAGE_BUCKET`; the scripts default to `1corehub`, so for a different bucket:

```bash
npx wrangler r2 bucket cors set <bucket> --file scripts/storage-cors.json
```

## AWS S3

```bash
aws s3api put-bucket-cors \
  --bucket <bucket> \
  --cors-configuration file://scripts/storage-cors-s3.json
```

The two files hold the same policy in different shapes, because the APIs differ:
`storage-cors.json` uses R2's own `{ rules: [{ allowed: { origins, methods,
headers } }] }`, while `storage-cors-s3.json` uses S3's `CORSRules` with
`AllowedOrigins`/`AllowedMethods`/`AllowedHeaders`. Edit both if you change the
policy.

## Why the origins are `*`

This is a white-label product: every workspace can put the app on its own
domain, so the set of origins that legitimately upload is open-ended and not
knowable in advance. A fixed allowlist would mean editing this file and
re-running wrangler for every customer domain — and quietly breaking uploads for
any tenant whose domain had not been added yet. Even in development it broke the
moment Vite fell back from port 8080 to 8081.

**`*` is not the security boundary being relaxed, because CORS was never the
boundary.** A browser cannot `PUT` anything without a presigned URL, and that
URL only comes from the `cloud-storage` edge function, which:

- requires an authenticated Supabase session (`requireUser`),
- rewrites the key to sit under that user's own id (`sanitizePath`), so nobody
  can write outside their namespace whatever they ask for,
- signs for at most an hour (`expiresIn` is capped at 3600).

So the answer to "who may upload" is decided at presign time, by the session —
not by which page the browser happened to be on. What `*` removes is a check
that only ever cost legitimate tenants their uploads. Objects are already
world-readable over the public bucket URL, so `GET` is no wider than it was.

`PUT` is the upload. `GET`/`HEAD` let the player read the object back and let
the browser probe a video's duration cross-origin.

The one thing to keep narrow is the **method** list: never add `DELETE` here.
Deletion goes through the edge function, which checks ownership; a browser must
never be able to delete an object directly.

## Checking it worked

```bash
npm run storage:cors:list
```

Then retry an upload. If it still fails, the error panel in the Video Library
now names the origin the browser sent — that exact string has to appear in
`AllowedOrigins`.
