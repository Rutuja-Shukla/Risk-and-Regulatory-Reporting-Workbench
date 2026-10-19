import React, { useState } from 'react';
import { ReportTemplate, UserPersona, CreateReportRunRequest } from '../types/workbench';
import { validateCreateRunPermission } from '../services/abacEnforcer';
import { ShieldAlert, Play, CheckCircle } from 'lucide-react';

interface NewRunModalProps {
  isOpen: boolean;
  onClose: () => void;
  templates: ReportTemplate[];
  activePersona: UserPersona;
  onSubmit: (req: CreateReportRunRequest) => Promise<{ error?: string }>;
}

export const NewRunModal: React.FC<NewRunModalProps> = ({
  isOpen,
  onClose,
  templates,
  activePersona,
  onSubmit,
}) => {
  const [selectedTemplateId, setSelectedTemplateId] = useState(templates[0]?.templateId || '');
  const [selectedVersion, setSelectedVersion] = useState(templates[0]?.version || '');
  const [asOfDate, setAsOfDate] = useState('2026-03-15');
  const [idempotencyKey, setIdempotencyKey] = useState(`IDEM-${Date.now().toString().slice(-6)}`);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentTemplate = templates.find(
    (t) => t.templateId === selectedTemplateId && t.version === selectedVersion
  ) || templates[0];

  const authCheck = validateCreateRunPermission(activePersona, activePersona.desk, activePersona.region);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTemplate) return;

    setSubmitting(true);
    setErrorMessage(null);

    const res = await onSubmit({
      templateId: currentTemplate.templateId,
      templateVersion: currentTemplate.version,
      asOfDate,
      idempotencyKey: idempotencyKey.trim() || undefined,
    });

    setSubmitting(false);
    if (res.error) {
      setErrorMessage(res.error);
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl border border-slate-200 w-full max-w-xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-slate-900 text-sm">Initiate Regulatory Report Run</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              POST /api/v1/report-runs · Generates immutable content-addressed input snapshot.
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 cursor-pointer">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Active Identity Scope Card */}
          <div className="p-3 bg-slate-50 rounded border border-slate-200 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Initiating Persona:</span>
              <span className="font-semibold text-slate-900">
                {activePersona.name} ({activePersona.role})
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">ABAC Desk Scope:</span>
              <span className="font-mono text-slate-800">{activePersona.desk}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">ABAC Regional Scope:</span>
              <span className="font-mono text-slate-800">{activePersona.region}</span>
            </div>
          </div>

          {!authCheck.allowed && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded text-rose-800 space-y-1">
              <div className="font-semibold flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                <span>{authCheck.problem?.title}</span>
              </div>
              <p className="text-[11px]">{authCheck.problem?.detail}</p>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded text-rose-800 text-[11px]">
              {errorMessage}
            </div>
          )}

          {/* Template Selector */}
          <div>
            <label className="block text-slate-700 font-medium mb-1">Report Template & Version</label>
            <select
              value={`${currentTemplate?.templateId}#${currentTemplate?.version}`}
              onChange={(e) => {
                const [tid, ver] = e.target.value.split('#');
                setSelectedTemplateId(tid);
                setSelectedVersion(ver);
              }}
              className="w-full border border-slate-300 rounded p-2 text-xs text-slate-900 bg-white"
            >
              {templates.map((tmpl) => (
                <option key={`${tmpl.templateId}-${tmpl.version}`} value={`${tmpl.templateId}#${tmpl.version}`}>
                  {tmpl.title} ({tmpl.templateId} · v{tmpl.version})
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 mt-1">{currentTemplate?.description}</p>
          </div>

          {/* As-Of Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-medium mb-1">Reporting As-Of Date</label>
              <input
                type="date"
                value={asOfDate}
                onChange={(e) => setAsOfDate(e.target.value)}
                className="w-full border border-slate-300 rounded p-2 text-xs font-mono text-slate-900 bg-white"
                required
              />
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Idempotency Key</label>
              <input
                type="text"
                value={idempotencyKey}
                onChange={(e) => setIdempotencyKey(e.target.value)}
                placeholder="IDEM-UUID"
                className="w-full border border-slate-300 rounded p-2 text-xs font-mono text-slate-900 bg-white"
              />
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded border border-slate-200 text-slate-600 text-[11px] leading-relaxed">
            <strong>Worker Invariant:</strong> When submitted, the system captures an immutable snapshot of all exposures matching the as-of date and user's ABAC scope, seals it with an RFC 8785 SHA-256 hash, and queues it to the background worker. Re-submitting with the same idempotency key safely returns the existing run.
          </div>

          {/* Footer */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-slate-600 hover:text-slate-900 font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!authCheck.allowed || submitting}
              className="px-4 py-1.5 bg-slate-900 text-white font-semibold rounded hover:bg-slate-800 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {submitting ? 'Sealing Snapshot & Queuing...' : 'Seal Snapshot & Execute Run'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
