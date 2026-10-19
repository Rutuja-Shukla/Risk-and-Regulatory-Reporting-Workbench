import {
  SyntheticExposure,
  ReportTemplate,
  InputSnapshot,
  ReportOutput,
  AggregatedMetricRow,
  RunDiffResult,
  ReportRun,
  Desk,
  Region,
} from '../types/workbench';
import { canonicalizeJson, hashCanonicalObject, sha256Sync } from './canonicalJson';

/**
 * Seals an immutable input snapshot from raw exposures as of a target date and ABAC filter.
 * 
 * Invariants:
 * 1. Filter: tradeDate <= asOfDate.
 * 2. Desk and Region ABAC filtering applied.
 * 3. Exposures sorted deterministically by tradeId ascending.
 * 4. Content hash is SHA-256 of canonical RFC 8785 serialized exposure array.
 */
export function sealInputSnapshot(
  allExposures: SyntheticExposure[],
  asOfDate: string,
  deskFilter: Desk,
  regionFilter: Region,
  snapshotId = `SNAP-${asOfDate.replace(/-/g, '')}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`
): { snapshot: InputSnapshot; sealedExposures: SyntheticExposure[] } {
  // Filter by asOfDate
  let filtered = allExposures.filter((exp) => exp.tradeDate <= asOfDate);

  // Apply ABAC Desk filter
  if (deskFilter !== '*') {
    filtered = filtered.filter((exp) => exp.desk === deskFilter);
  }

  // Apply ABAC Region filter
  if (regionFilter !== '*') {
    filtered = filtered.filter((exp) => exp.region === regionFilter);
  }

  // Strict deterministic ordering by primary key tradeId
  const sortedExposures = [...filtered].sort((a, b) => a.tradeId.localeCompare(b.tradeId));

  // Compute canonical content hash
  const canonicalExposureBytes = canonicalizeJson(sortedExposures);
  const contentHashSha256 = sha256Sync(canonicalExposureBytes);

  const totalNotionalUsd = sortedExposures.reduce((acc, curr) => acc + curr.notionalUsd, 0);

  const snapshot: InputSnapshot = {
    snapshotId,
    asOfDate,
    sealedAt: new Date().toISOString(),
    recordCount: sortedExposures.length,
    totalNotionalUsd,
    deskFilter,
    regionFilter,
    contentHashSha256,
    sampleExposureIds: sortedExposures.slice(0, 5).map((e) => e.tradeId),
  };

  return { snapshot, sealedExposures: sortedExposures };
}

/**
 * Executes a versioned report template deterministically over sealed snapshot exposures.
 * 
 * Two runs using the same template rules over the same snapshot exposures
 * will produce identical numbers and identical output hashes.
 */
