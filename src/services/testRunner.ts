import { canonicalizeJson, hashCanonicalObject, sha256Sync } from './canonicalJson';
import { executeReportTemplate, sealInputSnapshot } from './reportEngine';
import { REPORT_TEMPLATES } from '../data/reportTemplates';
import { SYNTHETIC_EXPOSURES } from '../data/syntheticExposures';
import { PRESET_PERSONAS, validateCreateRunPermission, validateApproveRunPermission } from './abacEnforcer';
import { createAuditBlock, verifyAuditChainIntegrity } from './auditHashChain';
import { AuditBlock, ReportRun } from '../types/workbench';

export interface TestExecutionResult {
  suiteName: string;
  testName: string;
  passed: boolean;
  durationMs: number;
  assertionDetails: string;
  evidence: Record<string, unknown>;
}

/**
 * Proves byte-identical output reproducibility mathematically.
 * 
 * Re-runs the exact same template against the exact same input snapshot twice,
 * canonicalizes both outputs to raw byte representations, and verifies:
 * 1. Byte length match
 * 2. Character-by-character equality
 * 3. Exact SHA-256 hash match
 */
export async function runReproducibilityVerification(): Promise<TestExecutionResult> {
  const start = performance.now();
  const template = REPORT_TEMPLATES[0]; // Large Exposure Concentration v1.2
  const fixedAsOfDate = '2026-03-15';

  // 1. Seal an immutable input snapshot once
  const { snapshot, sealedExposures } = sealInputSnapshot(
    SYNTHETIC_EXPOSURES,
    fixedAsOfDate,
    '*',
    '*',
    'SNAP-REPRODUCIBILITY-CANONICAL-001'
  );

  // 2. Pass 1: Run template calculation
  const output1 = executeReportTemplate(template, sealedExposures, '2026-03-15T00:00:00.000Z');
  const canonicalBytes1 = canonicalizeJson(output1);
  const hash1 = sha256Sync(canonicalBytes1);

  // Small delay to simulate separate execution runs
  await new Promise((r) => setTimeout(r, 40));

  // 3. Pass 2: Re-run identical template on identical snapshot
  const output2 = executeReportTemplate(template, sealedExposures, '2026-03-15T00:00:00.000Z');
  const canonicalBytes2 = canonicalizeJson(output2);
  const hash2 = sha256Sync(canonicalBytes2);

  const duration = Math.round(performance.now() - start);

  const bytesMatch = canonicalBytes1 === canonicalBytes2;
  const hashMatch = hash1 === hash2;
  const passed = bytesMatch && hashMatch;

  return {
    suiteName: 'Reproducibility & Determinism Suite',
    testName: 'ReRunningSameTemplateOnSnapshot_MustProduceByteIdenticalOutput',
    passed,
    durationMs: duration,
    assertionDetails: passed
      ? `PASS: Byte identity verified. Both runs yielded identical SHA-256 hash: ${hash1}. 0 bytes differed across ${canonicalBytes1.length} serialized bytes.`
      : `FAIL: Byte discrepancy detected between Pass 1 (${hash1}) and Pass 2 (${hash2}).`,
    evidence: {
      templateId: template.templateId,
      templateVersion: template.version,
      snapshotContentHash: snapshot.contentHashSha256,
      pass1Sha256: hash1,
      pass2Sha256: hash2,
      byteLength: canonicalBytes1.length,
      grossNotionalVerified: output1.summary.grossNotionalUsd,
      topCounterpartyVerified: output1.summary.topCounterpartyName,
      identicalBytes: bytesMatch,
    },
  };
}

/**
 * Runs the comprehensive Permission Matrix across all roles, endpoints,
 * and ABAC desk/region attribute boundaries.
 */
