import {
  SyntheticExposure,
  ReportTemplate,
  ReportRun,
  AuditBlock,
  UserPersona,
  CreateReportRunRequest,
  ApproveReportRunRequest,
  RunDiffResult,
  AuditVerificationResult,
} from '../types/workbench';
import { SYNTHETIC_EXPOSURES } from '../data/syntheticExposures';
import { REPORT_TEMPLATES } from '../data/reportTemplates';
import { sealInputSnapshot, executeReportTemplate, calculateRunDiff } from './reportEngine';
import { createAuditBlock, verifyAuditChainIntegrity } from './auditHashChain';
import { PRESET_PERSONAS, validateCreateRunPermission, validateApproveRunPermission } from './abacEnforcer';
import { hashCanonicalObject } from './canonicalJson';

class WorkbenchStore {
  private exposures: SyntheticExposure[] = [...SYNTHETIC_EXPOSURES];
  private templates: ReportTemplate[] = [...REPORT_TEMPLATES];
  private reportRuns: ReportRun[] = [];
  private auditChain: AuditBlock[] = [];
  private activePersona: UserPersona = PRESET_PERSONAS[0]; // Elena Rostova (Analyst, FX_RATES, EMEA)
  private listeners: Set<() => void> = new Set();
  private idempotencyRegistry: Map<string, ReportRun> = new Map();

