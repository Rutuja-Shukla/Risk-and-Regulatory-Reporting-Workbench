import { ReportTemplate } from '../types/workbench';

/**
 * Versioned Report Templates
 * 
 * Template definitions stored as structured JSON.
 * Re-running the same template version on the same input snapshot
 * is mathematically guaranteed to generate byte-identical output.
 */
export const REPORT_TEMPLATES: ReportTemplate[] = [
  {
    templateId: 'TMPL-LGE-001',
    version: '1.2.0',
    title: 'Large Exposure Concentration & Capital Limits',
    description: 'Aggregates gross notional and net exposure by counterparty LEI, evaluating single-name limits against Tier 1 simulated capital threshold ($2.5B).',
    regulatoryFrameworkReference: 'Simulated BCBS 283 / EBA Large Exposures Framework (Non-prod simulation)',
    effectiveFrom: '2026-01-01',
    parameters: [
      {
        name: 'singleNameLimitPct',
        type: 'number',
        required: true,
        defaultValue: 25.0,
        description: 'Maximum allowable net exposure percentage of Tier 1 simulated capital base',
      },
      {
        name: 'minReportingThresholdUsd',
        type: 'number',
        required: false,
        defaultValue: 10000000,
        description: 'Minimum counterparty notional for inclusion in concentration breakdown',
      },
    ],
    calculationRules: [
      {
        targetMetric: 'grossNotionalUsd',
        formula: 'SUM(notionalUsd)',
        aggregation: 'SUM',
        groupingKey: 'counterpartyName',
      },
      {
        targetMetric: 'netCurrentExposureUsd',
        formula: 'MAX(0, markToMarketUsd - collateralUsd)',
        aggregation: 'SUM',
        groupingKey: 'counterpartyName',
      },
      {
        targetMetric: 'capitalUtilizationPct',
        formula: '(netCurrentExposureUsd / 2500000000) * 100',
        aggregation: 'MAX',
      },
    ],
    thresholds: [
      {
        metric: 'capitalUtilizationPct',
        warningThreshold: 20.0,
        breachThreshold: 25.0,
      },
    ],
  },
  {
    templateId: 'TMPL-LGE-001',
    version: '1.1.0',
    title: 'Large Exposure Concentration (Legacy)',
    description: 'Previous version of Large Exposure Concentration with uncollateralized gross metric calculation.',
    regulatoryFrameworkReference: 'Simulated BCBS 283 (Non-prod simulation)',
    effectiveFrom: '2025-06-01',
    parameters: [
      {
        name: 'singleNameLimitPct',
        type: 'number',
        required: true,
        defaultValue: 25.0,
        description: 'Maximum allowable gross exposure percentage',
      },
    ],
    calculationRules: [
      {
        targetMetric: 'grossNotionalUsd',
        formula: 'SUM(notionalUsd)',
        aggregation: 'SUM',
        groupingKey: 'counterpartyName',
      },
    ],
  },
  {
    templateId: 'TMPL-CCR-002',
    version: '2.0.0',
    title: 'Counterparty Credit Risk (CCR) & EAD Analysis',
    description: 'Calculates Exposure at Default (EAD) with supervisory collateral haircuts and credit spread sensitivity (CS01) aggregation across credit rating tiers.',
    regulatoryFrameworkReference: 'Simulated SA-CCR / BCBS 279 (Non-prod simulation)',
    effectiveFrom: '2026-02-01',
    parameters: [
      {
        name: 'collateralHaircutMultiplier',
        type: 'number',
        required: true,
        defaultValue: 0.95,
        description: 'Supervisory collateral valuation discount multiplier',
      },
    ],
    calculationRules: [
      {
        targetMetric: 'netEadUsd',
        formula: 'SUM(MAX(0, markToMarketUsd - (collateralUsd * 0.95)))',
        aggregation: 'SUM',
        groupingKey: 'counterpartyRating',
      },
      {
        targetMetric: 'aggregateCs01Usd',
        formula: 'SUM(cs01Usd)',
        aggregation: 'SUM',
        groupingKey: 'counterpartyRating',
      },
    ],
    thresholds: [
      {
        metric: 'aggregateCs01Usd',
        warningThreshold: 150000,
        breachThreshold: 250000,
      },
    ],
  },
  {
    templateId: 'TMPL-IRRBB-003',
    version: '1.1.0',
    title: 'Interest Rate Risk in Banking Book (IRRBB) PV01',
    description: 'Evaluates +100bp / -100bp parallel yield curve shock impact, presenting net PV01 tenor breakdown by currency and duration bucket.',
    regulatoryFrameworkReference: 'Simulated BCBS 368 / IRRBB Principles (Non-prod simulation)',
    effectiveFrom: '2026-01-15',
    parameters: [
      {
        name: 'curveShiftBasisPoints',
        type: 'number',
        required: true,
        defaultValue: 100,
        description: 'Simulated yield curve shift in basis points',
      },
    ],
    calculationRules: [
      {
        targetMetric: 'aggregatePv01Usd',
        formula: 'SUM(pv01Usd)',
        aggregation: 'SUM',
        groupingKey: 'currency',
      },
      {
        targetMetric: 'weightedDurationYears',
        formula: 'SUM(notionalUsd * effectiveDurationYears) / SUM(notionalUsd)',
        aggregation: 'WEIGHTED_AVG',
      },
    ],
    thresholds: [
      {
        metric: 'aggregatePv01Usd',
        warningThreshold: 200000,
        breachThreshold: 350000,
      },
    ],
  },
];
