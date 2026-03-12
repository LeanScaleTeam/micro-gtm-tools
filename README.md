# GTM Planning Tools

Seven interactive B2B go-to-market planning tools, built as single-page HTML apps with a shared dark theme and Supabase auth + state persistence.

## Tools

| Tool | Description |
|------|-------------|
| **SaaS Growth Model** | Multi-segment 24-month revenue, headcount, and profitability projections |
| **ICP Matrix** | Ideal Customer Profile and Persona matrix builder with tier-based scoring |
| **Sales Capacity Planner** | Rep-level capacity forecasting with ramp schedules and segment templates |
| **Marketing Channel Planner** | Channel-level budget allocation with pipeline and funnel projections |
| **GTM Lifecycle Builder** | Define lifecycle stages with entry/exit criteria, owners, and visual flow |
| **Quote-to-Cash Mapper** | Map quote-to-cash processes across Sales-Led, PLG, Hybrid, and Partner flows |
| **Lead Source Taxonomy** | Build and organize lead source taxonomy with attribution methodology |

## Setup

```bash
cp .env.example .env
# Fill in Supabase credentials
npm install
npm run dev
```

## Deploy

Deployed via Netlify. Environment variables are injected at build time into `public/lib/env.js`.

## Architecture

- **Frontend:** Vanilla HTML/JS with shared `theme.css` and `nav.js`
- **Backend:** Express API (tool state CRUD only) via Netlify Functions
- **Auth:** Supabase Auth with shared `auth-client.js`
- **Storage:** JSONB sections in `mc_configs` / `mc_config_sections` tables
