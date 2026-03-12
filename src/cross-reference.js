/**
 * Cross-Tool Data Flow Engine (MGT-E1)
 *
 * Computes cross-references between Growth Model, Sales Capacity, and Marketing Plan.
 * Pure function: takes tool states, returns computed gaps and metrics.
 */

function parseNum(str) {
  return parseFloat(String(str).replace(/[,$%]/g, '')) || 0;
}

/**
 * Compute cross-reference data from three tool states.
 *
 * @param {object|null} growthState   - saas-growth-model tool state
 * @param {object|null} capacityState - sales-capacity tool state
 * @param {object|null} marketingState - marketing-plan tool state
 * @returns {object} cross-reference result with gaps
 */
function computeCrossReference(growthState, capacityState, marketingState) {
  const result = {
    growthModel: {
      requiredBookingsPerMonth: 0,
      requiredPipelinePerMonth: 0,
      targetYear2ARR: 0,
      currentARR: 0,
    },
    salesCapacity: {
      totalQuotaCapacity: 0,
      totalReps: 0,
      expectedAttainment: 0,
    },
    marketingPlan: {
      totalBudget: 0,
      projectedPipeline: 0,
      projectedPipelinePerMonth: 0,
    },
    gaps: {
      quotaGap: 0,
      pipelineGap: 0,
    },
  };

  // --- Growth Model: compute required bookings/pipeline per month ---
  if (growthState && growthState.segments && growthState.segments.length > 0) {
    let totalCurrentARR = 0;
    let totalYear2ARR = 0;
    let totalRequiredBookings = 0;
    let totalRequiredPipeline = 0;

    growthState.segments.forEach(seg => {
      const v = seg.values || {};
      const currentARR = parseNum(v.currentARR);
      const year2ARR = parseNum(v.year2ARR);
      const winRate = parseNum(v.winRate) / 100 || 0.25;
      const grossChurn = parseNum(v.churn) / 100 || 0.10;
      const nrr = parseNum(v.nrr) / 100 || 1.10;

      totalCurrentARR += currentARR;
      totalYear2ARR += year2ARR;

      // Total net new ARR needed over 24 months
      const netNewNeeded = year2ARR - currentARR;
      // Account for churn: total churn over 24 months (simplified annual rate * 2)
      const totalChurn = currentARR * grossChurn * 2;
      // Expansion from NRR above 100%
      const expansionRate = Math.max(0, nrr - 1 + grossChurn);
      const totalExpansion = currentARR * expansionRate * 2;
      // Gross new bookings needed = net new + churn - expansion
      const grossBookingsNeeded = Math.max(0, netNewNeeded + totalChurn - totalExpansion);
      const monthlyBookings = grossBookingsNeeded / 24;
      const monthlyPipeline = winRate > 0 ? monthlyBookings / winRate : 0;

      totalRequiredBookings += monthlyBookings;
      totalRequiredPipeline += monthlyPipeline;
    });

    result.growthModel.currentARR = totalCurrentARR;
    result.growthModel.targetYear2ARR = totalYear2ARR;
    result.growthModel.requiredBookingsPerMonth = Math.round(totalRequiredBookings);
    result.growthModel.requiredPipelinePerMonth = Math.round(totalRequiredPipeline);
  }

  // --- Sales Capacity: compute total annual quota ---
  if (capacityState && capacityState.segments && capacityState.reps) {
    const attainmentPct = parseNum(capacityState.attainmentPct) / 100 || 0.85;
    let totalQuota = 0;
    let totalReps = capacityState.reps.length;

    capacityState.reps.forEach(rep => {
      const seg = capacityState.segments.find(s => s.id === rep.segmentId);
      const quota = rep.quotaOverride || (seg ? seg.quota : 0);
      totalQuota += quota;
    });

    result.salesCapacity.totalQuotaCapacity = totalQuota;
    result.salesCapacity.totalReps = totalReps;
    result.salesCapacity.expectedAttainment = totalQuota * attainmentPct;
  }

  // --- Marketing Plan: compute total budget and projected pipeline ---
  if (marketingState && marketingState.channels) {
    let totalBudget = 0;
    let totalPipeline = 0;
    const duration = parseInt(marketingState.duration) || 8;
    const months = duration * 3; // quarters to months

    marketingState.channels.forEach(ch => {
      const channelBudget = Object.values(ch.budgets || {}).reduce((s, b) => s + (b || 0), 0);
      totalBudget += channelBudget;
      totalPipeline += channelBudget * (ch.ratio || 0);
    });

    result.marketingPlan.totalBudget = totalBudget;
    result.marketingPlan.projectedPipeline = totalPipeline;
    result.marketingPlan.projectedPipelinePerMonth = months > 0 ? Math.round(totalPipeline / months) : 0;
  }

  // --- Compute Gaps ---
  const monthlyQuotaCapacity = result.salesCapacity.totalQuotaCapacity / 12;
  const requiredBookings = result.growthModel.requiredBookingsPerMonth;
  const requiredPipeline = result.growthModel.requiredPipelinePerMonth;
  const projectedPipeline = result.marketingPlan.projectedPipelinePerMonth;

  // Positive = surplus, negative = shortfall
  result.gaps.quotaGap = requiredBookings > 0 || monthlyQuotaCapacity > 0
    ? Math.round(monthlyQuotaCapacity - requiredBookings)
    : 0;

  result.gaps.pipelineGap = requiredPipeline > 0 || projectedPipeline > 0
    ? Math.round(projectedPipeline - requiredPipeline)
    : 0;

  return result;
}

module.exports = { computeCrossReference };
