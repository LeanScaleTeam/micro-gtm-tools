#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const url = process.env.SUPABASE_URL || '';
const anonKey = process.env.SUPABASE_ANON_KEY || '';

if (!url || !anonKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables');
  process.exit(1);
}

const output = `// Auto-generated at build time — do not edit
window.__SUPABASE_URL__ = '${url}';
window.__SUPABASE_ANON_KEY__ = '${anonKey}';
`;

const outDir = path.join(__dirname, '..', 'public', 'lib');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'env.js'), output);
console.log('Generated public/lib/env.js');
