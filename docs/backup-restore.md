# Backup and restore

This procedure covers a self-hosted instance using `DATABASE_URL=file:...`
and the local attachment driver. It creates a consistent SQLite database copy,
copies private attachment files, and writes SHA-256 checksums in a manifest.
It intentionally does not copy environment variables, OAuth credentials, or
encryption keys.

For Turso/libSQL or MinIO/S3 storage, use the provider's documented snapshot
or object-versioning/export mechanism as well. Keep the database snapshot and
attachment-object snapshot from the same maintenance window.

## Create a local backup

1. Put the application in maintenance mode or stop it. This prevents an
   attachment write from landing between the database snapshot and file copy.
2. Choose a new, empty backup directory outside the application volumes.
3. Run the command with the active database and storage paths:

```bash
bun run backup:local -- \
  --output ./backups/inkest-2026-07-19 \
  --database file:./data/local.db \
  --storage ./storage
```

`database.db`, `storage/`, and `manifest.json` are created in the destination.
Store the backup with access controls suitable for the note contents. Keep a
separate, access-controlled record of the matching deployment configuration:
`NEXTAUTH_SECRET`, `AI_CREDENTIAL_ENCRYPTION_KEYS`, database URL/token, and
any enabled integration credentials. Do not put those values in the backup
directory or commit them.

## Restore into a clean environment

1. Deploy the same or a migration-compatible Inkest release, but do not start
   it yet.
2. Create empty replacement database and storage destinations. The restore
   command refuses to overwrite existing data.
3. Run:

```bash
bun run restore:local -- \
  --input ./backups/inkest-2026-07-19 \
  --database ./restore/data/local.db \
  --storage ./restore/storage
```

4. Configure the restored environment with the matching secret/key material,
   then start the app and apply only pending forward migrations. Never rotate
   or discard an old credential-encryption key until restored settings and
   calendar connections have been read successfully.
5. With a disposable account, compare note titles/content, tags, note-backed
   tasks, version history, and attachment downloads with the source instance.
   Verify another account cannot fetch an attachment.

## Verify user export separately

Sign in as the restored user and choose **Settings → Export everything**. Open
the downloaded ZIP outside Inkest and confirm it contains `metadata.json`, one
Markdown file per note under `notes/`, and attachment bytes under
`attachments/`. The export is portable user data; it is not a replacement for
the database backup because it does not contain every operational record or
secret.

## Repeatable repository drill

Run this before a release or after changing backup/export behavior:

```bash
bun run verify:backup
```

The drill migrates a temporary clean database, seeds representative notes,
tags, tasks, versions, and an attachment, then backs up/restores and compares
them. It also proves the user export includes portable Markdown, metadata,
tags, and the attachment bytes. It never uses production data or credentials.
