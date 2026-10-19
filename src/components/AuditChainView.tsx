import React, { useState } from 'react';
import { AuditBlock, AuditVerificationResult } from '../types/workbench';
import {
  ShieldCheck,
  ShieldAlert,
  Link as LinkIcon,
  Copy,
  Check,
  AlertTriangle,
  RotateCcw,
  Bug,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

interface AuditChainViewProps {
  chain: AuditBlock[];
  onVerifyChain: () => AuditVerificationResult;
  onInjectTamper: (sequenceNumber: number) => { success: boolean };
  onRepairChain: () => { success: boolean; repairedCount: number };
}

export const AuditChainView: React.FC<AuditChainViewProps> = ({
  chain,
  onVerifyChain,
  onInjectTamper,
  onRepairChain,
}) => {
  const [verificationResult, setVerificationResult] = useState<AuditVerificationResult>(() =>
    onVerifyChain()
  );
  const [expandedBlocks, setExpandedBlocks] = useState<Record<number, boolean>>({});
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(text);
    setTimeout(() => setCopiedHash(null), 1800);
  };

  const toggleExpand = (seq: number) => {
    setExpandedBlocks((prev) => ({ ...prev, [seq]: !prev[seq] }));
  };

  const handleVerify = () => {
    const res = onVerifyChain();
    setVerificationResult(res);
    setFeedbackMessage('Chain verification executed against NIST SHA-256 standard.');
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  const handleSimulateTamper = () => {
    const targetSeq = Math.min(1, chain.length - 1);
    onInjectTamper(targetSeq);
    const res = onVerifyChain();
    setVerificationResult(res);
    setFeedbackMessage(`Simulated payload tamper injected into Block #${targetSeq}. Verification immediately detects the breach.`);
  };

  const handleRepair = () => {
    onRepairChain();
    const res = onVerifyChain();
    setVerificationResult(res);
    setFeedbackMessage('Cryptographic hashes recalculated and re-signed across all blocks.');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-slate-900 tracking-tight">Tamper-Evident Audit Hash Chain</h1>
          <p className="text-xs text-slate-500 mt-1">
            Endpoint: <span className="font-mono text-slate-700">GET /api/v1/audit/verify</span>.
            Append-only journal where every block binds the previous block's SHA-256 hash.
            Guarantees mathematical integrity across report creations, snapshot seals, and maker-checker sign-offs.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button
            onClick={handleVerify}
            className="px-3.5 py-1.5 text-xs font-semibold bg-slate-900 text-white rounded hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Verify Chain Integrity
          </button>

          <button
            onClick={handleSimulateTamper}
            className="px-3 py-1.5 text-xs font-medium text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Inject simulated unauthorized modification into block #1 to test detection"
          >
            <Bug className="w-3.5 h-3.5 text-amber-700" />
            Simulate Tamper (Block #1)
          </button>

          <button
            onClick={handleRepair}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Recalculate and re-sign all hashes"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Repair & Re-Sign
          </button>
        </div>
      </div>

      {feedbackMessage && (
        <div className="p-3 bg-slate-100 border border-slate-200 rounded text-xs text-slate-700 font-medium">
          {feedbackMessage}
        </div>
      )}

      {/* Verification Status Card */}
      <div
        className={`border rounded p-4 text-xs ${
          verificationResult.isValid
            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
            : 'bg-rose-50 border-rose-200 text-rose-950'
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            {verificationResult.isValid ? (
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div>
              <div className="font-semibold text-sm">
                {verificationResult.isValid
                  ? 'Cryptographic Chain Valid & Intact (100% Invariant Pass)'
                  : 'Tampering Detected: Cryptographic Hash Link Broken!'}
              </div>
              <div className="mt-1 text-[11px] opacity-90 leading-relaxed">
                {verificationResult.isValid ? (
                  <>
                    All {verificationResult.verifiedBlocks} blocks re-computed and verified against their canonical RFC 8785 payloads.
                    Every block's <code className="font-mono">previousHash</code> matches the preceding block's <code className="font-mono">blockHash</code>.
                  </>
                ) : (
                  <>
                    <strong>Failure Details:</strong> {verificationResult.failureReason}
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="text-right font-mono text-[11px] shrink-0">
            <div>Verified Blocks: {verificationResult.verifiedBlocks} / {verificationResult.totalBlocks}</div>
            <div className="text-slate-500 text-[10px]">Verified At: {verificationResult.verifiedAt.substring(11, 19)} UTC</div>
          </div>
        </div>
      </div>

      {/* Visual Hash Chain */}
      <div className="space-y-4">
        {chain.map((block, idx) => {
          const isBroken =
            !verificationResult.isValid &&
            verificationResult.firstBrokenBlockSequence === block.sequenceNumber;
          const isExpanded = !!expandedBlocks[block.sequenceNumber];

          return (
            <div
              key={block.sequenceNumber}
              className={`bg-white border rounded overflow-hidden transition-all ${
                isBroken ? 'border-rose-400 ring-2 ring-rose-200' : 'border-slate-200'
              }`}
            >
              {/* Block Header Strip */}
              <div className="px-5 py-3.5 bg-slate-50/70 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-slate-900 bg-white border border-slate-200 px-2 py-0.5 rounded shadow-2xs">
                    Block #{block.sequenceNumber}
                  </span>
                  <span className="font-semibold text-slate-800">{block.action}</span>
                  <span className="text-slate-400">·</span>
                  <span className="text-slate-600 font-mono">{block.entityType}: {block.entityId}</span>
                </div>

                <div className="flex items-center gap-4 text-slate-500">
                  <span className="font-mono text-[11px]">{block.timestamp}</span>
                  <span className="text-slate-300">|</span>
                  <span>Actor: <strong className="text-slate-700">{block.actor.userName}</strong> ({block.actor.role})</span>
                  <button
                    onClick={() => toggleExpand(block.sequenceNumber)}
                    className="p-1 hover:bg-slate-200 rounded text-slate-600 cursor-pointer"
                    title="Toggle JSON Payload view"
                  >
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Block Cryptographic Hashes */}
              <div className="p-5 space-y-3 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-[11px]">
                  {/* Previous Hash Link */}
                  <div className="p-3 bg-slate-50 rounded border border-slate-200">
                    <div className="flex items-center justify-between text-slate-500 text-[10px] mb-1">
                      <span className="flex items-center gap-1">
                        <LinkIcon className="w-3 h-3 text-slate-400" />
                        PREVIOUS BLOCK HASH:
                      </span>
                      {block.sequenceNumber === 0 && (
                        <span className="text-slate-400 font-sans italic">Genesis Anchor (0x00)</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-700 truncate mr-2">{block.previousHash}</span>
                      <button
                        onClick={() => handleCopy(block.previousHash)}
                        className="text-slate-400 hover:text-slate-700 cursor-pointer"
                      >
                        {copiedHash === block.previousHash ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Block Hash */}
                  <div className={`p-3 rounded border ${isBroken ? 'bg-rose-50 border-rose-300' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex items-center justify-between text-slate-500 text-[10px] mb-1">
                      <span>THIS BLOCK HEADER HASH:</span>
                      {isBroken && <span className="text-rose-700 font-sans font-bold">LINK BROKEN</span>}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={`truncate mr-2 font-semibold ${isBroken ? 'text-rose-700' : 'text-slate-900'}`}>
                        {block.blockHash}
                      </span>
                      <button
                        onClick={() => handleCopy(block.blockHash)}
                        className="text-slate-400 hover:text-slate-700 cursor-pointer"
                      >
                        {copiedHash === block.blockHash ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Canonical Payload Hash */}
                <div className="flex items-center justify-between font-mono text-[11px] text-slate-500 px-1">
                  <span>Canonical Payload SHA-256: <strong className="text-slate-700">{block.payloadHash}</strong></span>
                  <button
                    onClick={() => toggleExpand(block.sequenceNumber)}
                    className="text-slate-600 hover:text-slate-900 font-sans cursor-pointer underline text-[11px]"
                  >
                    {isExpanded ? 'Hide Payload' : 'View Payload JSON'}
                  </button>
                </div>

                {/* Expanded JSON Payload */}
                {isExpanded && (
                  <div className="pt-2">
                    <pre className="p-3 bg-slate-900 text-slate-100 rounded text-[11px] font-mono overflow-x-auto max-h-48">
                      {JSON.stringify(block.payload, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
