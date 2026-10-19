# ADR-003: Enforcement Point for Attribute-Based Access Control (ABAC)

- **Status**: Accepted
- **Deciders**: Lead Architecture & Enterprise Security
- **Context**: 
  Risk analysts and approvers belong to specific trading desks (e.g. `FX_RATES`, `CREDIT_HY`, `COMMODITIES`, `EQUITIES_DERIV`) and geographical regions (`EMEA`, `AMER`, `APAC`). Regulatory reporting systems must enforce strict Chinese walls and data segregation: an analyst on the EMEA Rates desk must never see or snapshot High Yield Credit trades from the Americas.
  
  We must decide where in the software architecture to enforce this policy.

## Considered Enforcement Points

1. **Client-Side UI Filtering (Frontend)**
   - *Pros*: Simple to code; instant visual feedback.
   - *Cons*: **Critically Insecure**. Any authenticated user can modify API parameters via DevTools/cURL and extract unauthorized exposures or inject them into snapshots.

2. **API Gateway / Reverse Proxy (Envoy / Ocelot / YARP)**
   - *Pros*: Centralized token parsing.
   - *Cons*: Gateway lacks rich domain context; cannot inspect deep business rules (e.g. comparing user token desk claim against individual exposure row attributes without re-querying the database).

3. **Application Service & Repository Query Layer via Global Query Filters / EF Core Interceptors (Selected)**
   - *Pros*:
     - **Defense in Depth**: Even if a controller endpoint receives an unconstrained query, the EF Core repository automatically injects `WHERE desk = @UserDesk AND region = @UserRegion` into generated SQL queries.
     - **Audit Traceability**: Unauthorized parameter overrides (e.g. requesting `CREDIT_HY` when token desk is `FX_RATES`) trigger explicit 403 Forbidden responses with RFC 7807 Problem Details and log an audit security event.
     - **Immutable Snapshot Guarantee**: When a snapshot is sealed, the query generating the slice strictly binds to the authenticated user's claims extracted from the verified OIDC JWT token.
   - *Cons*:
     - Requires passing `IUserContext` or `ClaimsPrincipal` into service layer dependencies.

## Decision

We adopt **Option 3: Server-Side Enforcement at the Application Service and Repository Query Layer**.

In ASP.NET Core, this is implemented via:
1. `IAuthorizationHandler` for endpoint route permissions (Role check: Analyst, Approver, Auditor).
2. `IExposureRepository.GetAsOfDateQueryable(userContext)` which mandates that every SQL query on the `Exposures` table applies the user's `Desk` and `Region` predicates unless the user possesses global supervisory scope (`*`).
3. Dedicated validation in `ReportRunService.CreateAsync` that checks whether requested report parameters match the user's attribute boundaries, returning RFC 7807 `403 Forbidden` (`ABAC_DESK_SCOPE_VIOLATION`) if an analyst attempts to run cross-desk aggregations.