export function executeReportTemplate(
  template: ReportTemplate,
  sealedExposures: SyntheticExposure[],
  fixedTimestamp?: string
): ReportOutput {
  const totalExposuresAnalyzed = sealedExposures.length;
  const grossNotionalUsd = sealedExposures.reduce((acc, e) => acc + e.notionalUsd, 0);
  const netMarkToMarketUsd = sealedExposures.reduce((acc, e) => acc + e.markToMarketUsd, 0);
  const aggregatePv01Usd = sealedExposures.reduce((acc, e) => acc + e.pv01Usd, 0);
  const aggregateCs01Usd = sealedExposures.reduce((acc, e) => acc + e.cs01Usd, 0);

  // Group by counterparty for concentration
  const counterpartyTotals: Record<string, { notional: number; name: string }> = {};
  for (const exp of sealedExposures) {
    if (!counterpartyTotals[exp.counterpartyId]) {
      counterpartyTotals[exp.counterpartyId] = { notional: 0, name: exp.counterpartyName };
    }
    counterpartyTotals[exp.counterpartyId].notional += exp.notionalUsd;
  }

  const sortedCp = Object.values(counterpartyTotals).sort((a, b) => b.notional - a.notional);
  const topCounterpartyName = sortedCp[0]?.name || 'None';
  const topCounterpartyExposureUsd = sortedCp[0]?.notional || 0;
  const regulatoryConcentrationRatioPct = grossNotionalUsd > 0
    ? Number(((topCounterpartyExposureUsd / grossNotionalUsd) * 100).toFixed(2))
    : 0;

  // Generate breakdown rows deterministically based on template ID
  const breakdowns: AggregatedMetricRow[] = [];

  if (template.templateId === 'TMPL-LGE-001') {
    // Sort counterparties alphabetically for deterministic row ordering
    const cpNames = Array.from(new Set(sealedExposures.map((e) => e.counterpartyName))).sort();
    for (const cpName of cpNames) {
      const cpExposures = sealedExposures.filter((e) => e.counterpartyName === cpName);
      const cpNotional = cpExposures.reduce((s, e) => s + e.notionalUsd, 0);
      const cpMtm = cpExposures.reduce((s, e) => s + e.markToMarketUsd, 0);
      const cpCollateral = cpExposures.reduce((s, e) => s + e.collateralUsd, 0);
      const netCurrentExposure = Math.max(0, cpMtm - cpCollateral);
      const capitalUtilizationPct = Number(((netCurrentExposure / 2500000000) * 100).toFixed(2));

      breakdowns.push({
        groupKey: cpName,
        metricName: 'Gross Notional & Capital Utilization',
        value: cpNotional,
        currency: 'USD',
        formattedValue: `$${(cpNotional / 1000000).toFixed(1)}M (${capitalUtilizationPct}% Tier 1)`,
        breachStatus: capitalUtilizationPct >= 25 ? 'BREACH' : capitalUtilizationPct >= 20 ? 'WARNING' : 'NORMAL',
      });
    }
  } else if (template.templateId === 'TMPL-CCR-002') {
    // Rating breakdown (AAA, AA, A, BBB, BB, B)
    const ratingTiers: ('AAA' | 'AA' | 'A' | 'BBB' | 'BB' | 'B')[] = ['AAA', 'AA', 'A', 'BBB', 'BB', 'B'];
    for (const rating of ratingTiers) {
      const tierExposures = sealedExposures.filter((e) => e.counterpartyRating === rating);
      if (tierExposures.length === 0) continue;
      const netEad = tierExposures.reduce(
        (s, e) => s + Math.max(0, e.markToMarketUsd - e.collateralUsd * 0.95),
        0
      );
      const cs01Total = tierExposures.reduce((s, e) => s + e.cs01Usd, 0);

      breakdowns.push({
        groupKey: `Rating Tier ${rating}`,
        metricName: 'Net EAD & Credit Spread Sensitivity',
        value: netEad,
        currency: 'USD',
        formattedValue: `EAD: $${(netEad / 1000000).toFixed(2)}M | CS01: $${cs01Total.toLocaleString()}`,
        breachStatus: cs01Total >= 150000 ? 'WARNING' : 'NORMAL',
      });
    }
  } else if (template.templateId === 'TMPL-IRRBB-003') {
    // Currency PV01 breakdown
    const currencies = Array.from(new Set(sealedExposures.map((e) => e.currency))).sort();
    for (const ccy of currencies) {
      const ccyExposures = sealedExposures.filter((e) => e.currency === ccy);
      const ccyPv01 = ccyExposures.reduce((s, e) => s + e.pv01Usd, 0);
      const avgDuration =
        ccyExposures.reduce((s, e) => s + e.notionalUsd * e.effectiveDurationYears, 0) /
        ccyExposures.reduce((s, e) => s + e.notionalUsd, 0);

      breakdowns.push({
        groupKey: `Currency ${ccy}`,
        metricName: 'PV01 & Weighted Duration',
        value: ccyPv01,
        currency: ccy,
        formattedValue: `PV01: $${ccyPv01.toLocaleString()} | Duration: ${avgDuration.toFixed(1)}y`,
        breachStatus: ccyPv01 >= 100000 ? 'WARNING' : 'NORMAL',
      });
    }
  } else {
    // Default asset class breakdown
    const assetClasses = Array.from(new Set(sealedExposures.map((e) => e.assetClass))).sort();
    for (const ac of assetClasses) {
      const acExposures = sealedExposures.filter((e) => e.assetClass === ac);
      const acNotional = acExposures.reduce((s, e) => s + e.notionalUsd, 0);
      breakdowns.push({
        groupKey: ac,
        metricName: 'Gross Notional',
        value: acNotional,
        currency: 'USD',
        formattedValue: `$${(acNotional / 1000000).toFixed(1)}M`,
        breachStatus: 'NORMAL',
      });
    }
  }

  const summary = {
    totalExposuresAnalyzed,
    grossNotionalUsd: Math.round(grossNotionalUsd),
    netMarkToMarketUsd: Math.round(netMarkToMarketUsd),
    aggregatePv01Usd: Math.round(aggregatePv01Usd),
    aggregateCs01Usd: Math.round(aggregateCs01Usd),
    topCounterpartyExposureUsd: Math.round(topCounterpartyExposureUsd),
    topCounterpartyName,
    regulatoryConcentrationRatioPct,
  };

  // Canonical calculation core for byte-identical hashing
  const calculationCore = {
    breakdowns,
    summary,
    templateId: template.templateId,
    templateVersion: template.version,
  };

  const outputHashSha256 = hashCanonicalObject(calculationCore);

  return {
    summary,
    breakdowns,
    generatedAt: fixedTimestamp || new Date().toISOString(),
    outputHashSha256,
  };
}