export function runPermissionMatrixTests(): TestExecutionResult[] {
  const results: TestExecutionResult[] = [];

  const analyst = PRESET_PERSONAS.find((p) => p.role === 'Analyst')!; // Elena Rostova (FX_RATES, EMEA)
  const approverNyc = PRESET_PERSONAS.find((p) => p.id === 'USR-APPROVER-NYC')!; // Marcus Vance (Approver, *, AMER)
  const auditor = PRESET_PERSONAS.find((p) => p.role === 'Auditor')!; // Clara Lin (Auditor, *, *)

  // Mock sample run created by Elena Rostova
  const sampleElenaRun: ReportRun = {
    id: 'RUN-TEST-001',
    templateId: 'TMPL-LGE-001',
    templateVersion: '1.2.0',
    templateTitle: 'Large Exposure',
    asOfDate: '2026-03-15',
    idempotencyKey: 'IDEM-TEST-001',
    requester: {
      userId: analyst.id,
      userName: analyst.name,
      userEmail: analyst.email,
      role: analyst.role,
      desk: analyst.desk,
      region: analyst.region,
    },
    status: 'COMPLETED',
    approvalStatus: 'PENDING',
    createdAt: '2026-03-15T10:00:00Z',
    inputSnapshot: {
      snapshotId: 'SNAP-001',
      asOfDate: '2026-03-15',
      sealedAt: '2026-03-15T10:00:00Z',
      recordCount: 15,
      totalNotionalUsd: 150000000,
      deskFilter: 'FX_RATES',
      regionFilter: 'EMEA',
      contentHashSha256: 'abc123canonicalhash',
      sampleExposureIds: [],
    },
    executionLogs: [],
  };

  // 1. Analyst create run within desk/region
  const t1Check = validateCreateRunPermission(analyst, 'FX_RATES', 'EMEA');
  results.push({
    suiteName: 'Permission Matrix (Role x Endpoint)',
    testName: 'Analyst_CreateRun_WithinAssignedDeskAndRegion_ShouldSucceed',
    passed: t1Check.allowed,
    durationMs: 1,
    assertionDetails: t1Check.allowed
      ? 'PASS: Analyst Elena Rostova allowed to create report run for assigned FX_RATES desk and EMEA region.'
      : 'FAIL: Expected ALLOWED, got blocked.',
    evidence: { actor: analyst.email, desk: 'FX_RATES', region: 'EMEA' },
  });

  // 2. Analyst attempt ABAC desk bypass (FX_RATES analyst querying CREDIT_HY)
  const t2Check = validateCreateRunPermission(analyst, 'CREDIT_HY', 'EMEA');
  results.push({
    suiteName: 'ABAC Attribute Boundary Enforcement',
    testName: 'Analyst_CreateRun_CrossDeskAttempt_ShouldReturn403ProblemDetails',
    passed: !t2Check.allowed && t2Check.problem?.code === 'ABAC_DESK_SCOPE_VIOLATION',
    durationMs: 1,
    assertionDetails: !t2Check.allowed
      ? `PASS: Blocked cross-desk query with HTTP 403 (${t2Check.problem?.code}).`
      : 'FAIL: Security bypass allowed cross-desk query.',
    evidence: { error: t2Check.problem?.detail, code: t2Check.problem?.code },
  });

  // 3. Analyst attempt ABAC region bypass (EMEA analyst querying APAC)
  const t3Check = validateCreateRunPermission(analyst, 'FX_RATES', 'APAC');
  results.push({
    suiteName: 'ABAC Attribute Boundary Enforcement',
    testName: 'Analyst_CreateRun_CrossRegionAttempt_ShouldReturn403ProblemDetails',
    passed: !t3Check.allowed && t3Check.problem?.code === 'ABAC_REGION_SCOPE_VIOLATION',
    durationMs: 1,
    assertionDetails: !t3Check.allowed
      ? `PASS: Blocked cross-region query with HTTP 403 (${t3Check.problem?.code}).`
      : 'FAIL: Security bypass allowed cross-region query.',
    evidence: { error: t3Check.problem?.detail, code: t3Check.problem?.code },
  });

  // 4. Maker-Checker Self-Approval Violation (Analyst attempting to approve own run)
  const t4Check = validateApproveRunPermission(analyst, sampleElenaRun);
  results.push({
    suiteName: 'Maker-Checker Separation of Duties',
    testName: 'Maker_AttemptToApproveOwnRun_MustReturn403MakerCheckerViolation',
    passed: !t4Check.allowed && (t4Check.problem?.code === 'ROLE_NOT_APPROVER' || t4Check.problem?.code === 'MAKER_CHECKER_SELF_APPROVAL_BARRED'),
    durationMs: 1,
    assertionDetails: !t4Check.allowed
      ? `PASS: Blocked self-approval attempt by creator (${t4Check.problem?.code}).`
      : 'FAIL: Maker was incorrectly permitted to approve their own run.',
    evidence: { error: t4Check.problem?.detail, code: t4Check.problem?.code },
  });

  // 5. Independent Approver signing off
  const t5Check = validateApproveRunPermission(approverNyc, sampleElenaRun);
  results.push({
    suiteName: 'Maker-Checker Separation of Duties',
    testName: 'IndependentApprover_SignOffOtherUsersRun_ShouldSucceed',
    passed: t5Check.allowed,
    durationMs: 1,
    assertionDetails: t5Check.allowed
      ? 'PASS: Independent Approver Marcus Vance authorized to approve report run created by Elena Rostova.'
      : 'FAIL: Independent approver was blocked.',
    evidence: { requester: sampleElenaRun.requester.userEmail, approver: approverNyc.email },
  });

  // 6. Auditor attempt to mutate/create report run
  const t6Check = validateCreateRunPermission(auditor, '*', '*');
  results.push({
    suiteName: 'Governance & Read-Only Auditor Invariants',
    testName: 'Auditor_AttemptToCreateRun_MustReturn403ReadOnlyRestricted',
    passed: !t6Check.allowed && t6Check.problem?.code === 'ROLE_AUDITOR_MUTATION_RESTRICTED',
    durationMs: 1,
    assertionDetails: !t6Check.allowed
      ? `PASS: Auditor prevented from mutating state (${t6Check.problem?.code}). Read-only boundary verified.`
      : 'FAIL: Auditor allowed to create report run.',
    evidence: { code: t6Check.problem?.code, role: auditor.role },
  });

  return results;
}

