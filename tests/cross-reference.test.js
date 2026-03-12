/**
 * Tests for MGT-E1: Cross-Tool Data Flow Engine
 * Tests the /api/tools/cross-reference endpoint and computeGaps logic
 */

// Mock supabase before requiring app
jest.mock('../lib/supabase-client', () => ({
  supabaseAdmin: {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'test-user', email: 'test@test.com' } },
        error: null,
      }),
    },
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn(),
    insert: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockResolvedValue({ error: null }),
  },
}));

jest.mock('../lib/activity-logger', () => ({
  logActivity: jest.fn(),
}));

const request = require('supertest');
const { supabaseAdmin } = require('../lib/supabase-client');

// Helper: set up mock chain for tenant membership
function setupAuthMocks() {
  supabaseAdmin.from.mockImplementation((table) => {
    if (table === 'tenant_members') {
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [{ tenant_id: 'tenant-1', role: 'admin' }],
          }),
        }),
      };
    }
    if (table === 'mc_configs') {
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: { id: 'config-1' } }),
            }),
          }),
        }),
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: { id: 'config-1' }, error: null }),
          }),
        }),
      };
    }
    if (table === 'mc_config_sections') {
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn(),
            }),
          }),
        }),
        upsert: jest.fn().mockResolvedValue({ error: null }),
      };
    }
    return {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null }),
    };
  });
}

