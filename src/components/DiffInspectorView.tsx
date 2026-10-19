import React, { useState } from 'react';
import { ReportRun, RunDiffResult } from '../types/workbench';
import { calculateRunDiff } from '../services/reportEngine';
import { CheckCircle2, AlertTriangle, ArrowRight, GitCompare, Minus, Plus } from 'lucide-react';

interface DiffInspectorViewProps {
  runs: ReportRun[];
  initialBaseRunId?: string;
}

export const DiffInspectorView: React.FC<DiffInspectorViewProps> = ({ runs, initialBaseRunId }) => {
  const [baseRunId, setBaseRunId] = useState<string>(
    initialBaseRunId || runs[1]?.id || runs[0]?.id || ''
  );
  const [comparisonRunId, setComparisonRunId] = useState<string>(
    runs[0]?.id || runs[1]?.id || ''
  );

  const baseRun = runs.find((r) => r.id === baseRunId);
  const compRun = runs.find((r) => r.id === comparisonRunId);

  const diffResult: RunDiffResult | null =
    baseRun && compRun ? calculateRunDiff(baseRun, compRun) : null;

  return (
    <div className="space-y-6">
      {/* Title card */}
      <div className="bg-white border border-slate-200 rounded p-5">
        <h1 className="text-lg font-semibold text-slate-900 tracking-tight">Report Run Diff & Variance Inspector</h1>
        <p className="text-xs text-slate-500 mt-1">
          Endpoint: <span className="font-mono text-slate-700">GET /api/v1/report-runs/{'{id}'}/diff?against={'{comparisonId}'}</span>.
          Calculates variances in gross notional, sensitivities, and input snapshot trade additions or omissions.
        </p>
      </div>

      {/* Run Selection Bar */}
      <div className="bg-white border border-slate-200 rounded p-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div>
          <label className="block text-slate-600 font-medium mb-1">Baseline Run (Base)</label>
          <select
            value={baseRunId}
            onChange={(e) => setBaseRunId(e.target.value)}
            className="w-full border border-slate-300 rounded p-2 text-xs font-mono text-slate-900 bg-white"
          >
            {runs.map((r) => (
              <option key={r.id} value={r.id}>
                {r.id} · {r.templateTitle} · As-Of {r.asOfDate} ({r.approvalStatus})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-slate-600 font-medium mb-1">Comparison Run (Target)</label>
          <select
            value={comparisonRunId}
            onChange={(e) => setComparisonRunId(e.target.value)}
            className="w-full border border-slate-300 rounded p-2 text-xs font-mono text-slate-900 bg-white"
          >
            {runs.map((r) => (
              <option key={r.id} value={r.id}>
                {r.id} · {r.templateTitle} · As-Of {r.asOfDate} ({r.approvalStatus})
              </option>
            ))}
          </select>
        </div>
      </div>

      {diffResult && baseRun && compRun ? (
        <div className="space-y-6">
          {/* Identity & Reproducibility Banner */}
          <div
            className={`border rounded p-4 text-xs flex items-center justify-between ${
              diffResult.identicalOutputs
                ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}
          >
            <div className="flex items-center gap-3">
              {diffResult.identicalOutputs ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <GitCompare className="w-5 h-5 text-slate-500 shrink-0" />
              )}
              <div>
                <div className="font-semibold text-sm">
                  {diffResult.identicalOutputs
                    ? 'Outputs Are 100% Byte-Identical'
                    : 'Variance Detected Between Report Runs'}
                </div>
                <div className="text-[11px] mt-0.5 opacity-80 font-mono">
                  Base SHA-256: {baseRun.output?.outputHashSha256.substring(0, 16)}... | Comp SHA-256: {compRun.output?.outputHashSha256.substring(0, 16)}...
                </div>
              </div>
            </div>

            <div className="font-mono text-right text-[11px]">
              <div>As-Of: {diffResult.baseAsOfDate} → {diffResult.comparisonAsOfDate}</div>
              <div>Snapshot Records: {diffResult.snapshotDelta.baseRecordCount} → {diffResult.snapshotDelta.comparisonRecordCount}</div>
            </div>
          </div>

          {/* Metric Variance Grid */}
          <div className="bg-white border border-slate-200 rounded overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 font-semibold text-xs text-slate-800">
              Quantitative Variance Matrix
            </div>
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/50 border-b border-slate-200 text-slate-500 font-medium">
                <tr>
                  <th className="py-2.5 px-4">Metric</th>
                  <th className="py-2.5 px-4 text-right font-mono">Baseline ({baseRun.id})</th>
                  <th className="py-2.5 px-4 text-right font-mono">Comparison ({compRun.id})</th>
                  <th className="py-2.5 px-4 text-right font-mono">Absolute Delta</th>
                  <th className="py-2.5 px-4 text-right font-mono">Percentage Delta</th>
                  <th className="py-2.5 px-4">Materiality</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {diffResult.metricVariances.map((mv, i) => {
                  const isZero = mv.absoluteDelta === 0;
                  const isPositive = mv.absoluteDelta > 0;

                  return (
                    <tr key={i} className="hover:bg-slate-50/60 font-mono">
                      <td className="py-2.5 px-4 font-sans font-medium text-slate-900">{mv.metric}</td>
                      <td className="py-2.5 px-4 text-right text-slate-700 tabular-nums">
                        {mv.baseValue.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 text-right text-slate-700 tabular-nums">
                        {mv.comparisonValue.toLocaleString()}
                      </td>
                      <td
                        className={`py-2.5 px-4 text-right tabular-nums font-semibold ${
                          isZero
                            ? 'text-slate-400'
                            : isPositive
                            ? 'text-slate-900'
                            : 'text-slate-600'
                        }`}
                      >
                        {isZero ? '0' : (isPositive ? `+${mv.absoluteDelta.toLocaleString()}` : mv.absoluteDelta.toLocaleString())}
                      </td>
                      <td
                        className={`py-2.5 px-4 text-right tabular-nums ${
                          isZero
                            ? 'text-slate-400'
                            : mv.isMaterial
                            ? 'text-amber-700 font-bold'
                            : 'text-slate-600'
                        }`}
                      >
                        {isZero ? '0.00%' : (isPositive ? `+${mv.percentageDelta}%` : `${mv.percentageDelta}%`)}
                      </td>
                      <td className="py-2.5 px-4 font-sans">
                        {mv.isMaterial ? (
                          <span className="text-amber-800 font-medium text-[11px] flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            Material (≥5%)
                          </span>
                        ) : isZero ? (
                          <span className="text-slate-400 text-[11px]">Identical</span>
                        ) : (
                          <span className="text-slate-500 text-[11px]">Immaterial</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Snapshot Exposures Delta Summary */}
          <div className="bg-white border border-slate-200 rounded p-4 text-xs space-y-3">
            <h3 className="font-semibold text-slate-900">Input Snapshot Exposure Population Delta</h3>
            <div className="grid grid-cols-3 gap-4 font-mono">
              <div className="p-3 bg-slate-50 rounded border border-slate-200">
                <div className="text-slate-400 text-[11px]">COMMON TRADES</div>
                <div className="text-base font-semibold text-slate-800 mt-1">
                  {diffResult.snapshotDelta.commonTradesCount} trades
                </div>
              </div>
              <div className="p-3 bg-slate-50 rounded border border-slate-200">
                <div className="text-slate-400 text-[11px]">ADDED IN COMPARISON</div>
                <div className="text-base font-semibold text-slate-800 mt-1">
                  +{diffResult.snapshotDelta.addedTradesCount} trades
                </div>
              </div>
              <div className="p-3 bg-slate-50 rounded border border-slate-200">
                <div className="text-slate-400 text-[11px]">OMITTED FROM COMPARISON</div>
                <div className="text-base font-semibold text-slate-800 mt-1">
                  -{diffResult.snapshotDelta.removedTradesCount} trades
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center text-slate-400 bg-white border border-slate-200 rounded text-xs">
          Select two report runs above to compute side-by-side variance analysis.
        </div>
      )}
    </div>
  );
};