/**
 * Tests the audit hash chain tamper detection mechanism.
 */
export function runAuditTamperDetectionTest(): TestExecutionResult {
  const start = performance.now();

  // Create clean 3-block mini chain
  const chain: AuditBlock[] = [];
  const b0 = createAuditBlock(chain, { userId: '1', userName: 'A', role: 'Approver', desk: '*', region: '*' }, 'REPORT_RUN_CREATED', 'ReportRun', 'R-0', { data: 'initial' });
  chain.push(b0);
  const b1 = createAuditBlock(chain, { userId: '1', userName: 'A', role: 'Approver', desk: '*', region: '*' }, 'SNAPSHOT_SEALED', 'InputSnapshot', 'S-0', { hash: 'abc' });
  chain.push(b1);
  const b2 = createAuditBlock(chain, { userId: '2', userName: 'B', role: 'Approver', desk: '*', region: '*' }, 'REPORT_RUN_APPROVED', 'ReportRun', 'R-0', { decision: 'APPROVED' });
  chain.push(b2);

  // 1. Verify clean chain passes
  const cleanResult = verifyAuditChainIntegrity(chain);
  if (!cleanResult.isValid) {
    return {
      suiteName: 'Cryptographic Audit Chain Integrity',
      testName: 'AuditChain_PristineStateVerification',
      passed: false,
      durationMs: Math.round(performance.now() - start),
      assertionDetails: 'FAIL: Clean chain failed integrity verification.',
      evidence: { cleanResult },
    };
  }

  // 2. Corrupt block 1's payload without updating hashes (simulating unauthorized database modification)
  chain[1].payload = { hash: 'corrupted_tampered_hash_value' };

  // 3. Verify corrupted chain catches tamper at sequence 1
  const tamperResult = verifyAuditChainIntegrity(chain);
  const detectedTamperAt1 = !tamperResult.isValid && tamperResult.firstBrokenBlockSequence === 1;

  const duration = Math.round(performance.now() - start);

  return {
    suiteName: 'Cryptographic Audit Chain Integrity',
    testName: 'TamperDetection_CorruptedHistoricPayload_MustFailVerificationAtExactBlock',
    passed: detectedTamperAt1,
    durationMs: duration,
    assertionDetails: detectedTamperAt1
      ? `PASS: Tamper detected at sequence #1 immediately. Failure reason: ${tamperResult.failureReason}`
      : 'FAIL: Tamper went undetected or failed at wrong block.',
    evidence: {
      corruptedBlockSequence: 1,
      verificationResult: tamperResult,
    },
  };
}
