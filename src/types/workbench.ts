/**
 * Risk and Regulatory Reporting Workbench
 * Core Type Definitions & API Contracts
 * 
 * Note: Simulated system with synthetic data only. Not a production regulatory system.
 */

export type Role = 'Analyst' | 'Approver' | 'Auditor';

export type Desk = 'FX_RATES' | 'CREDIT_HY' | 'COMMODITIES' | 'EQUITIES_DERIV' | '*';

export type Region = 'EMEA' | 'AMER' | 'APAC' | '*';

export interface UserPersona {
  id: string;
  name: string;
  email: string;
  role: Role;
  desk: Desk;
  region: Region;
  department: string;
}

export type AssetClass = 'InterestRate' | 'Credit' | 'Commodity' | 'Equity' | 'ForeignExchange';

export interface SyntheticExposure {
  tradeId: string;
  counterpartyId: string;
  counterpartyName: string;
  counterpartyLei: string;
  counterpartyRating: 'AAA' | 'AA' | 'A' | 'BBB' | 'BB' | 'B';
  assetClass: AssetClass;
  desk: Desk;
  region: Region;
  notionalUsd: number;
  markToMarketUsd: number;
  effectiveDurationYears: number;
  maturityDate: string; // YYYY-MM-DD
  tradeDate: string;    // YYYY-MM-DD
  currency: 'USD' | 'EUR' | 'GBP' | 'JPY' | 'CHF';
  cs01Usd: number;      // Credit Spread 1bp sensitivity
  pv01Usd: number;      // Present Value 1bp sensitivity
  collateralUsd: number;
}

export interface ReportTemplateParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date';
  required: boolean;
  defaultValue?: string | number | boolean;
  description: string;
}

export interface ReportTemplate {
  templateId: string;
  version: string;
  title: string;
  description: string;
  regulatoryFrameworkReference: string; // e.g. "Simulated BCBS 283 / Large Exposures Framework (Non-prod simulation)"
  effectiveFrom: string;
  parameters: ReportTemplateParameter[];
  calculationRules: {
    targetMetric: string;
    formula: string;
    aggregation: 'SUM' | 'MAX' | 'WEIGHTED_AVG' | 'PERCENTILE_99';
    groupingKey?: keyof SyntheticExposure;
  }[];
  thresholds?: {
    metric: string;
    warningThreshold: number;
    breachThreshold: number;
  }[];
}

export type RunStatus = 'QUEUED' | 'SNAPSHOT_SEALING' | 'CALCULATING' | 'COMPLETED' | 'FAILED';

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface InputSnapshot {
  snapshotId: string;
  asOfDate: string;
  sealedAt: string;
  recordCount: number;
  totalNotionalUsd: number;
  deskFilter: Desk;
  regionFilter: Region;
  contentHashSha256: string; // SHA-256 of canonical exposure records
  sampleExposureIds: string[];
}

export interface AggregatedMetricRow {
  groupKey: string;
  metricName: string;
  value: number;
  currency: string;
  formattedValue: string;
  breachStatus: 'NORMAL' | 'WARNING' | 'BREACH';
}

export interface ReportOutput {
  summary: {
    totalExposuresAnalyzed: number;
    grossNotionalUsd: number;
    netMarkToMarketUsd: number;
    aggregatePv01Usd: number;
    aggregateCs01Usd: number;
    topCounterpartyExposureUsd: number;
    topCounterpartyName: string;
    regulatoryConcentrationRatioPct: number;
  };
  breakdowns: AggregatedMetricRow[];
  generatedAt: string;
  outputHashSha256: string; // SHA-256 of canonical output payload
}

export interface ReportRun {
  id: string;
  templateId: string;
  templateVersion: string;
  templateTitle: string;
  asOfDate: string;
  idempotencyKey: string;
  requester: {
    userId: string;
    userName: string;
    userEmail: string;
    role: Role;
    desk: Desk;
    region: Region;
  };
  status: RunStatus;
  approvalStatus: ApprovalStatus;
  createdAt: string;
  completedAt?: string;
  inputSnapshot: InputSnapshot;
  output?: ReportOutput;
  approval?: {
    approverId: string;
    approverName: string;
    approverEmail: string;
    approvedAt: string;
    comment: string;
    decision: 'APPROVED' | 'REJECTED';
  };
  executionLogs: {
    timestamp: string;
    stage: string;
    message: string;
  }[];
  errorMessage?: string;
}

export interface AuditBlock {
  sequenceNumber: number;
  timestamp: string;
  actor: {
    userId: string;
    userName: string;
    role: Role;
    desk: Desk;
    region: Region;
  };
  action:
    | 'REPORT_RUN_CREATED'
    | 'SNAPSHOT_SEALED'
    | 'WORKER_CALCULATION_STARTED'
    | 'WORKER_EXECUTION_COMPLETED'
    | 'REPORT_RUN_APPROVED'
    | 'REPORT_RUN_REJECTED'
    | 'TAMPER_INJECTED'
    | 'AUDIT_CHAIN_REPAIRED';
  entityType: 'ReportRun' | 'InputSnapshot' | 'AuditChain' | 'SecurityPolicy';
  entityId: string;
  payload: Record<string, unknown>;
  payloadHash: string; // SHA-256 of canonical JSON payload
  previousHash: string; // SHA-256 of previous block
  blockHash: string; // SHA-256(sequence + timestamp + actor + action + entity + payloadHash + previousHash)
}

export interface AuditVerificationResult {
  isValid: boolean;
  verifiedBlocks: number;
  totalBlocks: number;
  verifiedAt: string;
  firstBrokenBlockSequence: number | null;
  expectedHash?: string;
  actualHash?: string;
  failureReason?: string;
}

export interface RunDiffResult {
  baseRunId: string;
  comparisonRunId: string;
  baseAsOfDate: string;
  comparisonAsOfDate: string;
  metricVariances: {
    metric: string;
    baseValue: number;
    comparisonValue: number;
    absoluteDelta: number;
    percentageDelta: number;
    isMaterial: boolean;
  }[];
  snapshotDelta: {
    baseRecordCount: number;
    comparisonRecordCount: number;
    addedTradesCount: number;
    removedTradesCount: number;
    commonTradesCount: number;
    addedTradeIds: string[];
    removedTradeIds: string[];
  };
  identicalOutputs: boolean;
}

export interface CreateReportRunRequest {
  templateId: string;
  templateVersion: string;
  asOfDate: string;
  idempotencyKey?: string;
  parameters?: Record<string, unknown>;
}

export interface ApproveReportRunRequest {
  decision: 'APPROVED' | 'REJECTED';
  comment: string;
}
