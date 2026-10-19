# ADR-004: Deterministic Engine & Canonical Serialization for Byte-Identical Reproducibility

- **Status**: Accepted
- **Deciders**: Lead Architecture & Quantitative Risk Engineering
- **Context**: 
  A core regulatory reporting requirement is **reproducibility**: running the same versioned report template on the same sealed input snapshot must produce **byte-identical output** every single time, whether run today or 5 years from now.
  
  Naive implementations fail reproducibility tests due to:
  1. Non-deterministic JSON key ordering (e.g. dictionary hash iteration order varying across runtimes).
  2. Floating-point rounding drift across CPU architectures or JIT compilation passes.
  3. Non-deterministic row ordering in SQL queries without explicit `ORDER BY` tie-breakers.
  4. Dynamic timestamps (e.g. `DateTime.UtcNow`) embedded inside output payload blocks.

## Decision

1. **RFC 8785 JSON Canonicalization (JCS)**:
   All snapshots and calculation output objects are serialized using RFC 8785 rules: keys sorted lexicographically by Unicode code point, whitespace stripped, numbers normalized.
   
2. **Explicit Primary Key Tie-Breakers**:
   All dataset slices and group breakdowns mandate deterministic sorting (e.g. `ORDER BY trade_id ASC` for exposures; alphabetical sorting by counterparty name or rating tier for report breakdowns).

3. **Fixed-Point Decimal & Explicit Rounding**:
   Financial quantities use high-precision decimals (`decimal` in C#) with standardized `MidpointRounding.AwayFromZero` rounded to 2 decimal places before canonical hashing.

4. **Decoupled Execution Metadata**:
   The `outputHashSha256` represents the canonical hash of the pure calculation output (`summary` + `breakdowns`). Volatile execution metadata (worker thread ID, start timestamp, wall-clock duration) is stored in execution logs outside the verified output hash envelope.