describe('GET /api/tools/cross-reference', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    setupAuthMocks();
    // Re-require app to get fresh state
    jest.resetModules();
    jest.mock('../lib/supabase-client', () => ({
      supabaseAdmin: {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'test-user', email: 'test@test.com' } },
            error: null,
          }),
        },
        from: jest.fn(),
      },
    }));
    jest.mock('../lib/activity-logger', () => ({ logActivity: jest.fn() }));

    const { supabaseAdmin: sa } = require('../lib/supabase-client');

    // Build a mock chain that handles section lookups
    const sectionData = {};

    sa.from.mockImplementation((table) => {
      if (table === 'tenant_members') {
        return {
          select: () => ({
            eq: () => Promise.resolve({
              data: [{ tenant_id: 'tenant-1', role: 'admin' }],
            }),
          }),
        };
      }
      if (table === 'mc_configs') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: () => Promise.resolve({ data: { id: 'config-1' } }),
              }),
            }),
          }),
          insert: () => ({
            select: () => ({
              single: () => Promise.resolve({ data: { id: 'config-1' }, error: null }),
            }),
          }),
        };
      }
      if (table === 'mc_config_sections') {
        return {
          select: () => ({
            eq: (field, val1) => ({
              eq: (field2, section) => ({
                single: () => {
                  const data = sectionData[section] || null;
                  return Promise.resolve({ data: data ? { data } : null });
                },
              }),
            }),
          }),
          upsert: () => Promise.resolve({ error: null }),
        };
      }
      return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn() };
    });

    // Store section data setter for tests
    global.__setSectionData = (section, data) => {
      sectionData[section] = data;
    };

    app = require('../src/app');
  });

  afterEach(() => {
    delete global.__setSectionData;
  });

  test('returns 200 with cross-reference data when all tools have state', async () => {
    // Growth model state: segments with computed results
    global.__setSectionData('tool:saas-growth-model', {
      segments: [
        {
          id: 'seg1',
          name: 'Enterprise',
          color: 'purple',
          values: {
            currentARR: '1,000,000',
            eoyARR: '2,000,000',
            year2ARR: '4,000,000',
            avgDeal: '50,000',
            winRate: '25',
            salesCycle: '3',
            nrr: '110',
            churn: '10',
            quota: '1,000,000',
            repOTE: '200,000',
            acctsPerCSM: '30',
            csmSalary: '120,000',
            repsPerMgr: '6',
            mgrSalary: '180,000',
            cogs: '15',
            netMargin: '15',
          },
        },
      ],
    });

    // Sales capacity state
    global.__setSectionData('tool:sales-capacity', {
      segments: [
        { id: 'seg_default_1', name: 'Enterprise', quota: 1200000, ramp: [0, 25, 50, 75, 100], color: 'purple' },
      ],
      reps: [
        { id: 'rep_1', name: 'Rep 1', segmentId: 'seg_default_1', startDate: '2026-01-01', quotaOverride: null },
        { id: 'rep_2', name: 'Rep 2', segmentId: 'seg_default_1', startDate: '2026-01-01', quotaOverride: null },
      ],
      attainmentPct: '85',
      planStart: '2026-01-01',
    });

    // Marketing plan state
    global.__setSectionData('tool:marketing-plan', {
      channels: [
        { id: 'ch_1', name: 'Paid Search', ratio: 5, budgets: { 0: 50000, 1: 50000, 2: 50000, 3: 50000 }, color: 'blue' },
      ],
      startYear: '2026',
      duration: '8',
      avgACV: '75000',
      mqlToSql: '25',
      sqlToCw: '20',
    });

    const res = await request(app)
      .get('/api/tools/cross-reference')
      .set('Authorization', 'Bearer test-token');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('growthModel');
    expect(res.body).toHaveProperty('salesCapacity');
    expect(res.body).toHaveProperty('marketingPlan');
    expect(res.body).toHaveProperty('gaps');

    // Growth model should have required bookings and pipeline
    expect(res.body.growthModel).toHaveProperty('requiredBookingsPerMonth');
    expect(res.body.growthModel).toHaveProperty('requiredPipelinePerMonth');
    expect(typeof res.body.growthModel.requiredBookingsPerMonth).toBe('number');

    // Sales capacity should have total quota
    expect(res.body.salesCapacity).toHaveProperty('totalQuotaCapacity');
    expect(typeof res.body.salesCapacity.totalQuotaCapacity).toBe('number');

    // Marketing plan should have projected pipeline
    expect(res.body.marketingPlan).toHaveProperty('projectedPipelinePerMonth');
    expect(typeof res.body.marketingPlan.projectedPipelinePerMonth).toBe('number');
    expect(res.body.marketingPlan).toHaveProperty('totalBudget');

    // Gaps should be computed
    expect(res.body.gaps).toHaveProperty('quotaGap');
    expect(res.body.gaps).toHaveProperty('pipelineGap');
    expect(typeof res.body.gaps.quotaGap).toBe('number');
    expect(typeof res.body.gaps.pipelineGap).toBe('number');
  });

  test('returns empty/zero values when no tool state exists', async () => {
    const res = await request(app)
      .get('/api/tools/cross-reference')
      .set('Authorization', 'Bearer test-token');

    expect(res.status).toBe(200);
    expect(res.body.growthModel.requiredBookingsPerMonth).toBe(0);
    expect(res.body.salesCapacity.totalQuotaCapacity).toBe(0);
    expect(res.body.marketingPlan.projectedPipelinePerMonth).toBe(0);
    expect(res.body.gaps.quotaGap).toBe(0);
    expect(res.body.gaps.pipelineGap).toBe(0);
  });

  test('returns 401 without auth', async () => {
    const res = await request(app)
      .get('/api/tools/cross-reference');

    expect(res.status).toBe(401);
  });
});

