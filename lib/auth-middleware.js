const { supabaseAdmin } = require('./supabase-client');

async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization token' });
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const { data: memberships } = await supabaseAdmin
    .from('tenant_members')
    .select('tenant_id, role')
    .eq('user_id', user.id);

  req.user = user;
  req.memberships = memberships || [];

  const requestedTenant = req.headers['x-tenant-id'] || req.query.tenant_id;
  if (requestedTenant) {
    const membership = memberships.find(m => m.tenant_id === requestedTenant);
    if (!membership) return res.status(403).json({ error: 'Not a member of this tenant' });
    req.tenantId = requestedTenant;
    req.tenantRole = membership.role;
  } else if (memberships.length === 1) {
    req.tenantId = memberships[0].tenant_id;
    req.tenantRole = memberships[0].role;
  } else if (memberships.length === 0) {
    return res.status(403).json({ error: 'Not a member of any tenant' });
  }

  next();
}

module.exports = { requireAuth };
