import React, { useState } from 'react';
import { ReportRun, UserPersona, ReportTemplate } from '../types/workbench';
import { CheckCircle2, Clock, AlertTriangle, FileText, Check, Copy, ArrowRight, ShieldAlert, GitCompare } from 'lucide-react';
import { validateApproveRunPermission } from '../services/abacEnforcer';

interface ReportRunsViewProps {
  runs: ReportRun[];
  activePersona: UserPersona;
  templates: ReportTemplate[];
  onOpenNewRunModal: () => void;
  onApproveRun: (runId: string, decision: 'APPROVED' | 'REJECTED', comment: string) => Promise<{ error?: string }>;
  onSelectForDiff: (runId: string) => void;
}

export const ReportRunsView: React.FC<ReportRunsViewProps> = ({
  runs,
  activePersona,
  templates,
  onOpenNewRunModal,
  onApproveRun,
  onSelectForDiff,
}) => {
  const [selectedRun, setSelectedRun] = useState<ReportRun | null>(null);
  const [approvalModalRun, setApprovalModalRun] = useState<ReportRun | null>(null);
  const [approvalComment, setApprovalComment] = useState('');
  const [approvalError, setApprovalError] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<'output' | 'snapshot' | 'logs' | 'maker-checker'>('output');

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(text);
    setTimeout(() => setCopiedHash(null), 1800);
  };

  const handleOpenApprove = (run: ReportRun) => {
    setApprovalModalRun(run);
    setApprovalComment('');
    setApprovalError(null);
  };

  const handleConfirmApproval = async (decision: 'APPROVED' | 'REJECTED') => {
    if (!approvalModalRun) return;
    const res = await onApproveRun(approvalModalRun.id, decision, approvalComment);
    if (res.error) {
      setApprovalError(res.error);
    } else {
      setApprovalModalRun(null);
      // update selectedRun if open
      if (selectedRun?.id === approvalModalRun.id) {
        const updated = runs.find((r) => r.id === approvalModalRun.id);
        if (updated) setSelectedRun(updated);
      }
    }
  };

  // Pre-calculate approval validation for modal
  const approvalValidation = approvalModalRun
    ? validateApproveRunPermission(activePersona, approvalModalRun)
    : { allowed: true };

  return (
    <div className="space-y-6">
      {/* Top Banner / Context */}
      <div className="bg-white border border-slate-200 rounded p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-slate-900 tracking-tight">Report Runs Console</h1>
          <p className="text-xs text-slate-500 mt-1">
            Deterministic reporting pipeline: versioned templates execute against immutable content-addressed snapshots.
            Every run produces an audit block sealed in the cryptographic hash chain.
          </p>
        </div>

        <div className="flex items-center gap-6 text-xs text-slate-600 shrink-0">
          <div>
            <div className="text-slate-400 font-mono text-[11px]">TOTAL RUNS</div>
            <div className="text-base font-semibold text-slate-900 font-mono tabular-nums">{runs.length}</div>
          </div>
          <div className="w-px h-8 bg-slate-200" />
          <div>
            <div className="text-slate-400 font-mono text-[11px]">APPROVED (IMMUTABLE)</div>
            <div className="text-base font-semibold text-emerald-700 font-mono tabular-nums">
              {runs.filter((r) => r.approvalStatus === 'APPROVED').length}
            </div>
          </div>
          <div className="w-px h-8 bg-slate-200" />
          <div>
            <div className="text-slate-400 font-mono text-[11px]">PENDING APPROVAL</div>
            <div className="text-base font-semibold text-amber-700 font-mono tabular-nums">
              {runs.filter((r) => r.approvalStatus === 'PENDING').length}
            </div>
          </div>
        </div>
      </div>

      {/* Main Runs Table */}
      <div className="bg-white border border-slate-200 rounded overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-medium">
                <th className="py-3 px-4 font-mono">Run ID</th>
                <th className="py-3 px-4">Template & Version</th>
                <th className="py-3 px-4">As-Of Date</th>
                <th className="py-3 px-4">Requester</th>
                <th className="py-3 px-4">Worker Status</th>
                <th className="py-3 px-4">Maker-Checker</th>
                <th className="py-3 px-4 font-mono">Snapshot Hash (SHA-256)</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {runs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No report runs recorded yet. Click "New Report Run" to initiate one.
                  </td>
                </tr>
              ) : (
                runs.map((run) => {
                  const isRequester = run.requester.userId === activePersona.id;
                  const canApprove = activePersona.role === 'Approver' && !isRequester && run.approvalStatus === 'PENDING';

                  return (
                    <tr key={run.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Run ID */}
                      <td className="py-3 px-4 font-mono font-medium text-slate-900 whitespace-nowrap">
                        {run.id}
                      </td>

                      {/* Template */}
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800">{run.templateTitle}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {run.templateId} · v{run.templateVersion}
                        </div>
                      </td>

                      {/* As of Date */}
                      <td className="py-3 px-4 font-mono text-slate-700 whitespace-nowrap">
                        {run.asOfDate}
                      </td>

                      {/* Requester */}
                      <td className="py-3 px-4">
                        <div className="text-slate-800">{run.requester.userName}</div>
                        <div className="text-[11px] text-slate-500">
                          {run.requester.role} · {run.requester.desk}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {run.status === 'COMPLETED' ? (
                          <span className="text-slate-700 font-medium flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            Completed
                          </span>
                        ) : run.status === 'CALCULATING' ? (
                          <span className="text-amber-700 font-medium flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 animate-spin" />
                            Calculating...
                          </span>
                        ) : (
                          <span className="text-slate-500 font-medium flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            {run.status}
                          </span>
                        )}
                      </td>

                      {/* Maker-Checker */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {run.approvalStatus === 'APPROVED' ? (
                          <div className="text-emerald-700 font-medium flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Approved · Sealed</span>
                          </div>
                        ) : run.approvalStatus === 'REJECTED' ? (
                          <div className="text-rose-700 font-medium flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                            <span>Rejected</span>
                          </div>
                        ) : (
                          <div className="text-amber-700 font-medium flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            <span>Pending 4-Eyes</span>
                          </div>
                        )}
                      </td>

                      {/* Snapshot Hash */}
                      <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span>{run.inputSnapshot.contentHashSha256.substring(0, 14)}...</span>
                          <button
                            onClick={() => handleCopy(run.inputSnapshot.contentHashSha256)}
                            className="text-slate-400 hover:text-slate-700 cursor-pointer p-0.5"
                            title="Copy full SHA-256 hash"
                          >
                            {copiedHash === run.inputSnapshot.contentHashSha256 ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedRun(run);
                              setActiveDetailTab('output');
                            }}
                            className="px-2.5 py-1 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded font-medium transition-colors cursor-pointer"
                          >
                            Inspect
                          </button>

                          {run.approvalStatus === 'PENDING' && (
                            <button
                              onClick={() => handleOpenApprove(run)}
                              className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                                canApprove
                                  ? 'bg-slate-900 text-white hover:bg-slate-800'
                                  : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                              }`}
                              title={
                                isRequester
                                  ? 'You are the requester. Maker-checker rules forbid self-approval.'
                                  : 'Review and sign off'
                              }
                            >
                              {isRequester ? 'Review (Self)' : 'Approve'}
                            </button>
                          )}

                          <button
                            onClick={() => onSelectForDiff(run.id)}
                            className="p-1 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-100 cursor-pointer"
                            title="Compare with another run in Diff Inspector"
                          >
                            <GitCompare className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Drawer / Modal */}
      {selectedRun && (
        <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold text-slate-900">{selectedRun.id}</span>
                  <span className="text-slate-300">·</span>
                  <span className="text-slate-700 font-medium">{selectedRun.templateTitle}</span>
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  As-Of Date: <strong className="font-mono text-slate-700">{selectedRun.asOfDate}</strong> · Requester: {selectedRun.requester.userName} ({selectedRun.requester.role})
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedRun(null)}
                  className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer text-sm font-semibold"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Tabs */}
            <div className="px-6 border-b border-slate-200 bg-white flex items-center gap-6 text-xs font-medium text-slate-600">
              <button
                onClick={() => setActiveDetailTab('output')}
                className={`py-3 border-b-2 cursor-pointer transition-colors ${
                  activeDetailTab === 'output'
                    ? 'border-slate-900 text-slate-900 font-semibold'
                    : 'border-transparent hover:text-slate-900'
                }`}
              >
                Calculation Output
              </button>
              <button
                onClick={() => setActiveDetailTab('snapshot')}
                className={`py-3 border-b-2 cursor-pointer transition-colors ${
                  activeDetailTab === 'snapshot'
                    ? 'border-slate-900 text-slate-900 font-semibold'
                    : 'border-transparent hover:text-slate-900'
                }`}
              >
                Immutable Snapshot ({selectedRun.inputSnapshot.recordCount} trades)
              </button>
              <button
                onClick={() => setActiveDetailTab('logs')}
                className={`py-3 border-b-2 cursor-pointer transition-colors ${
                  activeDetailTab === 'logs'
                    ? 'border-slate-900 text-slate-900 font-semibold'
                    : 'border-transparent hover:text-slate-900'
                }`}
              >
                Worker Execution Logs ({selectedRun.executionLogs.length})
              </button>
              <button
                onClick={() => setActiveDetailTab('maker-checker')}
                className={`py-3 border-b-2 cursor-pointer transition-colors ${
                  activeDetailTab === 'maker-checker'
                    ? 'border-slate-900 text-slate-900 font-semibold'
                    : 'border-transparent hover:text-slate-900'
                }`}
              >
                Maker-Checker Audit State
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              {activeDetailTab === 'output' && selectedRun.output && (
                <div className="space-y-6">
                  {/* Summary Metric Strip */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="border border-slate-200 rounded p-3 bg-slate-50/50">
                      <div className="text-slate-400 font-mono text-[11px]">GROSS NOTIONAL</div>
                      <div className="text-base font-semibold text-slate-900 font-mono tabular-nums mt-1">
                        ${(selectedRun.output.summary.grossNotionalUsd / 1000000).toLocaleString()}M
                      </div>
                    </div>
                    <div className="border border-slate-200 rounded p-3 bg-slate-50/50">
                      <div className="text-slate-400 font-mono text-[11px]">NET MTM</div>
                      <div className="text-base font-semibold text-slate-900 font-mono tabular-nums mt-1">
                        ${(selectedRun.output.summary.netMarkToMarketUsd / 1000000).toFixed(2)}M
                      </div>
                    </div>
                    <div className="border border-slate-200 rounded p-3 bg-slate-50/50">
                      <div className="text-slate-400 font-mono text-[11px]">AGGREGATE PV01</div>
                      <div className="text-base font-semibold text-slate-900 font-mono tabular-nums mt-1">
                        ${selectedRun.output.summary.aggregatePv01Usd.toLocaleString()}
                      </div>
                    </div>
                    <div className="border border-slate-200 rounded p-3 bg-slate-50/50">
                      <div className="text-slate-400 font-mono text-[11px]">CONCENTRATION RATIO</div>
                      <div className="text-base font-semibold text-slate-900 font-mono tabular-nums mt-1">
                        {selectedRun.output.summary.regulatoryConcentrationRatioPct}%
                      </div>
                      <div className="text-[10px] text-slate-500 truncate">
                        Top: {selectedRun.output.summary.topCounterpartyName}
                      </div>
                    </div>
                  </div>

                  {/* Output Hash Card */}
                  <div className="p-3 bg-slate-50 rounded border border-slate-200 flex items-center justify-between font-mono">
                    <div>
                      <span className="text-slate-500 text-[11px]">OUTPUT CANONICAL SHA-256: </span>
                      <span className="font-semibold text-slate-800">{selectedRun.output.outputHashSha256}</span>
                    </div>
                    <button
                      onClick={() => handleCopy(selectedRun.output!.outputHashSha256)}
                      className="text-slate-500 hover:text-slate-900 cursor-pointer p-1"
                    >
                      {copiedHash === selectedRun.output.outputHashSha256 ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* Breakdown Table */}
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-2">Aggregated Breakdown Rows</h3>
                    <div className="border border-slate-200 rounded overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                          <tr>
                            <th className="py-2.5 px-3">Dimension Key</th>
                            <th className="py-2.5 px-3">Metric Name</th>
                            <th className="py-2.5 px-3 text-right">Value</th>
                            <th className="py-2.5 px-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {selectedRun.output.breakdowns.map((row, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="py-2 px-3 font-medium text-slate-800">{row.groupKey}</td>
                              <td className="py-2 px-3 text-slate-600">{row.metricName}</td>
                              <td className="py-2 px-3 text-right font-mono text-slate-900">{row.formattedValue}</td>
                              <td className="py-2 px-3">
                                {row.breachStatus === 'BREACH' ? (
                                  <span className="text-rose-700 font-semibold">BREACH (&gt;25%)</span>
                                ) : row.breachStatus === 'WARNING' ? (
                                  <span className="text-amber-700 font-medium">WARNING</span>
                                ) : (
                                  <span className="text-slate-500">NORMAL</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {activeDetailTab === 'snapshot' && (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 rounded border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Snapshot Identifier:</span>
                      <span className="font-mono font-medium text-slate-900">{selectedRun.inputSnapshot.snapshotId}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">As-Of Date Sealed:</span>
                      <span className="font-mono text-slate-800">{selectedRun.inputSnapshot.asOfDate}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Exposures Included:</span>
                      <span className="font-mono text-slate-800">{selectedRun.inputSnapshot.recordCount} trades</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Total Filtered Notional:</span>
                      <span className="font-mono text-slate-800">
                        ${(selectedRun.inputSnapshot.totalNotionalUsd / 1000000).toLocaleString()}M USD
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                      <span className="text-slate-500">RFC 8785 Canonical SHA-256:</span>
                      <span className="font-mono font-semibold text-slate-900 text-[11px] truncate max-w-md">
                        {selectedRun.inputSnapshot.contentHashSha256}
                      </span>
                    </div>
                  </div>

                  <p className="text-slate-500 text-[11px]">
                    This snapshot was sealed at run initiation and stored as a content-addressed immutable artifact.
                    Any subsequent amendments or trade bookings do not alter this snapshot.
                  </p>
                </div>
              )}

              {activeDetailTab === 'logs' && (
                <div className="border border-slate-200 rounded divide-y divide-slate-100 font-mono text-[11px]">
                  {selectedRun.executionLogs.map((log, i) => (
                    <div key={i} className="p-3 flex items-start gap-4 hover:bg-slate-50">
                      <span className="text-slate-400 shrink-0">{log.timestamp}</span>
                      <span className="text-slate-700 font-semibold w-24 shrink-0">{log.stage}</span>
                      <span className="text-slate-900 flex-1">{log.message}</span>
                    </div>
                  ))}
                </div>
              )}

              {activeDetailTab === 'maker-checker' && (
                <div className="space-y-4">
                  <div className="border border-slate-200 rounded p-4 bg-slate-50 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Maker (Initiator):</span>
                      <span className="font-medium text-slate-900">
                        {selectedRun.requester.userName} ({selectedRun.requester.role} · {selectedRun.requester.desk})
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Approval Status:</span>
                      <span className="font-semibold text-slate-900">{selectedRun.approvalStatus}</span>
                    </div>
                    {selectedRun.approval && (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Independent Checker (Approver):</span>
                          <span className="font-medium text-slate-900">{selectedRun.approval.approverName}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Timestamp:</span>
                          <span className="font-mono text-slate-700">{selectedRun.approval.approvedAt}</span>
                        </div>
                        <div className="pt-2 border-t border-slate-200">
                          <span className="text-slate-500 block mb-1">Approver Review Note:</span>
                          <p className="text-slate-800 italic bg-white p-2.5 rounded border border-slate-200">
                            "{selectedRun.approval.comment}"
                          </p>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="p-3 bg-slate-100 rounded text-slate-600 text-[11px] leading-relaxed">
                    <strong>Separation of Duties (SoD) Invariant:</strong> Under our risk governance framework,
                    the analyst who executes a report run cannot approve their own run. Once approved, the run status
                    becomes permanently immutable and locked against modifications.
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="text-[11px] text-slate-500">
                Idempotency Key: <span className="font-mono">{selectedRun.idempotencyKey}</span>
              </div>
              <button
                onClick={() => setSelectedRun(null)}
                className="px-4 py-1.5 bg-slate-900 text-white font-medium rounded hover:bg-slate-800 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Maker-Checker Approval Modal */}
      {approvalModalRun && (
        <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900 text-sm">Maker-Checker 4-Eyes Review</h2>
              <button
                onClick={() => setApprovalModalRun(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <span className="text-slate-500 block">Report Run:</span>
                <span className="font-mono font-semibold text-slate-900">{approvalModalRun.id}</span>
                <span className="text-slate-700 block mt-0.5">{approvalModalRun.templateTitle}</span>
              </div>

              <div className="p-3 bg-slate-50 rounded border border-slate-200 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Maker (Initiated By):</span>
                  <span className="font-semibold text-slate-800">{approvalModalRun.requester.userName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Active Identity (You):</span>
                  <span className="font-semibold text-slate-800">
                    {activePersona.name} ({activePersona.role})
                  </span>
                </div>
              </div>

              {/* Maker-Checker Block Warning if violating */}
              {!approvalValidation.allowed && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded text-rose-800 space-y-1.5">
                  <div className="font-semibold flex items-center gap-1.5 text-rose-900">
                    <ShieldAlert className="w-4 h-4 text-rose-600" />
                    <span>{approvalValidation.problem?.title || 'Policy Constraint Violation'}</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">{approvalValidation.problem?.detail}</p>
                  <p className="text-[10px] font-mono text-rose-600 pt-1">
                    HTTP 403 Forbidden · Code: {approvalValidation.problem?.code}
                  </p>
                </div>
              )}

              {approvalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded text-rose-800 text-[11px]">
                  {approvalError}
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  Independent Verification Comments (Required for Audit Trail):
                </label>
                <textarea
                  value={approvalComment}
                  onChange={(e) => setApprovalComment(e.target.value)}
                  placeholder="e.g. Verified counterparty notional against custody records. Collateral valuation haircuts confirmed."
                  className="w-full border border-slate-300 rounded p-2.5 text-xs text-slate-800 focus:outline-slate-900 h-24"
                  disabled={!approvalValidation.allowed}
                />
              </div>
            </div>

            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
              <button
                onClick={() => setApprovalModalRun(null)}
                className="px-3.5 py-1.5 text-slate-600 hover:text-slate-900 font-medium cursor-pointer"
              >
                Cancel
              </button>

              <button
                onClick={() => handleConfirmApproval('REJECTED')}
                disabled={!approvalValidation.allowed}
                className="px-3.5 py-1.5 text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 font-medium rounded cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Reject Run
              </button>

              <button
                onClick={() => handleConfirmApproval('APPROVED')}
                disabled={!approvalValidation.allowed}
                className="px-4 py-1.5 bg-slate-900 text-white font-semibold rounded hover:bg-slate-800 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Approve & Seal Run
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