describe('computeCrossReference (unit)', () => {
  let computeCrossReference;

  beforeEach(() => {
    jest.resetModules();
    jest.mock('../lib/supabase-client', () => ({
      supabaseAdmin: { auth: { getUser: jest.fn() }, from: jest.fn() },
    }));
    jest.mock('../lib/activity-logger', () => ({ logActivity: jest.fn() }));
    computeCrossReference = require('../src/cross-reference').computeCrossReference;
  });

  test('computes required bookings from growth model segments', () => {
    const growthState = {
      segments: [
        {
          id: 's1', name: 'Enterprise', color: 'purple',
          values: {
            currentARR: '1,000,000',
            eoyARR: '2,000,000',
            year2ARR: '4,000,000',
            avgDeal: '50,000',
            winRate: '25',
            salesCycle: '3',
            nrr: '110',
            churn: '10',
          },
        },
      ],
    };

    const result = computeCrossReference(growthState, null, null);
    expect(result.growthModel.requiredBookingsPerMonth).toBeGreaterThan(0);
    expect(result.growthModel.requiredPipelinePerMonth).toBeGreaterThan(0);
    expect(result.growthModel.targetYear2ARR).toBe(4000000);
  });

  test('computes total quota from sales capacity', () => {
    const capacityState = {
      segments: [
        { id: 's1', name: 'Enterprise', quota: 1200000, ramp: [0, 25, 50, 75, 100] },
      ],
      reps: [
        { id: 'r1', segmentId: 's1', startDate: '2026-01-01', quotaOverride: null },
        { id: 'r2', segmentId: 's1', startDate: '2026-01-01', quotaOverride: 1000000 },
      ],
      attainmentPct: '85',
    };

    const result = computeCrossReference(null, capacityState, null);
    expect(result.salesCapacity.totalQuotaCapacity).toBe(2200000); // 1200000 + 1000000
    expect(result.salesCapacity.totalReps).toBe(2);
    expect(result.salesCapacity.expectedAttainment).toBeCloseTo(1870000, 0); // 2200000 * 0.85
  });

  test('computes projected pipeline from marketing plan', () => {
    const marketingState = {
      channels: [
        { id: 'c1', name: 'Paid', ratio: 5, budgets: { 0: 50000, 1: 50000, 2: 50000, 3: 50000, 4: 60000, 5: 60000, 6: 60000, 7: 60000 } },
      ],
      startYear: '2026',
      duration: '8',
    };

    const result = computeCrossReference(null, null, marketingState);
    // Total budget = 440000, pipeline = 440000 * 5 = 2200000
    // Per month over 24 months = 2200000 / 24
    expect(result.marketingPlan.totalBudget).toBe(440000);
    expect(result.marketingPlan.projectedPipeline).toBe(2200000);
    expect(result.marketingPlan.projectedPipelinePerMonth).toBeCloseTo(2200000 / 24, 0);
  });

  test('computes gaps correctly', () => {
    const growthState = {
      segments: [{
        id: 's1', name: 'Ent', color: 'purple',
        values: {
          currentARR: '1,000,000', eoyARR: '2,000,000', year2ARR: '4,000,000',
          avgDeal: '50,000', winRate: '25', salesCycle: '3', nrr: '110', churn: '10',
        },
      }],
    };

    const capacityState = {
      segments: [{ id: 's1', quota: 500000, ramp: [0, 50, 100] }],
      reps: [{ id: 'r1', segmentId: 's1', startDate: '2026-01-01', quotaOverride: null }],
      attainmentPct: '100',
    };

    const marketingState = {
      channels: [{ id: 'c1', ratio: 3, budgets: { 0: 10000, 1: 10000, 2: 10000, 3: 10000 } }],
      startYear: '2026', duration: '4',
    };

    const result = computeCrossReference(growthState, capacityState, marketingState);

    // quotaGap = sales capacity monthly - required bookings monthly
    // If capacity < required, gap is negative (shortfall)
    expect(typeof result.gaps.quotaGap).toBe('number');
    expect(typeof result.gaps.pipelineGap).toBe('number');
  });

  test('returns zeros when all inputs are null', () => {
    const result = computeCrossReference(null, null, null);
    expect(result.growthModel.requiredBookingsPerMonth).toBe(0);
    expect(result.salesCapacity.totalQuotaCapacity).toBe(0);
    expect(result.marketingPlan.projectedPipelinePerMonth).toBe(0);
    expect(result.gaps.quotaGap).toBe(0);
    expect(result.gaps.pipelineGap).toBe(0);
  });
});