/**
 * Calculates deterministic diff between two report runs (GET /api/v1/report-runs/{id}/diff?against={otherId}).
 */
export function calculateRunDiff(baseRun: ReportRun, comparisonRun: ReportRun): RunDiffResult {
  const baseOut = baseRun.output?.summary || {
    grossNotionalUsd: 0,
    netMarkToMarketUsd: 0,
    aggregatePv01Usd: 0,
    aggregateCs01Usd: 0,
    regulatoryConcentrationRatioPct: 0,
    totalExposuresAnalyzed: 0,
    topCounterpartyExposureUsd: 0,
    topCounterpartyName: 'None',
  };

  const compOut = comparisonRun.output?.summary || {
    grossNotionalUsd: 0,
    netMarkToMarketUsd: 0,
    aggregatePv01Usd: 0,
    aggregateCs01Usd: 0,
    regulatoryConcentrationRatioPct: 0,
    totalExposuresAnalyzed: 0,
    topCounterpartyExposureUsd: 0,
    topCounterpartyName: 'None',
  };

  function createMetricVariance(metric: string, baseVal: number, compVal: number, materialPct = 5) {
    const delta = compVal - baseVal;
    const pct = baseVal !== 0 ? (delta / Math.abs(baseVal)) * 100 : 0;
    return {
      metric,
      baseValue: baseVal,
      comparisonValue: compVal,
      absoluteDelta: delta,
      percentageDelta: Number(pct.toFixed(2)),
      isMaterial: Math.abs(pct) >= materialPct,
    };
  }

  const metricVariances = [
    createMetricVariance('Gross Notional ($)', baseOut.grossNotionalUsd, compOut.grossNotionalUsd),
    createMetricVariance('Net Mark-to-Market ($)', baseOut.netMarkToMarketUsd, compOut.netMarkToMarketUsd),
    createMetricVariance('Aggregate PV01 ($)', baseOut.aggregatePv01Usd, compOut.aggregatePv01Usd),
    createMetricVariance('Aggregate CS01 ($)', baseOut.aggregateCs01Usd, compOut.aggregateCs01Usd),
    createMetricVariance('Concentration Ratio (%)', baseOut.regulatoryConcentrationRatioPct, compOut.regulatoryConcentrationRatioPct, 2),
    createMetricVariance('Exposures Analyzed', baseOut.totalExposuresAnalyzed, compOut.totalExposuresAnalyzed, 1),
  ];

  const baseTrades = new Set(baseRun.inputSnapshot.sampleExposureIds || []);
  const compTrades = new Set(comparisonRun.inputSnapshot.sampleExposureIds || []);

  const addedTrades: string[] = [];
  const removedTrades: string[] = [];
  const commonTrades: string[] = [];

  for (const t of compTrades) {
    if (!baseTrades.has(t)) addedTrades.push(t);
    else commonTrades.push(t);
  }
  for (const t of baseTrades) {
    if (!compTrades.has(t)) removedTrades.push(t);
  }

  const identicalOutputs =
    Boolean(baseRun.output && comparisonRun.output) &&
    baseRun.output?.outputHashSha256 === comparisonRun.output?.outputHashSha256;

  return {
    baseRunId: baseRun.id,
    comparisonRunId: comparisonRun.id,
    baseAsOfDate: baseRun.asOfDate,
    comparisonAsOfDate: comparisonRun.asOfDate,
    metricVariances,
    snapshotDelta: {
      baseRecordCount: baseRun.inputSnapshot.recordCount,
      comparisonRecordCount: comparisonRun.inputSnapshot.recordCount,
      addedTradesCount: Math.max(0, compOut.totalExposuresAnalyzed - baseOut.totalExposuresAnalyzed),
      removedTradesCount: Math.max(0, baseOut.totalExposuresAnalyzed - compOut.totalExposuresAnalyzed),
      commonTradesCount: Math.min(baseOut.totalExposuresAnalyzed, compOut.totalExposuresAnalyzed),
      addedTradeIds: addedTrades,
      removedTradeIds: removedTrades,
    },
    identicalOutputs,
  };
}
