// Refresh the dataset from the live Roamzy catalog.
//
// Source of truth is https://roamzy.io/api/v1/catalog — the same JSON that
// bills customers, so the mirror here can never drift from what is charged.
// No dependencies: Node 20 fetch + fs. Idempotent: re-running with unchanged
// upstream data produces no diff, so the daily workflow commits only on change.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';

const SOURCE = 'https://roamzy.io/api/v1/catalog';
const res = await fetch(SOURCE, { headers: { 'user-agent': 'mobile-data-price-index/refresh (+https://github.com/roamzy-io/mobile-data-price-index)' } });
if (!res.ok) throw new Error(`catalog fetch failed: ${res.status}`);
const src = await res.json();

const countries = [...src.countries]
  .map((c) => ({
    slug: c.slug,
    iso_alpha_2: c.iso_alpha_2,
    name: c.name,
    zone: String(c.zone ?? '').replace(/ /g, ' '),
    usd_per_mb: Number(c.rate_usdt_per_mb.toFixed(4)),
    usd_per_gb: Number(c.rate_usdt_per_gb.toFixed(2)),
    premium: c.is_premium ? 1 : 0,
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

const version = String(src.prices_version ?? '');
const today = new Date().toISOString().slice(0, 10);

// ── CSV ────────────────────────────────────────────────────────────────
const q = (s) => `"${String(s).replace(/"/g, '""')}"`;
const header = 'slug,iso_alpha_2,name,zone,usd_per_mb,usd_per_gb,premium';
const csv = [header, ...countries.map((c) =>
  [c.slug, c.iso_alpha_2, q(c.name), q(c.zone), c.usd_per_mb.toFixed(4), c.usd_per_gb.toFixed(2), c.premium].join(','),
)].join('\n') + '\n';

// ── JSON ───────────────────────────────────────────────────────────────
const prevJson = existsSync('data/latest.json') ? JSON.parse(readFileSync('data/latest.json', 'utf8')) : null;
const unchanged = prevJson && prevJson.prices_version === version
  && JSON.stringify(prevJson.countries) === JSON.stringify(countries);

const json = {
  dataset: 'Mobile Data Price Index',
  publisher: 'Roamzy',
  source: SOURCE,
  license: 'CC-BY-4.0',
  currency: 'USD',
  unit: 'price per megabyte and per gigabyte of metered mobile data',
  prices_version: version,
  // Keep the previous fetch date when nothing changed, so a no-op refresh
  // produces no diff and the history stays honest.
  fetched_at: unchanged ? prevJson.fetched_at : new Date().toISOString(),
  country_count: countries.length,
  countries,
};

// ── stats for README ───────────────────────────────────────────────────
const gb = countries.map((c) => c.usd_per_gb).sort((a, b) => a - b);
const median = gb.length % 2 ? gb[(gb.length - 1) / 2] : (gb[gb.length / 2 - 1] + gb[gb.length / 2]) / 2;
const cheapest = countries.reduce((m, c) => (c.usd_per_gb < m.usd_per_gb ? c : m));
const dearest = countries.reduce((m, c) => (c.usd_per_gb > m.usd_per_gb ? c : m));
const under1 = countries.filter((c) => c.usd_per_gb < 1).length;
const under5 = countries.filter((c) => c.usd_per_gb < 5).length;
const stats = [
  `- **Countries:** ${countries.length} (${countries.filter((c) => c.premium).length} on a premium tier)`,
  `- **Cheapest:** ${cheapest.name} — $${cheapest.usd_per_gb.toFixed(2)}/GB ($${cheapest.usd_per_mb.toFixed(4)}/MB)`,
  `- **Median:** $${median.toFixed(2)}/GB`,
  `- **Most expensive:** ${dearest.name} — $${dearest.usd_per_gb.toFixed(2)}/GB`,
  `- **Under $1/GB:** ${under1} countries · **Under $5/GB:** ${under5} countries`,
  `- **Price list version:** \`${version}\` · **Last data change:** ${(json.fetched_at).slice(0, 10)}`,
].join('\n');

// ── write ──────────────────────────────────────────────────────────────
if (!unchanged) {
  writeFileSync('data/latest.csv', csv);
  writeFileSync('data/latest.json', JSON.stringify(json, null, 2) + '\n');
  mkdirSync('data/history', { recursive: true });
  writeFileSync(`data/history/${today}.csv`, csv);
}
const readme = readFileSync('README.md', 'utf8');
const block = `<!-- stats:start -->\n${stats}\n<!-- stats:end -->`;
const next = readme.replace(/<!-- stats:start -->[\s\S]*?<!-- stats:end -->/, block);
if (next !== readme) writeFileSync('README.md', next);

// datapackage.json carries the version so consumers can pin it.
const dp = JSON.parse(readFileSync('datapackage.json', 'utf8'));
if (dp.version !== version) { dp.version = version; writeFileSync('datapackage.json', JSON.stringify(dp, null, 2) + '\n'); }

console.log(unchanged ? `no change (version ${version})` : `refreshed: ${countries.length} countries, version ${version}, snapshot data/history/${today}.csv`);
