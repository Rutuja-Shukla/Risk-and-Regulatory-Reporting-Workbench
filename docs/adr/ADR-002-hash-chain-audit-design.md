# ADR-002: Tamper-Evident Hash-Chain Audit Log Design

- **Status**: Accepted
- **Deciders**: Lead Architecture & Information Security
- **Context**: 
  Regulatory and risk oversight requires that all report run creations, worker completions, maker-checker approvals, and policy adjustments maintain a verifiable, tamper-evident audit record. A standard database table with `created_at` timestamps can be quietly altered by someone with database administration privileges.

## Considered Options

1. **Standard Relational Audit Table with Triggers**
   - *Pros*: Simple to query via SQL.
   - *Cons*: Vulnerable to DBA `UPDATE` or `DELETE` statements; no mathematical proof of chain integrity.

2. **External Cloud Ledger Database (e.g. Amazon QLDB / Azure Confidential Ledger)**
   - *Pros*: Managed ledger; cryptographically verifiable journal.
   - *Cons*: High vendor lock-in; proprietary client SDKs; QLDB deprecation notices; difficult to run in local hermetic development/testing containers.

3. **In-Database Append-Only Cryptographic Hash Chain (Merkle / Blockchain-inspired) (Selected)**
   - *Pros*:
     - **Portable**: Implemented in standard PostgreSQL via EF Core with SHA-256 computation in the application service layer or database triggers.
     - **Mathematical Verification**: Each block stores `sequenceNumber`, `timestamp`, `actor`, `action`, `entityId`, `payloadHash`, `previousHash`, and `blockHash`. Block $N$ seals the hash of Block $N-1$.
     - **Tamper Detection**: If any past block is mutated (e.g., an analyst's desk or an approver's sign-off timestamp is modified), the `blockHash` no longer matches the payload, and all subsequent `previousHash` links in the chain fail.
     - **Verification Endpoint**: `GET /api/v1/audit/verify` executes in $O(N)$ linear time, recomputing hashes and pinpointing the exact corrupted block sequence.
   - *Cons*:
     - Concurrency serialization: inserting blocks requires strict sequential ordering (enforced by a database sequence and advisory lock during block insertion).

## Decision

We adopt **Option 3: In-Database Append-Only Cryptographic Hash Chain**. 
The chain begins with a well-known Genesis block whose `previousHash` is 64 zeroes. Every operational event (Run Created, Snapshot Sealed, Worker Completed, Approved) appends a strictly numbered block.

## Chain Verification Formula

For block $i$:
$$\text{payloadHash}_i = \text{SHA256}(\text{CanonicalJSON}(\text{payload}_i))$$
$$\text{blockHash}_i = \text{SHA256}(\text{CanonicalJSON}(\text{sequence}_i \mathbin{\Vert} \text{timestamp}_i \mathbin{\Vert} \text{actor}_i \mathbin{\Vert} \text{action}_i \mathbin{\Vert} \text{entityId}_i \mathbin{\Vert} \text{payloadHash}_i \mathbin{\Vert} \text{blockHash}_{i-1}))$$

Integrity is validated when $\text{previousHash}_i = \text{blockHash}_{i-1}$ for all $i \ge 1$.
