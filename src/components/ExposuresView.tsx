import React, { useState } from 'react';
import { SyntheticExposure, UserPersona, Desk, Region } from '../types/workbench';
import { Search, Filter, ShieldCheck, Download } from 'lucide-react';

interface ExposuresViewProps {
  exposures: SyntheticExposure[];
  activePersona: UserPersona;
}

export const ExposuresView: React.FC<ExposuresViewProps> = ({ exposures, activePersona }) => {
  const [search, setSearch] = useState('');
  const [selectedDesk, setSelectedDesk] = useState<string>('ALL');
  const [selectedRegion, setSelectedRegion] = useState<string>('ALL');
  const [enforceAbac, setEnforceAbac] = useState(true);

  // Apply ABAC filter if enabled
  let visibleExposures = [...exposures];
  if (enforceAbac) {
    if (activePersona.desk !== '*') {
      visibleExposures = visibleExposures.filter((e) => e.desk === activePersona.desk);
    }
    if (activePersona.region !== '*') {
      visibleExposures = visibleExposures.filter((e) => e.region === activePersona.region);
    }
  }

  // Apply UI filters
  if (selectedDesk !== 'ALL') {
    visibleExposures = visibleExposures.filter((e) => e.desk === selectedDesk);
  }
  if (selectedRegion !== 'ALL') {
    visibleExposures = visibleExposures.filter((e) => e.region === selectedRegion);
  }
  if (search.trim()) {
    const q = search.toLowerCase();
    visibleExposures = visibleExposures.filter(
      (e) =>
        e.tradeId.toLowerCase().includes(q) ||
        e.counterpartyName.toLowerCase().includes(q) ||
        e.counterpartyLei.toLowerCase().includes(q)
    );
  }

  const totalNotional = visibleExposures.reduce((s, e) => s + e.notionalUsd, 0);
  const totalPv01 = visibleExposures.reduce((s, e) => s + e.pv01Usd, 0);
  const totalCs01 = visibleExposures.reduce((s, e) => s + e.cs01Usd, 0);

  const handleExportCsv = () => {
    const headers = 'TradeId,Counterparty,LEI,Rating,AssetClass,Desk,Region,NotionalUSD,MtMUSD,PV01,CS01,Maturity\n';
    const rows = visibleExposures
      .map(
        (e) =>
          `${e.tradeId},"${e.counterpartyName}",${e.counterpartyLei},${e.counterpartyRating},${e.assetClass},${e.desk},${e.region},${e.notionalUsd},${e.markToMarketUsd},${e.pv01Usd},${e.cs01Usd},${e.maturityDate}`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `synthetic_exposures_${Date.now()}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-white border border-slate-200 rounded p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-slate-900 tracking-tight">Synthetic Trade & Exposure Catalog</h1>
          <p className="text-xs text-slate-500 mt-1">
            Purely synthetic positions used for deterministic snapshot sealing and regulatory calculations.
            Server-side ABAC rules automatically filter visible exposures based on your active desk and region.
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded transition-colors flex items-center gap-1.5 cursor-pointer self-start md:self-auto shrink-0"
        >
          <Download className="w-3.5 h-3.5" />
          Export Slice CSV
        </button>
      </div>

      {/* ABAC Status Pill / Bar */}
      <div className="bg-slate-50 border border-slate-200 rounded p-3 text-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-slate-700" />
          <span className="text-slate-600">Active ABAC Scope:</span>
          <span className="font-semibold text-slate-900">
            {activePersona.name} ({activePersona.role})
          </span>
          <span className="text-slate-300">|</span>
          <span className="text-slate-600 font-mono">Desk: {activePersona.desk}</span>
          <span className="text-slate-300">·</span>
          <span className="text-slate-600">Region: {activePersona.region}</span>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-slate-700 cursor-pointer text-xs">
            <input
              type="checkbox"
              checked={enforceAbac}
              onChange={(e) => setEnforceAbac(e.target.checked)}
              className="rounded border-slate-300 text-slate-900 focus:ring-0"
            />
            <span>Enforce Server-Side ABAC Filter</span>
          </label>
        </div>
      </div>

      {/* Aggregate Metrics Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded p-3">
          <div className="text-slate-400 font-mono text-[11px]">VISIBLE TRADES</div>
          <div className="text-base font-semibold text-slate-900 font-mono tabular-nums mt-1">
            {visibleExposures.length} / {exposures.length}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded p-3">
          <div className="text-slate-400 font-mono text-[11px]">TOTAL NOTIONAL</div>
          <div className="text-base font-semibold text-slate-900 font-mono tabular-nums mt-1">
            ${(totalNotional / 1000000).toLocaleString()}M USD
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded p-3">
          <div className="text-slate-400 font-mono text-[11px]">AGGREGATE PV01</div>
          <div className="text-base font-semibold text-slate-900 font-mono tabular-nums mt-1">
            ${totalPv01.toLocaleString()}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded p-3">
          <div className="text-slate-400 font-mono text-[11px]">AGGREGATE CS01</div>
          <div className="text-base font-semibold text-slate-900 font-mono tabular-nums mt-1">
            ${totalCs01.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded p-3.5 flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative w-full md:w-80">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Counterparty or Trade ID..."
            className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded text-xs text-slate-800 bg-white"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={selectedDesk}
            onChange={(e) => setSelectedDesk(e.target.value)}
            className="border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-800 bg-white"
          >
            <option value="ALL">All Desks</option>
            <option value="FX_RATES">FX_RATES</option>
            <option value="CREDIT_HY">CREDIT_HY</option>
            <option value="COMMODITIES">COMMODITIES</option>
            <option value="EQUITIES_DERIV">EQUITIES_DERIV</option>
          </select>

          <select
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            className="border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-800 bg-white"
          >
            <option value="ALL">All Regions</option>
            <option value="EMEA">EMEA</option>
            <option value="AMER">AMER</option>
            <option value="APAC">APAC</option>
          </select>
        </div>
      </div>

      {/* Exposures Table */}
      <div className="bg-white border border-slate-200 rounded overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                <th className="py-2.5 px-3 font-mono">Trade ID</th>
                <th className="py-2.5 px-3">Counterparty</th>
                <th className="py-2.5 px-3 font-mono">Rating</th>
                <th className="py-2.5 px-3">Desk / Region</th>
                <th className="py-2.5 px-3">Asset Class</th>
                <th className="py-2.5 px-3 text-right font-mono">Notional ($M)</th>
                <th className="py-2.5 px-3 text-right font-mono">MtM ($M)</th>
                <th className="py-2.5 px-3 text-right font-mono">PV01</th>
                <th className="py-2.5 px-3 text-right font-mono">CS01</th>
                <th className="py-2.5 px-3 font-mono">Maturity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {visibleExposures.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-slate-400 font-sans">
                    No exposures match the active ABAC scope and filters.
                  </td>
                </tr>
              ) : (
                visibleExposures.map((exp) => (
                  <tr key={exp.tradeId} className="hover:bg-slate-50/60 font-mono">
                    <td className="py-2 px-3 font-medium text-slate-900">{exp.tradeId}</td>
                    <td className="py-2 px-3 font-sans">
                      <div className="font-medium text-slate-800">{exp.counterpartyName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{exp.counterpartyLei}</div>
                    </td>
                    <td className="py-2 px-3">
                      <span className="font-semibold text-slate-700">{exp.counterpartyRating}</span>
                    </td>
                    <td className="py-2 px-3 font-sans">
                      <span className="text-slate-700 font-mono text-[11px]">{exp.desk}</span>
                      <span className="text-slate-400 mx-1">·</span>
                      <span className="text-slate-500">{exp.region}</span>
                    </td>
                    <td className="py-2 px-3 font-sans text-slate-600">{exp.assetClass}</td>
                    <td className="py-2 px-3 text-right text-slate-900 font-semibold tabular-nums">
                      ${(exp.notionalUsd / 1000000).toFixed(1)}M
                    </td>
                    <td
                      className={`py-2 px-3 text-right tabular-nums ${
                        exp.markToMarketUsd >= 0 ? 'text-slate-800' : 'text-slate-500'
                      }`}
                    >
                      ${(exp.markToMarketUsd / 1000000).toFixed(2)}M
                    </td>
                    <td className="py-2 px-3 text-right text-slate-700 tabular-nums">
                      ${exp.pv01Usd.toLocaleString()}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-700 tabular-nums">
                      ${exp.cs01Usd.toLocaleString()}
                    </td>
                    <td className="py-2 px-3 text-slate-500">{exp.maturityDate}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
