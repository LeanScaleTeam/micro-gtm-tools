const { supabaseAdmin } = require('./supabase-client');

async function logActivity({ tenantId, userId, app, action, metadata = {} }) {
  try {
    await supabaseAdmin.from('tenant_activity_log').insert({
      tenant_id: tenantId, user_id: userId, app, action, metadata,
    });
  } catch (err) {
    console.error('Failed to log activity:', err.message);
  }
}

module.exports = { logActivity };
