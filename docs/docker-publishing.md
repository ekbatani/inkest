# Docker deployment and image publishing

## Current deployment path

Until a release owner provisions Docker Hub, deploy Inkest from a clean source
checkout without editing repository files:

```bash
git clone <repository-url> inkest
cd inkest
cp .env.example .env
# Set NEXTAUTH_URL and a unique NEXTAUTH_SECRET in .env.
docker compose -f docker-compose.yml -f docker-compose.local.yml up -d --build
```

The local override binds port 3000. The base compose file intentionally only
exposes that port to a reverse proxy on the Docker network. The app entrypoint
applies Drizzle migrations before starting. `inkest-data` and `inkest-storage`
are named volumes: after a restart, verify the existing account, note, and
attachment remain available.

For a release-drill host, use a new Docker context and disposable secrets. Run
`bun run smoke -- --base-url http://localhost:3000`, then complete the browser
checks in [release smoke test](release-smoke-test.md), including a container
restart and attachment persistence check. Do not remove the named volumes until
the backup/restore procedure has been exercised.

## Docker Hub release gate

No public image is currently claimed or published. Before enabling publishing,
the release owner must provide all of the following outside the repository:

1. Ownership of the Docker Hub namespace and `inkest` repository.
2. Repository variable `DOCKERHUB_NAMESPACE` containing that lowercase
   namespace.
3. Repository secrets `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN`, where the
   token has only push/pull access to that repository.
4. A clean-host verification of the immutable version tag, migration startup,
   volume persistence, and the release smoke test.

The GitHub workflow always builds a non-published release candidate. Its publish
job cannot run until `DOCKERHUB_NAMESPACE` is configured; it then publishes only
from `main` and `v*` tags. This keeps registry credentials out of the source
tree and prevents an accidental first publication.

## Tags, attestations, and updates

For a signed-off release tag `v1.2.3`, the published image tags are:

| Tag | Purpose |
| --- | --- |
| `1.2.3` | Immutable release deployment target. |
| `sha-<commit>` | Immutable commit traceability target. |
| `latest` | Convenience tag from the default branch; never use it for a production rollback target. |

The publishing job attaches BuildKit maximum-mode provenance and an SPDX SBOM
to each pushed image. Before announcing a release, the maintainer must inspect
the workflow result, verify the tag resolves to the intended commit, retain the
SBOM/provenance attestations with the release record, and address any critical
dependency finding according to the security policy.

To update a deployed host, change only the image tag in its deployment
environment, pull that immutable tag, and run the normal migration-backed
restart. Confirm the smoke test and persistent data before considering the
update complete. Roll back by returning to the prior verified immutable tag;
never roll back by deleting volumes or modifying the database manually.

Once the registry gate passes, a no-source deployment can download the tagged
[`docker-compose.release.yml`](../docker-compose.release.yml) release asset,
set `INKEST_IMAGE=docker.io/<namespace>/inkest:1.2.3` plus the required secrets
in its deployment `.env`, then run `docker compose up -d`. Keep the compose
file and secrets in the deployment system, not in the application repository.
