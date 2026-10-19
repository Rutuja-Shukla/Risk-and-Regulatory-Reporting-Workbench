# ADR-001: Immutable Input Snapshot Storage Strategy

- **Status**: Accepted
- **Deciders**: Lead Architecture & Risk Systems Engineering
- **Context**: 
  The Regulatory Reporting Workbench requires that any report run can be audited or re-executed months or years later. When a report is triggered "as of" a past date, the underlying trade and exposure dataset must be permanently sealed so that subsequent upstream trade amendments, cancellations, or database vacuuming cannot mutate historical inputs.

## Considered Options

1. **Point-in-Time Temporal Database Queries (Bitemporal Tables / SQL Server System-Versioning)**
   - *Pros*: Built directly into database engine; transparent querying via `FOR SYSTEM_TIME AS OF`.
   - *Cons*: High storage overhead on row-level mutations; brittle if schema evolves; vulnerable to accidental DBA updates or table migrations; difficult to produce a single portable cryptographic content-addressable hash.

2. **Database Row Soft-Deletes with `valid_from` / `valid_to` timestamps**
   - *Pros*: Familiar relational pattern.
   - *Cons*: Query complexity explodes; index bloat; susceptible to developer error where a query forgets to include timestamp filters.

3. **Content-Addressed Immutable Snapshot Objects with RFC 8785 Hashing (Selected)**
   - *Pros*:
     - **Cryptographic Immutability**: The filtered exposure slice is serialized into canonical RFC 8785 JSON bytes and hashed with SHA-256.
     - **Storage Decoupling**: Raw snapshot payload is stored in object storage (S3 / Azure Blob / MinIO) with write-once-read-many (WORM) retention or compressed JSONB in PostgreSQL.
     - **Content Addressability**: The `contentHashSha256` serves as the primary verification key. If even a single trade notional or counterparty rating changes by 1 byte, the hash changes.
     - **Reproducibility Guarantee**: The background calculation worker only reads from the sealed snapshot, isolating execution from upstream live OLTP databases.
   - *Cons*:
     - Duplicate storage for identical snapshots (mitigated by content-addressable deduplication: if identical `(asOfDate, desk, region)` slice has the same SHA-256, point to existing snapshot).

## Decision

We adopt **Option 3: Content-Addressed Immutable Snapshot Objects**. 
At report run creation, the engine queries the active exposures as of the requested date, applies the authenticated user's ABAC scope, sorts trades canonically by `tradeId`, serializes via RFC 8785, and seals the snapshot with a SHA-256 content hash before queuing the background worker.

## Consequences

- All worker executions depend exclusively on immutable snapshots, never querying live transactional exposure tables.
- Downstream audit verification endpoints (`GET /api/v1/audit/verify`) can independently verify the hash of the snapshot against the audit log without re-running calculation logic.
