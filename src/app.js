const express = require('express');
const cors = require('cors');
const path = require('path');
const { supabaseAdmin } = require('../lib/supabase-client');
const { requireAuth } = require('../lib/auth-middleware');
const { logActivity } = require('../lib/activity-logger');

const app = express();
app.use(cors({
  origin: [
    'https://lsapps.netlify.app',
    'https://lsfieldmapping.netlify.app',
    'https://inboundflow.netlify.app',
    'https://territorydesigner.netlify.app',
    'https://gtmtracker.netlify.app',
    'https://lsdossiers.netlify.app',
    'https://microgtmtools.netlify.app',
    'https://lsmissioncontrol.netlify.app',
    /localhost:\d+$/,
  ],
  credentials: true,
}));
app.use(express.json());
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  next();
});
app.use(express.static(path.join(__dirname, '../public')));

// ── Health (no auth) ──────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ ok: true, hasSupabaseUrl: !!process.env.SUPABASE_URL });
});

// ── Simple in-memory rate limiter ────────────────────────────
const rateLimits = new Map();
const RATE_LIMIT = { windowMs: 60000, max: 100 }; // 100 requests per minute

function rateLimit(req, res, next) {
  const key = req.ip || req.headers['x-forwarded-for'] || 'unknown';
  const now = Date.now();
  const entry = rateLimits.get(key);

  if (!entry || now - entry.start > RATE_LIMIT.windowMs) {
    rateLimits.set(key, { start: now, count: 1 });
    return next();
  }

  entry.count++;
  if (entry.count > RATE_LIMIT.max) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }
  next();
}

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimits) {
    if (now - entry.start > RATE_LIMIT.windowMs) rateLimits.delete(key);
  }
}, 300000);

app.use('/api', rateLimit);

// ── Auth middleware ───────────────────────────────────────
app.use('/api', requireAuth);

// ── JSONB helpers ─────────────────────────────────────────
// Tool state is freeform JSONB — validate it's a plain object at minimum
async function getActiveConfig(req) {
  const { data: existing } = await supabaseAdmin
    .from('mc_configs').select('id')
    .eq('tenant_id', req.tenantId).eq('name', 'default').single();
  if (existing) return existing.id;

  const { data: created, error } = await supabaseAdmin
    .from('mc_configs').insert({ tenant_id: req.tenantId, name: 'default' })
    .select('id').single();
  if (error) throw error;
  return created.id;
}

async function getSection(configId, section) {
  const { data } = await supabaseAdmin
    .from('mc_config_sections').select('data')
    .eq('config_id', configId).eq('section', section).single();
  return data?.data ?? null;
}

async function setSection(configId, section, data) {
  const { error } = await supabaseAdmin
    .from('mc_config_sections')
    .upsert({ config_id: configId, section, data, updated_at: new Date().toISOString() },
      { onConflict: 'config_id,section' });
  if (error) throw error;
}

// ── Tool State routes ─────────────────────────────────────
app.get('/api/tools/:tool/state', async (req, res) => {
  try {
    const configId = await getActiveConfig(req);
    const data = await getSection(configId, `tool:${req.params.tool}`);
    res.json(data || {});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/tools/:tool/state', async (req, res) => {
  try {
    if (typeof req.body !== 'object' || req.body === null || Array.isArray(req.body)) {
      return res.status(400).json({ error: 'Expected a tool state object' });
    }
    const configId = await getActiveConfig(req);
    await setSection(configId, `tool:${req.params.tool}`, req.body);
    logActivity({ tenantId: req.tenantId, userId: req.user.id, app: 'gtm-tools', action: 'save_tool_state', metadata: { tool: req.params.tool } });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── Serve frontend ────────────────────────────────────────
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

module.exports = app;
