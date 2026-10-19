import { UserPersona, ReportRun, Desk, Region, Role } from '../types/workbench';

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  code: string;
  metadata?: Record<string, unknown>;
}

export const PRESET_PERSONAS: UserPersona[] = [
  {
    id: 'USR-ANALYST-LON',
    name: 'Elena Rostova',
    email: 'elena.rostova@risk.internal',
    role: 'Analyst',
    desk: 'FX_RATES',
    region: 'EMEA',
    department: 'EMEA Market Risk Analytics',
  },
  {
    id: 'USR-APPROVER-NYC',
    name: 'Marcus Vance',
    email: 'marcus.vance@risk.internal',
    role: 'Approver',
    desk: '*',
    region: 'AMER',
    department: 'Risk Governance & Independent Sign-Off',
  },
  {
    id: 'USR-APPROVER-LON',
    name: 'Sophie Dubois',
    email: 'sophie.dubois@risk.internal',
    role: 'Approver',
    desk: 'FX_RATES',
    region: 'EMEA',
    department: 'European Desk Risk Oversight',
  },
  {
    id: 'USR-AUDITOR-GLB',
    name: 'Clara Lin',
    email: 'clara.lin@audit.internal',
    role: 'Auditor',
    desk: '*',
    region: '*',
    department: 'Group Internal Audit & Model Validation',
  },
];

/**
 * Validates whether the active persona has permission to initiate a report run.
 */
export function validateCreateRunPermission(
  actor: UserPersona,
  requestedDesk?: Desk,
  requestedRegion?: Region
): { allowed: boolean; problem?: ProblemDetails } {
  if (actor.role === 'Auditor') {
    return {
      allowed: false,
      problem: {
        type: 'https://reporting-workbench.internal/errors/insufficient-role',
        title: 'Action Prohibited For Auditor Role',
        status: 403,
        detail: `Users with the 'Auditor' role operate under strict read-only governance and cannot initiate operational report runs.`,
        instance: '/api/v1/report-runs',
        code: 'ROLE_AUDITOR_MUTATION_RESTRICTED',
      },
    };
  }

  // Check ABAC Desk violation
  if (requestedDesk && requestedDesk !== '*' && actor.desk !== '*' && requestedDesk !== actor.desk) {
    return {
      allowed: false,
      problem: {
        type: 'https://reporting-workbench.internal/errors/abac-desk-violation',
        title: 'Attribute-Based Access Denied: Desk Scope Mismatch',
        status: 403,
        detail: `User '${actor.name}' is assigned to desk '${actor.desk}' and cannot snapshot exposures belonging to desk '${requestedDesk}'.`,
        instance: '/api/v1/report-runs',
        code: 'ABAC_DESK_SCOPE_VIOLATION',
        metadata: { userDesk: actor.desk, requestedDesk },
      },
    };
  }

  // Check ABAC Region violation
  if (requestedRegion && requestedRegion !== '*' && actor.region !== '*' && requestedRegion !== actor.region) {
    return {
      allowed: false,
      problem: {
        type: 'https://reporting-workbench.internal/errors/abac-region-violation',
        title: 'Attribute-Based Access Denied: Regional Scope Mismatch',
        status: 403,
        detail: `User '${actor.name}' is restricted to region '${actor.region}' and cannot snapshot exposures in region '${requestedRegion}'.`,
        instance: '/api/v1/report-runs',
        code: 'ABAC_REGION_SCOPE_VIOLATION',
        metadata: { userRegion: actor.region, requestedRegion },
      },
    };
  }

  return { allowed: true };
}

/**
 * Validates Maker-Checker rules for approving a report run.
 * 
 * Invariants:
 * 1. Role must be 'Approver'. (Analysts and Auditors cannot approve).
 * 2. Maker-checker: Requester cannot approve their own run.
 * 3. Idempotency & Immutability: Approved runs cannot be re-approved.
 */
export function validateApproveRunPermission(
  actor: UserPersona,
  run: ReportRun
): { allowed: boolean; problem?: ProblemDetails } {
  // Check Role
  if (actor.role !== 'Approver') {
    return {
      allowed: false,
      problem: {
        type: 'https://reporting-workbench.internal/errors/insufficient-role',
        title: 'Approval Authority Required',
        status: 403,
        detail: `User '${actor.name}' has role '${actor.role}'. Only users with the 'Approver' role can sign off on regulatory report runs.`,
        instance: `/api/v1/report-runs/${run.id}/approve`,
        code: 'ROLE_NOT_APPROVER',
      },
    };
  }

  // Check Maker-Checker Self-Approval Prohibition
  if (run.requester.userId === actor.id) {
    return {
      allowed: false,
      problem: {
        type: 'https://reporting-workbench.internal/errors/maker-checker-violation',
        title: 'Maker-Checker Constraint Violation',
        status: 403,
        detail: `Separation of Duties (SoD) policy violated: User '${actor.name}' (${actor.email}) originally created report run '${run.id}' and is barred from approving their own submission. An independent Approver is required.`,
        instance: `/api/v1/report-runs/${run.id}/approve`,
        code: 'MAKER_CHECKER_SELF_APPROVAL_BARRED',
        metadata: {
          requesterId: run.requester.userId,
          attemptedApproverId: actor.id,
        },
      },
    };
  }

  // Check Immutability
  if (run.approvalStatus === 'APPROVED') {
    return {
      allowed: false,
      problem: {
        type: 'https://reporting-workbench.internal/errors/report-already-immutable',
        title: 'Report Run Already Sealed and Immutable',
        status: 409,
        detail: `Report run '${run.id}' was previously approved by ${run.approval?.approverName} at ${run.approval?.approvedAt}. Approved report runs are cryptographically sealed and immutable.`,
        instance: `/api/v1/report-runs/${run.id}/approve`,
        code: 'REPORT_RUN_IMMUTABLE',
      },
    };
  }

  return { allowed: true };
}
