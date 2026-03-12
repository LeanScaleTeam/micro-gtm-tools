/**
 * SaaS Efficiency Metrics Calculator (MGT-E3)
 *
 * Computes: CAC, Payback Period, Rule of 40, Magic Number
 * Pure function, usable in browser and Node.js.
 */

(function(exports) {

  /**
   * Compute SaaS efficiency metrics.
   *
   * @param {Object} inputs
   * @param {number} inputs.smSpend             - Total S&M spend for the period
   * @param {number} inputs.newCustomersAcquired - New customers acquired in period
   * @param {number} inputs.arpa                 - Average Revenue Per Account (annual)
   * @param {number} inputs.grossMarginPct       - Gross margin as percentage (e.g., 75)
   * @param {number} inputs.currentARR           - Current ARR
   * @param {number} inputs.previousARR          - Previous period ARR
   * @param {number} inputs.previousSmSpend      - Previous period S&M spend
   * @param {number} inputs.revenueGrowthRate    - Revenue growth rate as percentage (e.g., 25)
   * @param {number} inputs.profitMargin         - Profit margin as percentage (e.g., 15 or -20)
   * @returns {Object} metrics
   */
  function computeEfficiencyMetrics(inputs) {
    const {
      smSpend = 0,
      newCustomersAcquired = 0,
      arpa = 0,
      grossMarginPct = 0,
      currentARR = 0,
      previousARR = 0,
      previousSmSpend = 0,
      revenueGrowthRate = 0,
      profitMargin = 0,
    } = inputs;

    const grossMargin = grossMarginPct / 100;

    // --- CAC: Customer Acquisition Cost ---
    const cac = newCustomersAcquired > 0 ? smSpend / newCustomersAcquired : null;

    // --- Payback Period (in months) ---
    // Payback = CAC / (ARPA * gross margin) converted to months
    let paybackPeriodMonths = null;
    if (cac !== null && arpa > 0 && grossMargin > 0) {
      const annualContribution = arpa * grossMargin;
      const paybackYears = cac / annualContribution;
      paybackPeriodMonths = Math.round(paybackYears * 12);
    }

    // --- Rule of 40 ---
    const ruleOf40 = revenueGrowthRate + profitMargin;
    const ruleOf40Pass = ruleOf40 >= 40;

    // --- Magic Number ---
    // Net New ARR / Previous Period S&M Spend
    const netNewARR = currentARR - previousARR;
    const magicNumber = previousSmSpend > 0 ? netNewARR / previousSmSpend : null;

    // --- Ratings ---
    let cacRating = null;
    if (cac !== null && arpa > 0) {
      const cacRatio = cac / arpa;
      cacRating = cacRatio <= 1 ? 'good' : cacRatio <= 1.5 ? 'ok' : 'poor';
    }

    let paybackRating = null;
    if (paybackPeriodMonths !== null) {
      paybackRating = paybackPeriodMonths <= 12 ? 'good' : paybackPeriodMonths <= 18 ? 'ok' : 'poor';
    }

    let magicNumberRating = null;
    if (magicNumber !== null) {
      magicNumberRating = magicNumber >= 1.0 ? 'good' : magicNumber >= 0.5 ? 'ok' : 'poor';
    }

    return {
      cac,
      cacRating,
      paybackPeriodMonths,
      paybackRating,
      ruleOf40,
      ruleOf40Pass,
      magicNumber,
      magicNumberRating,
    };
  }

  exports.computeEfficiencyMetrics = computeEfficiencyMetrics;

})(typeof module !== 'undefined' && module.exports ? module.exports : (window.EfficiencyMetrics = {}));
