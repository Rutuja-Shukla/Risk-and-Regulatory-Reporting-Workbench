import React, { useState, useEffect } from 'react';
import { workbenchStore } from './services/workbenchStore';
import { UserPersona, CreateReportRunRequest } from './types/workbench';
import { Navbar, NavTab } from './components/Navbar';
import { PersonaBar } from './components/PersonaBar';
import { ReportRunsView } from './components/ReportRunsView';
import { DiffInspectorView } from './components/DiffInspectorView';
import { AuditChainView } from './components/AuditChainView';
import { ExposuresView } from './components/ExposuresView';
import { ArchitectureDocsView } from './components/ArchitectureDocsView';
import { NewRunModal } from './components/NewRunModal';
import { TestHarnessModal } from './components/TestHarnessModal';

export default function App() {
  const [, setTick] = useState(0);
  const [activeTab, setActiveTab] = useState<NavTab>('runs');
  const [isNewRunModalOpen, setIsNewRunModalOpen] = useState(false);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [diffBaseRunId, setDiffBaseRunId] = useState<string | undefined>(undefined);

  // Subscribe to central store updates
  useEffect(() => {
    const unsubscribe = workbenchStore.subscribe(() => {
      setTick((t) => t + 1);
    });
    return unsubscribe;
  }, []);

  const activePersona = workbenchStore.getActivePersona();
  const runs = workbenchStore.getReportRuns();
  const templates = workbenchStore.getTemplates();
  const auditChain = workbenchStore.getAuditChain();
  const exposures = workbenchStore.getExposures();

  const handleSelectPersona = (persona: UserPersona) => {
    workbenchStore.setActivePersona(persona);
  };

  const handleCreateRun = async (req: CreateReportRunRequest) => {
    const res = await workbenchStore.createReportRun(req);
    return { error: res.error };
  };

  const handleApproveRun = async (runId: string, decision: 'APPROVED' | 'REJECTED', comment: string) => {
    const res = await workbenchStore.approveReportRun(runId, { decision, comment });
    return { error: res.error };
  };

  const handleSelectForDiff = (runId: string) => {
    setDiffBaseRunId(runId);
    setActiveTab('diff');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Bar Navigation */}
      <Navbar
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenNewRunModal={() => setIsNewRunModalOpen(true)}
        onOpenTestModal={() => setIsTestModalOpen(true)}
      />

      {/* Active Persona / Identity Simulation Bar */}
      <PersonaBar
        activePersona={activePersona}
        onSelectPersona={handleSelectPersona}
      />

      {/* Main Viewport Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-6">
        {activeTab === 'runs' && (
          <ReportRunsView
            runs={runs}
            activePersona={activePersona}
            templates={templates}
            onOpenNewRunModal={() => setIsNewRunModalOpen(true)}
            onApproveRun={handleApproveRun}
            onSelectForDiff={handleSelectForDiff}
          />
        )}

        {activeTab === 'diff' && (
          <DiffInspectorView runs={runs} initialBaseRunId={diffBaseRunId} />
        )}

        {activeTab === 'audit' && (
          <AuditChainView
            chain={auditChain}
            onVerifyChain={() => workbenchStore.verifyAuditChain()}
            onInjectTamper={(seq) => workbenchStore.injectTamper(seq)}
            onRepairChain={() => workbenchStore.repairAuditChain()}
          />
        )}

        {activeTab === 'exposures' && (
          <ExposuresView exposures={exposures} activePersona={activePersona} />
        )}

        {activeTab === 'docs' && <ArchitectureDocsView />}
      </main>

      {/* Global Modals */}
      <NewRunModal
        isOpen={isNewRunModalOpen}
        onClose={() => setIsNewRunModalOpen(false)}
        templates={templates}
        activePersona={activePersona}
        onSubmit={handleCreateRun}
      />

      <TestHarnessModal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
      />

      {/* Subtle Utility Footer */}
      <footer className="bg-white border-t border-slate-200 py-3.5 px-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <span>Risk and Regulatory Reporting Workbench</span>
            <span className="mx-2" aria-hidden="true">·</span>
            <span>Simulated System (Synthetic Data Only)</span>
            <span className="mx-2" aria-hidden="true">·</span>
            <span>Not for Production Regulatory Filings</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400 font-mono text-[11px]">
            <span>RFC 8785 JCS</span>
            <span>·</span>
            <span>NIST SHA-256</span>
            <span>·</span>
            <span>OIDC RBAC/ABAC</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
