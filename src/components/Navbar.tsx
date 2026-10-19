import React from 'react';
import { PlayCircle, Plus } from 'lucide-react';

export type NavTab = 'runs' | 'diff' | 'audit' | 'exposures' | 'templates' | 'docs';

interface NavbarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onOpenNewRunModal: () => void;
  onOpenTestModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  onOpenNewRunModal,
  onOpenTestModal,
}) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-6 py-3.5 flex items-center justify-between gap-8">
        {/* Zone 1: Brand wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => onTabChange('runs')}
            className="text-base font-semibold tracking-tight text-slate-900 hover:text-slate-700 text-left cursor-pointer"
          >
            Risk & Regulatory Reporting Workbench
          </button>
        </div>

        {/* Zone 2: 5 single-line clean navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          <button
            onClick={() => onTabChange('runs')}
            className={`whitespace-nowrap cursor-pointer transition-colors pb-0.5 border-b-2 ${
              activeTab === 'runs'
                ? 'text-slate-900 border-slate-900 font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            Report Runs
          </button>

          <button
            onClick={() => onTabChange('diff')}
            className={`whitespace-nowrap cursor-pointer transition-colors pb-0.5 border-b-2 ${
              activeTab === 'diff'
                ? 'text-slate-900 border-slate-900 font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            Diff Inspector
          </button>

          <button
            onClick={() => onTabChange('audit')}
            className={`whitespace-nowrap cursor-pointer transition-colors pb-0.5 border-b-2 ${
              activeTab === 'audit'
                ? 'text-slate-900 border-slate-900 font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            Audit Hash Chain
          </button>

          <button
            onClick={() => onTabChange('exposures')}
            className={`whitespace-nowrap cursor-pointer transition-colors pb-0.5 border-b-2 ${
              activeTab === 'exposures'
                ? 'text-slate-900 border-slate-900 font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            Synthetic Exposures
          </button>

          <button
            onClick={() => onTabChange('docs')}
            className={`whitespace-nowrap cursor-pointer transition-colors pb-0.5 border-b-2 ${
              activeTab === 'docs'
                ? 'text-slate-900 border-slate-900 font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            Architecture & ADRs
          </button>
        </nav>

        {/* Zone 3: Primary actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={onOpenTestModal}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 transition-colors cursor-pointer whitespace-nowrap"
            title="Run automated test suite: Reproducibility, Permission Matrix, Audit Integrity"
          >
            <PlayCircle className="w-3.5 h-3.5 text-slate-600" />
            <span>Test Harness</span>
          </button>

          <button
            onClick={onOpenNewRunModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded transition-colors cursor-pointer whitespace-nowrap shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Report Run</span>
          </button>
        </div>
      </div>
    </header>
  );
};