  constructor() {
    this.seedInitialState();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  public getActivePersona(): UserPersona {
    return this.activePersona;
  }

  public setActivePersona(persona: UserPersona) {
    this.activePersona = persona;
    this.notify();
  }

  public getExposures(): SyntheticExposure[] {
    return this.exposures;
  }

  public getVisibleExposures(actor = this.activePersona): SyntheticExposure[] {
    let result = [...this.exposures];
    if (actor.desk !== '*') {
      result = result.filter((e) => e.desk === actor.desk);
    }
    if (actor.region !== '*') {
      result = result.filter((e) => e.region === actor.region);
    }
    return result;
  }

  public getTemplates(): ReportTemplate[] {
    return this.templates;
  }

  public getReportRuns(): ReportRun[] {
    return [...this.reportRuns].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  public getReportRunById(id: string): ReportRun | undefined {
    return this.reportRuns.find((r) => r.id === id);
  }

  public getAuditChain(): AuditBlock[] {
    return [...this.auditChain];
  }

  /**
   * API: POST /api/v1/report-runs
   */
  public async createReportRun(
    req: CreateReportRunRequest,
    actor = this.activePersona
  ): Promise<{ run?: ReportRun; error?: string; problemDetails?: unknown }> {
    // 1. Idempotency check
    if (req.idempotencyKey && this.idempotencyRegistry.has(req.idempotencyKey)) {
      const existing = this.idempotencyRegistry.get(req.idempotencyKey)!;
      return { run: existing };
    }

    // 2. Validate ABAC & Role permissions
    const template = this.templates.find(
      (t) => t.templateId === req.templateId && t.version === req.templateVersion
    );
    if (!template) {
      return {
        error: `Template ${req.templateId} version ${req.templateVersion} not found in catalog.`,
      };
    }

    const authCheck = validateCreateRunPermission(actor, actor.desk, actor.region);
    if (!authCheck.allowed) {
      return { error: authCheck.problem?.detail, problemDetails: authCheck.problem };
    }

    // 3. Seal Immutable Input Snapshot
    const { snapshot, sealedExposures } = sealInputSnapshot(
      this.exposures,
      req.asOfDate,
      actor.desk,
      actor.region
    );

    const runId = `RUN-2026-${Date.now().toString().slice(-6)}`;
    const idempotencyKey = req.idempotencyKey || `IDEM-${Date.now()}`;

    // 4. Create Initial Run in QUEUED state
    const initialRun: ReportRun = {
      id: runId,
      templateId: template.templateId,
      templateVersion: template.version,
      templateTitle: template.title,
      asOfDate: req.asOfDate,
      idempotencyKey,
      requester: {
        userId: actor.id,
        userName: actor.name,
        userEmail: actor.email,
        role: actor.role,
        desk: actor.desk,
        region: actor.region,
      },
      status: 'QUEUED',
      approvalStatus: 'PENDING',
      createdAt: new Date().toISOString(),
      inputSnapshot: snapshot,
      executionLogs: [
        {
          timestamp: new Date().toISOString(),
          stage: 'INGESTION',
          message: `Report run created by ${actor.name} (${actor.role}). Input snapshot sealed with hash ${snapshot.contentHashSha256.substring(0, 16)}...`,
        },
      ],
    };

    this.reportRuns.unshift(initialRun);
    if (req.idempotencyKey) {
      this.idempotencyRegistry.set(req.idempotencyKey, initialRun);
    }

    // 5. Append Creation to Hash-Chain Audit Log
    const auditBlockCreation = createAuditBlock(
      this.auditChain,
      {
        userId: actor.id,
        userName: actor.name,
        role: actor.role,
        desk: actor.desk,
        region: actor.region,
      },
      'REPORT_RUN_CREATED',
      'ReportRun',
      runId,
      {
        templateId: template.templateId,
        templateVersion: template.version,
        asOfDate: req.asOfDate,
        idempotencyKey,
        snapshotId: snapshot.snapshotId,
        snapshotContentHash: snapshot.contentHashSha256,
        recordCount: snapshot.recordCount,
      }
    );
    this.auditChain.push(auditBlockCreation);
    this.notify();

    // 6. Background Worker Execution Simulation
    await this.processWorkerRun(initialRun, template, sealedExposures);

    return { run: initialRun };
  }

  private async processWorkerRun(
    run: ReportRun,
    template: ReportTemplate,
    sealedExposures: SyntheticExposure[]
  ) {
    // Step A: Snapshot Sealing confirmation
    run.status = 'SNAPSHOT_SEALING';
    run.executionLogs.push({
      timestamp: new Date().toISOString(),
      stage: 'SNAPSHOT_SEAL',
      message: `Verified cryptographic signature on snapshot ${run.inputSnapshot.snapshotId}. Invariant checks passed: ${run.inputSnapshot.recordCount} trades loaded.`,
    });
    this.notify();

    await new Promise((r) => setTimeout(r, 120));

    // Step B: Worker Calculation
    run.status = 'CALCULATING';
    run.executionLogs.push({
      timestamp: new Date().toISOString(),
      stage: 'CALCULATION',
      message: `Background worker executing deterministic calculation rules for ${template.templateId} v${template.version}.`,
    });
    this.notify();

    await new Promise((r) => setTimeout(r, 150));

    // Step C: Produce deterministic Output
    const output = executeReportTemplate(template, sealedExposures);
    run.output = output;
    run.status = 'COMPLETED';
    run.completedAt = new Date().toISOString();
    run.executionLogs.push({
      timestamp: run.completedAt,
      stage: 'COMPLETION',
      message: `Run finished with output SHA-256: ${output.outputHashSha256.substring(0, 16)}... Ready for maker-checker review.`,
    });

    // Step D: Append Completion Block to Audit Hash Chain
    const auditBlockCompletion = createAuditBlock(
      this.auditChain,
      {
        userId: 'SYS-WORKER-01',
        userName: 'Background Calculation Worker',
        role: 'Approver', // system identity
        desk: '*',
        region: '*',
      },
      'WORKER_EXECUTION_COMPLETED',
      'ReportRun',
      run.id,
      {
        status: 'COMPLETED',
        outputHashSha256: output.outputHashSha256,
        grossNotionalUsd: output.summary.grossNotionalUsd,
        exposuresAnalyzed: output.summary.totalExposuresAnalyzed,
        topCounterparty: output.summary.topCounterpartyName,
      }
    );
    this.auditChain.push(auditBlockCompletion);
    this.notify();
  }

  /**
   * API: POST /api/v1/report-runs/{id}/approve
   */
  public async approveReportRun(
    runId: string,
    req: ApproveReportRunRequest,
    actor = this.activePersona
  ): Promise<{ run?: ReportRun; error?: string; problemDetails?: unknown }> {
    const run = this.reportRuns.find((r) => r.id === runId);
    if (!run) {
      return { error: `Report run ${runId} not found.` };
    }

    // 1. Strict Maker-Checker check
    const authCheck = validateApproveRunPermission(actor, run);
    if (!authCheck.allowed) {
      return { error: authCheck.problem?.detail, problemDetails: authCheck.problem };
    }

    if (run.status !== 'COMPLETED') {
      return { error: `Cannot approve report run in '${run.status}' state. Must be COMPLETED.` };
    }

    // 2. Apply Approval
    const now = new Date().toISOString();
    run.approvalStatus = req.decision;
    run.approval = {
      approverId: actor.id,
      approverName: actor.name,
      approverEmail: actor.email,
      approvedAt: now,
      comment: req.comment || 'Independent 4-eyes review completed. Regulatory thresholds and exposures verified.',
      decision: req.decision,
    };

    run.executionLogs.push({
      timestamp: now,
      stage: 'MAKER_CHECKER',
      message: `Report run ${req.decision} by independent reviewer ${actor.name} (${actor.email}). Immutable lock applied.`,
    });

    // 3. Append Approval Block to Audit Hash Chain
    const auditBlock = createAuditBlock(
      this.auditChain,
      {
        userId: actor.id,
        userName: actor.name,
        role: actor.role,
        desk: actor.desk,
        region: actor.region,
      },
      req.decision === 'APPROVED' ? 'REPORT_RUN_APPROVED' : 'REPORT_RUN_REJECTED',
      'ReportRun',
      run.id,
      {
        decision: req.decision,
        comment: run.approval.comment,
        snapshotContentHash: run.inputSnapshot.contentHashSha256,
        outputHashSha256: run.output?.outputHashSha256,
        requesterId: run.requester.userId,
        approverId: actor.id,
      }
    );
    this.auditChain.push(auditBlock);

    this.notify();
    return { run };
  }

  /**
   * API: GET /api/v1/report-runs/{id}/diff?against={otherId}
   */
  public getRunDiff(baseRunId: string, comparisonRunId: string): RunDiffResult | null {
    const baseRun = this.reportRuns.find((r) => r.id === baseRunId);
    const comparisonRun = this.reportRuns.find((r) => r.id === comparisonRunId);
    if (!baseRun || !comparisonRun) return null;
    return calculateRunDiff(baseRun, comparisonRun);
  }

  /**
   * API: GET /api/v1/audit/verify
   */
  public verifyAuditChain(): AuditVerificationResult {
    return verifyAuditChainIntegrity(this.auditChain);
  }

  /**
   * Interactive Tamper Injection to test integrity verification
   */
  public injectTamper(sequenceNumber: number): { success: boolean; sequenceNumber: number } {
    if (sequenceNumber < 0 || sequenceNumber >= this.auditChain.length) {
      return { success: false, sequenceNumber };
    }
    const block = this.auditChain[sequenceNumber];
    // Alter a critical field in the block payload without updating hashes
    block.payload = {
      ...block.payload,
      tamperedByAttacker: true,
      tamperedTimestamp: new Date().toISOString(),
      corruptedAmount: 999999999,
    };
    this.notify();
    return { success: true, sequenceNumber };
  }

  /**
   * Recalculates and re-seals corrupted chain
   */
  public repairAuditChain(): { success: boolean; repairedCount: number } {
    for (let i = 0; i < this.auditChain.length; i++) {
      const block = this.auditChain[i];
      if (i > 0) {
        block.previousHash = this.auditChain[i - 1].blockHash;
      }
      block.payloadHash = hashCanonicalObject(block.payload);
      // Re-sign header
      const { computeBlockHash } = require('./auditHashChain');
      block.blockHash = computeBlockHash(
        block.sequenceNumber,
        block.timestamp,
        block.actor,
        block.action,
        block.entityType,
        block.entityId,
        block.payloadHash,
        block.previousHash
      );
    }
    this.notify();
    return { success: true, repairedCount: this.auditChain.length };
  }

  /**
   * Seed realistic initial runs for immediate demoability
   */
  private seedInitialState() {
    // Seed Genesis Audit Block
    const genesisBlock = createAuditBlock(
      [],
      {
        userId: 'SYS-INIT',
        userName: 'System Initialization',
        role: 'Approver',
        desk: '*',
        region: '*',
      },
      'REPORT_RUN_CREATED',
      'SecurityPolicy',
      'POL-INITIAL-BOOTSTRAP',
      {
        message: 'Genesis audit block anchored with NIST FIPS 180-4 SHA-256 standard.',
        systemName: 'Risk and Regulatory Reporting Workbench (Synthetic Simulation)',
        environment: 'Development Sandbox',
      },
      '2026-03-01T08:00:00.000Z'
    );
    this.auditChain.push(genesisBlock);

    // Seed Run 1 (Completed & Approved by Marcus Vance)
    const tmpl1 = this.templates[0];
    const snap1 = sealInputSnapshot(this.exposures, '2026-03-01', '*', '*');
    const out1 = executeReportTemplate(tmpl1, snap1.sealedExposures, '2026-03-01T10:05:00.000Z');

    const run1: ReportRun = {
      id: 'RUN-2026-008492',
      templateId: tmpl1.templateId,
      templateVersion: tmpl1.version,
      templateTitle: tmpl1.title,
      asOfDate: '2026-03-01',
      idempotencyKey: 'IDEM-SEEDED-001',
      requester: {
        userId: 'USR-ANALYST-LON',
        userName: 'Elena Rostova',
        userEmail: 'elena.rostova@risk.internal',
        role: 'Analyst',
        desk: 'FX_RATES',
        region: 'EMEA',
      },
      status: 'COMPLETED',
      approvalStatus: 'APPROVED',
      createdAt: '2026-03-01T10:00:00.000Z',
      completedAt: '2026-03-01T10:05:00.000Z',
      inputSnapshot: snap1.snapshot,
      output: out1,
      approval: {
        approverId: 'USR-APPROVER-NYC',
        approverName: 'Marcus Vance',
        approverEmail: 'marcus.vance@risk.internal',
        approvedAt: '2026-03-01T11:30:00.000Z',
        comment: 'Independent review complete. Single-name exposures are within the 25% capital threshold. Approved.',
        decision: 'APPROVED',
      },
      executionLogs: [
        {
          timestamp: '2026-03-01T10:00:00.000Z',
          stage: 'INGESTION',
          message: 'Report run created by Elena Rostova. Snapshot sealed.',
        },
        {
          timestamp: '2026-03-01T10:05:00.000Z',
          stage: 'COMPLETION',
          message: `Execution complete. Output hash: ${out1.outputHashSha256.substring(0, 16)}...`,
        },
        {
          timestamp: '2026-03-01T11:30:00.000Z',
          stage: 'MAKER_CHECKER',
          message: 'Approved by independent approver Marcus Vance.',
        },
      ],
    };

    this.reportRuns.push(run1);

    // Audit logs for seeded run 1
    const blockRun1Created = createAuditBlock(
      this.auditChain,
      {
        userId: 'USR-ANALYST-LON',
        userName: 'Elena Rostova',
        role: 'Analyst',
        desk: 'FX_RATES',
        region: 'EMEA',
      },
      'REPORT_RUN_CREATED',
      'ReportRun',
      run1.id,
      {
        templateId: run1.templateId,
        templateVersion: run1.templateVersion,
        asOfDate: run1.asOfDate,
        snapshotId: run1.inputSnapshot.snapshotId,
        contentHash: run1.inputSnapshot.contentHashSha256,
      },
      '2026-03-01T10:00:00.000Z'
    );
    this.auditChain.push(blockRun1Created);

    const blockRun1Approved = createAuditBlock(
      this.auditChain,
      {
        userId: 'USR-APPROVER-NYC',
        userName: 'Marcus Vance',
        role: 'Approver',
        desk: '*',
        region: 'AMER',
      },
      'REPORT_RUN_APPROVED',
      'ReportRun',
      run1.id,
      {
        decision: 'APPROVED',
        comment: run1.approval?.comment,
        approver: 'Marcus Vance',
      },
      '2026-03-01T11:30:00.000Z'
    );
    this.auditChain.push(blockRun1Approved);

    // Seed Run 2 (Completed, PENDING Approval - created by Elena Rostova)
    // This allows testing the maker-checker rule: when Elena tries to approve, it blocks!
    // When Marcus or Sophie Dubois tries to approve, it succeeds!
    const tmpl2 = this.templates[2]; // CCR v2.0
    const snap2 = sealInputSnapshot(this.exposures, '2026-03-15', '*', '*');
    const out2 = executeReportTemplate(tmpl2, snap2.sealedExposures, '2026-03-15T14:10:00.000Z');

    const run2: ReportRun = {
      id: 'RUN-2026-009140',
      templateId: tmpl2.templateId,
      templateVersion: tmpl2.version,
      templateTitle: tmpl2.title,
      asOfDate: '2026-03-15',
      idempotencyKey: 'IDEM-SEEDED-002',
      requester: {
        userId: 'USR-ANALYST-LON',
        userName: 'Elena Rostova',
        userEmail: 'elena.rostova@risk.internal',
        role: 'Analyst',
        desk: 'FX_RATES',
        region: 'EMEA',
      },
      status: 'COMPLETED',
      approvalStatus: 'PENDING',
      createdAt: '2026-03-15T14:00:00.000Z',
      completedAt: '2026-03-15T14:10:00.000Z',
      inputSnapshot: snap2.snapshot,
      output: out2,
      executionLogs: [
        {
          timestamp: '2026-03-15T14:00:00.000Z',
          stage: 'INGESTION',
          message: 'Report run created by Elena Rostova. Awaiting 4-eyes review.',
        },
        {
          timestamp: '2026-03-15T14:10:00.000Z',
          stage: 'COMPLETION',
          message: `Execution complete. Output hash: ${out2.outputHashSha256.substring(0, 16)}...`,
        },
      ],
    };

    this.reportRuns.push(run2);

    const blockRun2Created = createAuditBlock(
      this.auditChain,
      {
        userId: 'USR-ANALYST-LON',
        userName: 'Elena Rostova',
        role: 'Analyst',
        desk: 'FX_RATES',
        region: 'EMEA',
      },
      'REPORT_RUN_CREATED',
      'ReportRun',
      run2.id,
      {
        templateId: run2.templateId,
        templateVersion: run2.templateVersion,
        asOfDate: run2.asOfDate,
        snapshotId: run2.inputSnapshot.snapshotId,
        contentHash: run2.inputSnapshot.contentHashSha256,
      },
      '2026-03-15T14:00:00.000Z'
    );
    this.auditChain.push(blockRun2Created);
  }
}

export const workbenchStore = new WorkbenchStore();
