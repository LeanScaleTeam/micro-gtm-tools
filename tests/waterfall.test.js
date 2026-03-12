/**
 * Tests for MGT-E2: ARR Waterfall Chart
 * Tests the buildWaterfallData function that computes the waterfall bridge
 */

describe('buildWaterfallData', () => {
  let buildWaterfallData;

  beforeAll(() => {
    // The waterfall module is a pure function, no mocks needed
    buildWaterfallData = require('../public/lib/waterfall').buildWaterfallData;
  });

  test('computes correct waterfall bridge from segment results', () => {
    const segmentResults = {
      seg1: {
        results: [
          { arr: 1100000, bookings: 100000, churn: 8333, newCustomers: 2, totalCustomers: 22 },
          { arr: 1210000, bookings: 110000, churn: 9166, newCustomers: 2, totalCustomers: 24 },
        ],
        y1Totals: { bookings: 500000, churn: 100000, revenue: 1200000 },
        y2Totals: { bookings: 800000, churn: 150000, revenue: 2400000 },
        lastMonth: { arr: 4000000 },
      },
    };

    const segments = [{ id: 'seg1', name: 'Enterprise', color: 'purple', values: { currentARR: '1,000,000', nrr: '110', churn: '10' } }];

    const result = buildWaterfallData(segments, segmentResults);

    expect(result).toHaveProperty('startingARR');
    expect(result).toHaveProperty('newBusiness');
    expect(result).toHaveProperty('expansion');
    expect(result).toHaveProperty('churn');
    expect(result).toHaveProperty('endingARR');

    expect(result.startingARR).toBe(1000000);
    expect(result.newBusiness).toBeGreaterThan(0);
    expect(result.churn).toBeLessThan(0);  // churn is negative
    expect(result.endingARR).toBe(4000000);

    // Waterfall bridge should balance:
    // startingARR + newBusiness + expansion + churn = endingARR
    const computed = result.startingARR + result.newBusiness + result.expansion + result.churn;
    expect(computed).toBeCloseTo(result.endingARR, -1); // within rounding
  });

  test('returns all zeros when no segments provided', () => {
    const result = buildWaterfallData([], {});

    expect(result.startingARR).toBe(0);
    expect(result.newBusiness).toBe(0);
    expect(result.expansion).toBe(0);
    expect(result.churn).toBe(0);
    expect(result.endingARR).toBe(0);
  });

  test('handles multiple segments', () => {
    const segmentResults = {
      seg1: {
        results: Array(24).fill(null).map((_, i) => ({
          arr: 1000000 + i * 50000, bookings: 60000, churn: 5000,
          newCustomers: 1, totalCustomers: 20 + i,
        })),
        y1Totals: { bookings: 400000, churn: 60000, revenue: 1000000 },
        y2Totals: { bookings: 600000, churn: 80000, revenue: 1500000 },
        lastMonth: { arr: 2150000 },
      },
      seg2: {
        results: Array(24).fill(null).map((_, i) => ({
          arr: 500000 + i * 25000, bookings: 30000, churn: 2500,
          newCustomers: 1, totalCustomers: 10 + i,
        })),
        y1Totals: { bookings: 200000, churn: 30000, revenue: 500000 },
        y2Totals: { bookings: 300000, churn: 40000, revenue: 750000 },
        lastMonth: { arr: 1075000 },
      },
    };

    const segments = [
      { id: 'seg1', name: 'Enterprise', color: 'purple', values: { currentARR: '1,000,000', nrr: '110', churn: '10' } },
      { id: 'seg2', name: 'SMB', color: 'green', values: { currentARR: '500,000', nrr: '105', churn: '15' } },
    ];

    const result = buildWaterfallData(segments, segmentResults);

    expect(result.startingARR).toBe(1500000); // 1M + 500K
    expect(result.endingARR).toBe(3225000); // 2.15M + 1.075M
  });

  test('generates SVG-compatible bar data', () => {
    const segmentResults = {
      seg1: {
        results: Array(24).fill(null).map((_, i) => ({
          arr: 1000000 + i * 40000, bookings: 50000, churn: 4000,
          newCustomers: 1, totalCustomers: 20,
        })),
        y1Totals: { bookings: 300000, churn: 50000, revenue: 900000 },
        y2Totals: { bookings: 400000, churn: 60000, revenue: 1200000 },
        lastMonth: { arr: 1960000 },
      },
    };

    const segments = [{ id: 'seg1', name: 'Ent', color: 'purple', values: { currentARR: '1,000,000', nrr: '110', churn: '10' } }];

    const result = buildWaterfallData(segments, segmentResults);

    // Should have bars array for SVG rendering
    expect(result).toHaveProperty('bars');
    expect(result.bars).toBeInstanceOf(Array);
    expect(result.bars.length).toBe(5);

    // Check bar structure
    result.bars.forEach(bar => {
      expect(bar).toHaveProperty('label');
      expect(bar).toHaveProperty('value');
      expect(bar).toHaveProperty('color');
      expect(bar).toHaveProperty('type'); // 'total', 'positive', 'negative'
    });

    // First bar = starting ARR (blue, total)
    expect(result.bars[0].type).toBe('total');
    expect(result.bars[0].label).toBe('Starting ARR');

    // Last bar = ending ARR (blue, total)
    expect(result.bars[4].type).toBe('total');
    expect(result.bars[4].label).toBe('Ending ARR');

    // Churn bar should be negative type
    const churnBar = result.bars.find(b => b.label === 'Churn');
    expect(churnBar.type).toBe('negative');
    expect(churnBar.value).toBeLessThan(0);
  });
});
