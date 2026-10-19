# REST API Contract Specifications (v1)

Base URL: `/api/v1`  
Error Format: RFC 7807 (`application/problem+json`)

---

## 1. Initiate Report Run

- **Method**: `POST`
- **Path**: `/api/v1/report-runs`
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer <jwt>`
  - `Idempotency-Key: <uuid>` (Optional, client-generated)

### Request Payload
```json
{
  "templateId": "TMPL-LGE-001",
  "templateVersion": "1.2.0",
  "asOfDate": "2026-03-15",
  "idempotencyKey": "9f8c12a4-b043-4e89-9a71-6789abc12345",
  "parameters": {
    "singleNameLimitPct": 25.0,
    "minReportingThresholdUsd": 10000000
  }
}
```

### Response `202 Accepted` or `200 OK` (if idempotent replay)
```json
{
  "id": "RUN-2026-009140",
  "templateId": "TMPL-LGE-001",
  "templateVersion": "1.2.0",
  "templateTitle": "Large Exposure Concentration & Capital Limits",
  "asOfDate": "2026-03-15",
  "idempotencyKey": "9f8c12a4-b043-4e89-9a71-6789abc12345",
  "status": "QUEUED",
  "approvalStatus": "PENDING",
  "createdAt": "2026-03-15T14:00:00.000Z",
  "requester": {
    "userId": "USR-ANALYST-LON",
    "userName": "Elena Rostova",
    "userEmail": "elena.rostova@risk.internal",
    "role": "Analyst",
    "desk": "FX_RATES",
    "region": "EMEA"
  },
  "inputSnapshot": {
    "snapshotId": "SNAP-20260315-9FA1",
    "asOfDate": "2026-03-15",
    "sealedAt": "2026-03-15T14:00:00.120Z",
    "recordCount": 18,
    "totalNotionalUsd": 1940000000,
    "deskFilter": "FX_RATES",
    "regionFilter": "EMEA",
    "contentHashSha256": "8f434346648f6b96df89dda901c5176b10f60766576b498218f0e91f34301acb"
  }
}
```

---

## 2. Get Report Run by ID

- **Method**: `GET`
- **Path**: `/api/v1/report-runs/{id}`
- **Headers**: `Authorization: Bearer <jwt>`

### Response `200 OK`
```json
{
  "id": "RUN-2026-009140",
  "templateId": "TMPL-LGE-001",
  "templateVersion": "1.2.0",
  "status": "COMPLETED",
  "approvalStatus": "PENDING",
  "completedAt": "2026-03-15T14:00:02.450Z",
  "inputSnapshot": {
    "snapshotId": "SNAP-20260315-9FA1",
    "contentHashSha256": "8f434346648f6b96df89dda901c5176b10f60766576b498218f0e91f34301acb"
  },
  "output": {
    "summary": {
      "totalExposuresAnalyzed": 18,
      "grossNotionalUsd": 1940000000,
      "netMarkToMarketUsd": 32400000,
      "aggregatePv01Usd": 315400,
      "aggregateCs01Usd": 218500,
      "topCounterpartyExposureUsd": 520000000,
      "topCounterpartyName": "Helvetia Interbank Reserve SA",
      "regulatoryConcentrationRatioPct": 26.8
    },
    "breakdowns": [
      {
        "groupKey": "Helvetia Interbank Reserve SA",
        "metricName": "Gross Notional & Capital Utilization",
        "value": 520000000,
        "currency": "USD",
        "formattedValue": "$520.0M (26.8% Tier 1)",
        "breachStatus": "BREACH"
      }
    ],
    "outputHashSha256": "a3b1897e68bc91187445763901bcefed12349876abcdef567890123456789abc"
  }
}
```

---

## 3. Approve Report Run (Maker-Checker 4-Eyes Sign-Off)

- **Method**: `POST`
- **Path**: `/api/v1/report-runs/{id}/approve`
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer <jwt>`

### Request Payload
```json
{
  "decision": "APPROVED",
  "comment": "Independent verification complete. Exposure metrics reconcile against collateral balances. Approved for governance review."
}
```

### Response `200 OK`
```json
{
  "id": "RUN-2026-009140",
  "approvalStatus": "APPROVED",
  "approval": {
    "approverId": "USR-APPROVER-NYC",
    "approverName": "Marcus Vance",
    "approverEmail": "marcus.vance@risk.internal",
    "approvedAt": "2026-03-15T15:12:00.000Z",
    "comment": "Independent verification complete. Exposure metrics reconcile against collateral balances. Approved for governance review.",
    "decision": "APPROVED"
  }
}
```

### Error `403 Forbidden` (Maker-Checker Self-Approval Attempt)
```json
{
  "type": "https://reporting-workbench.internal/errors/maker-checker-violation",
  "title": "Maker-Checker Constraint Violation",
  "status": 403,
  "detail": "Separation of Duties (SoD) policy violated: User 'Elena Rostova' originally created report run 'RUN-2026-009140' and is barred from approving their own submission.",
  "instance": "/api/v1/report-runs/RUN-2026-009140/approve",
  "code": "MAKER_CHECKER_SELF_APPROVAL_BARRED"
}
```

---

## 4. Run Diff Comparison

- **Method**: `GET`
- **Path**: `/api/v1/report-runs/{id}/diff?against={comparisonId}`
- **Headers**: `Authorization: Bearer <jwt>`

### Response `200 OK`
```json
{
  "baseRunId": "RUN-2026-008492",
  "comparisonRunId": "RUN-2026-009140",
  "baseAsOfDate": "2026-03-01",
  "comparisonAsOfDate": "2026-03-15",
  "identicalOutputs": false,
  "metricVariances": [
    {
      "metric": "Gross Notional ($)",
      "baseValue": 1820000000,
      "comparisonValue": 1940000000,
      "absoluteDelta": 120000000,
      "percentageDelta": 6.59,
      "isMaterial": true
    }
  ],
  "snapshotDelta": {
    "baseRecordCount": 16,
    "comparisonRecordCount": 18,
    "addedTradesCount": 2,
    "removedTradesCount": 0,
    "commonTradesCount": 16
  }
}
```

---

## 5. Verify Cryptographic Audit Chain Integrity

- **Method**: `GET`
- **Path**: `/api/v1/audit/verify`
- **Headers**: `Authorization: Bearer <jwt>`

### Response `200 OK` (Pristine Chain)
```json
{
  "isValid": true,
  "verifiedBlocks": 24,
  "totalBlocks": 24,
  "verifiedAt": "2026-03-18T20:00:00.000Z",
  "firstBrokenBlockSequence": null
}
```

### Response `200 OK` with `isValid: false` (Tampered Chain Detected)
```json
{
  "isValid": false,
  "verifiedBlocks": 14,
  "totalBlocks": 24,
  "verifiedAt": "2026-03-18T20:00:00.000Z",
  "firstBrokenBlockSequence": 14,
  "expectedHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "actualHash": "9b12a88439128f74220011aefa771234908123445566778899aabbccddeeff00",
  "failureReason": "Cryptographic link broken at block #14. Block #14's previousHash does not match Block #13's blockHash."
}
```
