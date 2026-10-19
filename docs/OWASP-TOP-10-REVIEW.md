# OWASP Top 10 Security Architecture Review

**Target**: Risk and Regulatory Reporting Workbench  
**Assessment Date**: 2026-03  
**Status**: Mitigated & Enforced

---

### A01:2021 – Broken Access Control
- **Risk**: Unauthorized users accessing cross-desk exposures, or report makers approving their own reports (Maker-Checker bypass).
- **Mitigation**:
  1. Server-side ABAC query filtering enforced in `IExposureRepository` via EF Core global filters: `WHERE desk = @UserDesk AND region = @UserRegion`.
  2. Maker-checker invariant enforced: `run.RequesterId != currentUserId`. Attempting self-approval returns `403 Forbidden` (`MAKER_CHECKER_SELF_APPROVAL_BARRED`).
  3. Immutability lock: once status is `APPROVED`, further mutations return `409 Conflict`.
- **Verification**: Tested in `PermissionMatrixTests` with 24 combinations of roles, desks, and endpoints.

---

### A02:2021 – Cryptographic Failures
- **Risk**: Snapshot tampering, weak hash algorithms, or non-deterministic serialization causing audit verification false positives.
- **Mitigation**:
  1. Cryptographic SHA-256 (NIST FIPS 180-4) used exclusively for both snapshot sealing and hash chaining.
  2. RFC 8785 Canonical JSON (JCS) ensures deterministic byte representation regardless of runtime or dictionary key order.
  3. TLS 1.3 enforced for all API traffic; no sensitive keys stored in git repository.

---

### A03:2021 – Injection
- **Risk**: SQL injection in exposure filters or reporting parameters.
- **Mitigation**:
  1. EF Core LINQ with parameterized SQL generation. No raw SQL concatenation (`FromSqlRaw` is prohibited).
  2. Strong typing for report parameters (e.g. `singleNameLimitPct` strictly parsed as `decimal`).

---

### A04:2021 – Insecure Design
- **Risk**: Race conditions during concurrent report run approvals or background worker processing.
- **Mitigation**:
  1. Optimistic concurrency control via `xmin` PostgreSQL row versioning on `ReportRun` entity.
  2. Idempotency keys (`Idempotency-Key` HTTP header) deduplicate background worker executions.
  3. Worker operations follow idempotent transactional state machine: `QUEUED` -> `SNAPSHOT_SEALING` -> `CALCULATING` -> `COMPLETED`.

---

### A05:2021 – Security Misconfiguration
- **Risk**: Permissive CORS headers, stack trace leakage in API responses.
- **Mitigation**:
  1. RFC 7807 Problem Details for all errors; internal exception stack traces stripped in non-development profiles.
  2. Strict CORS policy allowing only authorized origin.

---

### A06:2021 – Vulnerable and Outdated Components
- **Risk**: Compromised third-party packages in NuGet or npm.
- **Mitigation**:
  1. GitHub Actions CI pipeline runs `dotnet list package --vulnerable` and `npm audit --audit-level=high`.
  2. Trivy container scanning configured in `.github/workflows/ci.yml`.

---

### A07:2021 – Identification and Authentication Failures
- **Risk**: Session hijacking, forged user identity.
- **Mitigation**:
  1. OpenID Connect (OIDC) with Keycloak.
  2. Stateless JWT verification using JWKS public keys with RS256 algorithm.
  3. Tokens expire within 15 minutes; refresh token rotation enabled.

---

### A08:2021 – Software and Data Integrity Failures
- **Risk**: Silent corruption of historical regulatory snapshots or audit log rows.
- **Mitigation**:
  1. Immutable input snapshot content hashing: any modified trade invalidates snapshot content hash.
  2. Append-only cryptographic hash chain with previous-hash linkage. Any modified block in the audit table breaks the link to all future blocks.
  3. Public automated endpoint `GET /api/v1/audit/verify` allows auditor real-time integrity verification.

---

### A09:2021 – Security Logging and Monitoring Failures
- **Risk**: Administrative actions performed without traceability.
- **Mitigation**:
  1. Every creation, snapshot seal, worker completion, and approval writes an unalterable block to the hash chain.
  2. OpenTelemetry distributed tracing integrated into ASP.NET Core middleware (`AddOpenTelemetry().WithTracing()`).

---

### A10:2021 – Server-Side Request Forgery (SSRF)
- **Risk**: Reporting templates fetching arbitrary external URLs.
- **Mitigation**:
  1. Reporting templates run entirely against local or sealed snapshot stores.
  2. No outbound HTTP calls permitted within the template calculation worker sandbox.
