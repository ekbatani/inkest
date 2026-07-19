# Semantic search and note-aware chat decision

**Decision date:** 2026-07-19  
**Status:** No-go for product implementation now; approve only the bounded
evaluation below after the public self-hosted release and with opt-in users.

## Decision

Inkest will not add an embedding client, vector database, background indexer,
or note-aware chat to the current release. The product already provides
title/content search, wiki links, tags, and explicit single-note AI actions.
Those are the appropriate private, low-operational-cost defaults while there
is no evidence that semantic retrieval solves an important user problem better
than improving ordinary search.

The future feature, if validated, is **retrieval-assisted answers over notes
the user has explicitly opted in to index**, not a general autonomous agent.
An answer must show every retrieved note title and an opened-note link, say
when the retrieved context is insufficient, and never modify a note or take an
external action. It must remain unavailable until the user enables indexing
and separately starts a question.

## What was compared

| Option | Privacy and deployment | Cost and operations | Expected quality | Decision |
| --- | --- | --- | --- | --- |
| Keep current lexical search and selected-note AI | No additional copy or provider disclosure; current AI remains explicit. | No new service, model, schema, or re-index lifecycle. | Exact names, titles, tags, and phrases work; paraphrase and multi-note recall are limited. | Keep as the shipped baseline. |
| Local embedding model with an in-deployment index | Note text and vectors stay inside the self-hosted deployment when both the embedding and chat models are local. Vectors are still sensitive derived content and need the same access, backup, deletion, and export treatment as notes. | Requires an embedding runtime/model, CPU/RAM/disk capacity, index rebuild/recovery, version migration, and a secure storage path. | Best privacy posture; model quality and multilingual/RTL retrieval must be measured on the user's notes. | Preferred pilot architecture if demand clears the gate. |
| Hosted embeddings plus local vector storage | Every indexed chunk and every query leaves the deployment for the embedding provider; the chat request also leaves it when a hosted chat provider is used. | Recurring token charges for initial indexing, updates, and queries; model/version changes require re-indexing. Storage remains an operator responsibility. | Likely stronger multilingual retrieval depending on model, but does not eliminate wrong or unsupported answers. | Pilot comparison only, behind a separate provider and explicit disclosure. |
| Hosted embedding and managed vector services | Chunks, vectors, metadata, and queries are shared with additional processors; multi-tenant isolation and retention terms become part of Inkest's privacy contract. | Simplest app operation but adds credentials, network dependency, service cost, vendor migration, outage handling, and deletion/recovery coordination. | Can scale and enable hybrid retrieval, but quality still requires a representative evaluation. | Not suitable for the self-hosted default; reconsider only for a future hosted product. |

Embeddings are vectors that rank semantically related text and are commonly
used for search; they do not prove that a returned passage supports a model's
answer. Retrieval therefore needs cited source snippets and an abstain rule.
OpenAI's embedding documentation likewise describes token-billed inputs,
dimension/quality trade-offs, and nearest-neighbour retrieval; it is not an
endorsement of a particular provider for Inkest.

Qdrant is a representative external vector service, not a proposed
dependency. Its own production documentation shows why a new service changes
the self-hosting contract: self-hosted instances must be secured explicitly
with private networking, authentication, and TLS, plus backups and monitoring.

## Existing implementation constraints

- `notes.content_md` is the canonical Markdown source. Current note search
  loads up to 100 authorized notes and performs normalized title/content
  matching in the application.
- Current AI is explicitly initiated and has no background processing. Editing,
  search, preview, export, spellcheck, and calendar work do not send note text
  to a provider. A semantic indexer must not silently weaken that promise.
- Current AI limits are per user and requests are authenticated. Existing
  `ai_events` keep a primary-input hash, not raw input. Retrieval must preserve
  those boundaries rather than reuse a chat provider implicitly.

## Small technical proposal, only if the pilot is approved

Build this as a separate, feature-flagged retrieval domain rather than changing
the existing AI action runner.

1. Add an `EmbeddingProvider` interface separate from chat completion, with a
   local implementation first and a hosted implementation only after an
   explicit per-user provider choice. Record model id and vector dimensions so
   a model change creates a new index generation rather than mixing vectors.
2. Add a migration for chunk metadata and embeddings. Each record must carry
   `user_id`, `workspace_id`, `note_id`, note `updated_at`, chunk ordinal,
   content hash, model/generation, and deletion state. Do not store raw
   Markdown outside the canonical notes database unless the user has selected
   a separately disclosed hosted processor.
3. Offer a Settings opt-in that states whether embeddings and answers are local
   or hosted, what text leaves the deployment, and how to delete the index.
   Index only after a user starts it. Re-index changed notes through an explicit
   "update index" action in the pilot; do not introduce automatic background
   AI work.
4. Every retrieval query must authenticate first and filter by both current
   `user_id` and `workspace_id` before ranking. Deleted, archived, or changed
   notes are excluded until re-indexed; account/workspace deletion removes all
   associated index records. Export must either include a documented rebuild
   manifest or omit derived vectors and state that the recipient must re-index.
5. For chat, fetch a small, bounded top-k set, include note title/chunk IDs in
   the prompt, require citations, cap input/output tokens, and return "I don't
   know from the selected notes" when sources do not support the answer. Save
   the same privacy-safe audit metadata as other AI actions, plus retrieved
   note IDs and index generation, never the full prompt.
6. Begin with a local, same-database small-corpus implementation only if its
   measured corpus limit and query latency are acceptable. A dedicated vector
   service is a later scaling decision, with a Docker security/recovery guide,
   not a prerequisite for the pilot.

## Pilot gate and evaluation

Do not implement the proposal until at least 10 consenting beta users provide
anonymized, opt-in evaluation sets that include English, Persian/RTL where
available, exact-name, paraphrase, and multi-note questions. Compare the
current lexical baseline with local semantic and (only with consent) hosted
semantic retrieval on the same labelled set.

Ship a pilot only when all of these hold:

- Recall@5 is at least 80% for answer-bearing chunks and no cross-user or
  cross-workspace result appears in authorization tests.
- At least 90% of sampled answers are fully supported by their displayed
  citations; unsupported answers must abstain rather than invent sources.
- Median and p95 indexing/query times, model memory, index size, and failure
  recovery are recorded for a representative self-hosted corpus.
- Hosted cost is reported as input tokens indexed/re-indexed plus query tokens;
  no pricing assumption is embedded in the product. A model change or bulk
  edit must be costed as a full re-index.
- Participants understand the disclosure and a majority say the feature saves
  time over lexical search. Any privacy objection, deletion failure, or
  unsupported-answer pattern blocks promotion.

## Sources consulted

- [OpenAI embeddings guide](https://developers.openai.com/api/docs/guides/embeddings)
  — embeddings are token-billed, model dimensions can trade quality for size,
  and semantic search uses nearest-neighbour retrieval.
- [Qdrant overview](https://qdrant.tech/documentation/overview/) — dense and
  sparse retrieval can be combined, while vector stores add a separate
  deployment model.
- [Qdrant production checklist](https://qdrant.tech/documentation/production-checklist/)
  — self-hosted vector services require explicit network, authentication, TLS,
  capacity, and operational controls.
