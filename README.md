# Mobile Data Price Index

**What metered mobile data costs in 193 countries — USD per megabyte and per gigabyte, refreshed daily from a live price list.**

This is the retail rate card of [Roamzy](https://roamzy.io), a global eSIM that bills **per megabyte at the destination country's rate** — no packages, no validity windows. Because every row is a price a customer is actually charged today, the dataset is a clean, comparable proxy for the consumer cost of mobile data by country: one provider, one currency, one unit, every country on the same footing.

<!-- stats:start -->
- **Countries:** 193 (5 on a premium tier)
- **Cheapest:** Austria — $0.61/GB ($0.0006/MB)
- **Median:** $3.69/GB
- **Most expensive:** Comoros — $180.02/GB
- **Under $1/GB:** 32 countries · **Under $5/GB:** 142 countries
- **Price list version:** `01082026` · **Last data change:** 2026-09-07
<!-- stats:end -->

## Files

| File | What it is |
|---|---|
| [`data/latest.csv`](data/latest.csv) | Current rates, one row per country |
| [`data/latest.json`](data/latest.json) | Same data with dataset metadata (`prices_version`, `fetched_at`) |
| [`data/history/`](data/history/) | One CSV snapshot per data change, named by date — the price history |
| [`datapackage.json`](datapackage.json) | [Frictionless Data](https://specs.frictionlessdata.io/data-package/) descriptor with the column schema |
| [`scripts/refresh.mjs`](scripts/refresh.mjs) | The refresh script (Node ≥ 20, no dependencies) |

## Columns

| Column | Type | Meaning |
|---|---|---|
| `slug` | string | Stable identifier, e.g. `esim-japan` |
| `iso_alpha_2` | string | ISO 3166-1 alpha-2 country code |
| `name` | string | Country name (English) |
| `zone` | string | Provider pricing zone — see glossary below |
| `usd_per_mb` | number | Retail price of one megabyte, USD, 4 decimals |
| `usd_per_gb` | number | The same rate per gigabyte (`usd_per_mb × 1024`), USD, 2 decimals |
| `premium` | 0/1 | 1 = country is on the premium (satellite / restricted-market) tier |

**Zone glossary.** `EU 33 REG` — the EU/EEA regulated-roaming zone; `EU no Reg` — European countries outside it; `SNG` — CIS (СНГ). Single-country zones (`France`, `Turkey`, `UAE`, …) are countries priced on their own.

## Quick use

```bash
curl -sL https://raw.githubusercontent.com/roamzy-io/mobile-data-price-index/main/data/latest.csv | head
```

```python
import pandas as pd
df = pd.read_csv("https://raw.githubusercontent.com/roamzy-io/mobile-data-price-index/main/data/latest.csv")
df.sort_values("usd_per_gb").head(10)          # cheapest countries
df.groupby("zone")["usd_per_gb"].median()      # median by zone
```

Live, always-current equivalents on the source site: [`/api/v1/catalog`](https://roamzy.io/api/v1/catalog) (JSON, CORS-open, no auth) and [`/data-price-index.csv`](https://roamzy.io/data-price-index.csv). A human-readable view with rankings is at [roamzy.io/prices](https://roamzy.io/prices).

## Methodology and caveats — read before citing

- **What the number is.** The per-megabyte retail price Roamzy charges for data used in that country, in USD (settled in USDT/USDC at par). It is a *price*, not a *cost*: it includes the provider's margin.
- **One provider.** This is not a survey across carriers. It is useful precisely because it is uniform — same product, same unit, same day for all 193 countries — which is what most cross-country comparisons lack. For "cheapest SIM in country X" questions, local prepaid offers can be lower.
- **Metered, not packaged.** Package prices (e.g. "5 GB / 30 days") are not comparable with per-MB rates without assuming the package is fully used. If you compare against packages, divide the package price by the *data you would actually consume*, not by its nominal size.
- **Versioning.** `prices_version` in `latest.json` identifies the upstream price list; `data/history/` keeps every prior state. Cite the version or the snapshot date, not "latest".
- **Refresh.** A GitHub Action fetches the live catalog daily and commits only when something changed, so the commit log is the change log.

## Cite

> Roamzy. *Mobile Data Price Index* (dataset), version `<prices_version>`, retrieved `<date>`. https://github.com/roamzy-io/mobile-data-price-index

A `CITATION.cff` is included — GitHub's **"Cite this repository"** button renders APA and BibTeX.

## License

Data: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) — use it for anything, credit "Roamzy (roamzy.io)". Scripts: MIT.

## Related

- [roamzy-io/mcp-server](https://github.com/roamzy-io/mcp-server) — an AI agent can query these rates and buy an eSIM through MCP without an account.
- [roamzy.io/ai-agents](https://roamzy.io/ai-agents) — how agents use it; [roamzy.io/prices](https://roamzy.io/prices) — the rates, ranked.
