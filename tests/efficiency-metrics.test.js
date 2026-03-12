/**
 * Tests for MGT-E3: CAC + Payback Period + Rule of 40 + Magic Number
 * Tests the computeEfficiencyMetrics function
 */

describe('computeEfficiencyMetrics', () => {
  let computeEfficiencyMetrics;

  beforeAll(() => {
    computeEfficiencyMetrics = require('../public/lib/efficiency-metrics').computeEfficiencyMetrics;
  });

  test('computes CAC correctly', () => {
    const inputs = {
      smSpend: 500000,          // Total S&M spend
      newCustomersAcquired: 10, // New customers in the period
      arpa: 50000,              // Average revenue per account
      grossMarginPct: 75,       // Gross margin %
      currentARR: 1000000,
      previousARR: 800000,
      previousSmSpend: 400000,
      revenueGrowthRate: 25,    // %
      profitMargin: 15,         // %
    };

    const result = computeEfficiencyMetrics(inputs);

    // CAC = S&M spend / new customers = 500000 / 10 = 50000
    expect(result.cac).toBe(50000);
  });

  test('computes payback period correctly', () => {
    const inputs = {
      smSpend: 500000,
      newCustomersAcquired: 10,
      arpa: 50000,
      grossMarginPct: 75,
      currentARR: 1000000,
      previousARR: 800000,
      previousSmSpend: 400000,
      revenueGrowthRate: 25,
      profitMargin: 15,
    };

    const result = computeEfficiencyMetrics(inputs);

    // Payback = CAC / (ARPA * gross margin) = 50000 / (50000 * 0.75) = 1.33 years
    expect(result.paybackPeriodMonths).toBeCloseTo(16, 0); // ~16 months
  });

  test('computes Rule of 40 correctly', () => {
    const inputs = {
      smSpend: 500000,
      newCustomersAcquired: 10,
      arpa: 50000,
      grossMarginPct: 75,
      currentARR: 1000000,
      previousARR: 800000,
      previousSmSpend: 400000,
      revenueGrowthRate: 25,
      profitMargin: 15,
    };

    const result = computeEfficiencyMetrics(inputs);

    // Rule of 40 = growth rate + profit margin = 25 + 15 = 40
    expect(result.ruleOf40).toBe(40);
    expect(result.ruleOf40Pass).toBe(true); // >= 40 passes
  });

  test('computes Magic Number correctly', () => {
    const inputs = {
      smSpend: 500000,
      newCustomersAcquired: 10,
      arpa: 50000,
      grossMarginPct: 75,
      currentARR: 1000000,
      previousARR: 800000,
      previousSmSpend: 400000,
      revenueGrowthRate: 25,
      profitMargin: 15,
    };

    const result = computeEfficiencyMetrics(inputs);

    // Magic Number = Net New ARR / Previous S&M Spend = (1000000 - 800000) / 400000 = 0.5
    expect(result.magicNumber).toBeCloseTo(0.5, 2);
  });

  test('returns null metrics when inputs are zero/missing', () => {
    const inputs = {
      smSpend: 0,
      newCustomersAcquired: 0,
      arpa: 0,
      grossMarginPct: 0,
      currentARR: 0,
      previousARR: 0,
      previousSmSpend: 0,
      revenueGrowthRate: 0,
      profitMargin: 0,
    };

    const result = computeEfficiencyMetrics(inputs);

    expect(result.cac).toBeNull();           // 0/0 = null
    expect(result.paybackPeriodMonths).toBeNull();
    expect(result.magicNumber).toBeNull();    // 0/0 = null
    expect(result.ruleOf40).toBe(0);          // 0 + 0 = 0
    expect(result.ruleOf40Pass).toBe(false);
  });

  test('handles high-growth scenario', () => {
    const inputs = {
      smSpend: 2000000,
      newCustomersAcquired: 100,
      arpa: 25000,
      grossMarginPct: 80,
      currentARR: 5000000,
      previousARR: 2000000,
      previousSmSpend: 1500000,
      revenueGrowthRate: 150,
      profitMargin: -20,
    };

    const result = computeEfficiencyMetrics(inputs);

    // CAC = 2M / 100 = 20000
    expect(result.cac).toBe(20000);

    // Payback = 20000 / (25000 * 0.80) = 1.0 years = 12 months
    expect(result.paybackPeriodMonths).toBe(12);

    // Magic Number = (5M - 2M) / 1.5M = 2.0
    expect(result.magicNumber).toBeCloseTo(2.0, 2);

    // Rule of 40 = 150 + (-20) = 130 (high growth, negative profit)
    expect(result.ruleOf40).toBe(130);
    expect(result.ruleOf40Pass).toBe(true);
  });

  test('all metrics have proper rating/color hints', () => {
    const inputs = {
      smSpend: 500000,
      newCustomersAcquired: 10,
      arpa: 50000,
      grossMarginPct: 75,
      currentARR: 1000000,
      previousARR: 800000,
      previousSmSpend: 400000,
      revenueGrowthRate: 25,
      profitMargin: 15,
    };

    const result = computeEfficiencyMetrics(inputs);

    // Each metric should include a rating
    expect(result).toHaveProperty('cacRating');
    expect(result).toHaveProperty('paybackRating');
    expect(result).toHaveProperty('magicNumberRating');
    expect(['good', 'ok', 'poor']).toContain(result.cacRating);
    expect(['good', 'ok', 'poor']).toContain(result.paybackRating);
    expect(['good', 'ok', 'poor']).toContain(result.magicNumberRating);
  });
});
