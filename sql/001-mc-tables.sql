-- Mission Control tables
-- Uses JSONB sections pattern for tool state + dashboard cache

CREATE TABLE IF NOT EXISTS mc_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL DEFAULT 'default',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, name)
);

CREATE TABLE IF NOT EXISTS mc_config_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id uuid REFERENCES mc_configs(id) ON DELETE CASCADE NOT NULL,
  section text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz DEFAULT now(),
  UNIQUE(config_id, section)
);

-- RLS
ALTER TABLE mc_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE mc_config_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY mc_configs_tenant ON mc_configs
  USING (tenant_id IN (SELECT user_tenant_ids()));

CREATE POLICY mc_sections_tenant ON mc_config_sections
  USING (config_id IN (
    SELECT id FROM mc_configs WHERE tenant_id IN (SELECT user_tenant_ids())
  ));
