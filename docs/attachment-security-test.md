# Private attachment verification

Run this check against a disposable deployment. Create Account A and Account B
in separate browser profiles; do not use production notes, attachment names, or
credentials.

## Both storage drivers

1. Sign in as Account A and upload a small valid PNG, PDF, DOCX, and SVG.
   Each succeeds and opens through `/api/attachments/<id>`.
2. Confirm the PNG, PDF, and DOCX have their expected content disposition.
   The SVG must download rather than render inline. Every attachment response
   has `Cache-Control: private, no-store` and `X-Content-Type-Options: nosniff`.
3. In an unauthenticated browser and as Account B, request each copied
   attachment URL. Each response is `404`, has no file body, and has
   `Cache-Control: private, no-store`.
4. As Account A, upload an `.exe`, a `.png` containing plain text, an empty
   allowed-extension file, and a file larger than `MAX_UPLOAD_SIZE_MB`. Each
   fails without creating an attachment record or object.
5. Request a deliberately malformed or nonexistent attachment ID. It returns a
   cache-disabled `404` and no storage details.

## Local storage

Set `ATTACHMENT_STORAGE_DRIVER=local` and a fresh `LOCAL_STORAGE_ROOT`. Repeat
the shared checks, restart the app, then confirm Account A can still download
its valid attachment while Account B cannot.

## MinIO / S3-compatible storage

Start the private Compose storage profile with a fresh bucket and set
`ATTACHMENT_STORAGE_DRIVER=minio` plus all `MINIO_*` values. The bucket must
not have anonymous read or write access. Repeat the shared checks, then inspect
the bucket using an administrator credential: uploaded objects stay below the
`attachments/<account-a-id>/` prefix and cannot be fetched without signed
storage credentials. Restart the app and repeat Account A's download.

Record the driver, browser, command result, and any failure in `docs/todo.md`
before closing P0-41.
