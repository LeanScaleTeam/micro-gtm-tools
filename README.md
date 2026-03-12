# Micro GTM Tools

Seven interactive B2B go-to-market planning tools with shared dark theme and Supabase auth.

**Live:** https://microgtmtools.netlify.app

## Tools

| Tool | Description |
|------|-------------|
| **SaaS Growth Model** | Multi-segment 24-month revenue, headcount, and profitability projections |
| **ICP Matrix** | Ideal Customer Profile and Persona matrix builder with tier-based scoring |
| **Sales Capacity Planner** | Rep-level capacity forecasting with ramp schedules |
| **Marketing Channel Planner** | Channel-level budget allocation with pipeline projections |
| **GTM Lifecycle Builder** | Lifecycle stages with entry/exit criteria and visual flow |
| **Quote-to-Cash Mapper** | Quote-to-cash processes across Sales-Led, PLG, Hybrid, and Partner flows |
| **Lead Source Taxonomy** | Lead source taxonomy with attribution methodology |

## Local Development

```bash
npm install
cp .env.example .env  # Add Supabase credentials
npm run dev           # http://localhost:3850
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_ANON_KEY` | Yes | Supabase public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (server-side) |

## Stack

- Vanilla JS SPA, Express 5, Supabase Auth, Netlify Functions, JSONB sections storage

---
*Part of the [LeanScale Microapp Suite](https://lsapps.netlify.app)*
