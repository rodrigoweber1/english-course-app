# Pricing and free tiers of Supabase alternatives for several small apps (fetched 2026-11-22)

Note: USD to EUR conversions below are my own rough estimate (about 0.9 EUR per USD); no exchange rate was sourced. Hetzner prices are in EUR, excl. VAT.

## What does Supabase really cost for a solo dev with multiple small projects?

### Takeaway
Supabase Free allows only 2 active projects and pauses after 1 week of inactivity. On Pro ($25/month) every extra project pays its full compute (Micro $10), with $10 credit covering only one. So N projects cost about $25 + (N-1) x $10 per month (about EUR 22 + 9 each).

### Cited Findings
- Free plan: 2 active projects; pause after 1 week without activity; 500 MB database; 1 GB file storage; 50,000 MAU; 5 GB egress (+5 GB cached) — [Supabase pricing](https://supabase.com/pricing)
- Pro from $25/month, includes $10/month compute credits (covers one Micro) — [Supabase pricing](https://supabase.com/pricing)
- Each additional project adds its full compute cost; the page's example: two Micro projects = $25 + $10 + $10 - $10 = $35/month — [Supabase pricing](https://supabase.com/pricing)
- Compute add-ons per month: Micro $10, Small $15, Medium $60, Large $110, XL $210, 2XL $410; billed hourly — [Supabase pricing](https://supabase.com/pricing)

### Inferences
- 3 projects on Pro = about $45/month; 5 projects = about $65/month (computed from the formula above, Micro each).
- Free tier is workable only for 2 projects that get weekly traffic, otherwise they pause.

### Gaps
- Pausing behaviour details (how long a paused project is restorable) were not re-verified. The Pro-plan "spend cap" and egress overage rates were not captured.

## Which services give the cheapest way to run several small projects (free tiers, per-project cost, or one plan covering many)?

### Takeaway
Best candidates: Neon (100 free projects, scale-to-zero, no pause but only a database), Cloudflare D1 (10 free DBs, 100k per paid account for $5/month Workers plan), Turso (100 free databases), and a single Hetzner VPS (about EUR 5.49/month) hosting many self-hosted instances. Per-project BaaS plans (PocketHost, Back4App, Supabase) get expensive quickly.

### Cited Findings
- Neon Free: 100 projects per organization; 100 CU-hours per project per month; scale to zero after 5 min (always on); 1 GB storage per project and 20 GB across all projects; 5 GB transfer per project; 60,000 MAU Auth per project. Launch plan is pay-as-you-go, no monthly minimum: $0.106 per CU-hour, $0.35 per GB-month — [Neon pricing](https://neon.com/pricing)
- Cloudflare D1 Free: 10 databases, 5 GB total, 5M rows read/day, 100k rows written/day; queries fail after limits until 00:00 UTC. Paid: 100,000 databases included then $0.10/database/month; 25B reads and 50M writes/month included; storage 5 GB included then $0.75/GB-month; no egress charge — [Cloudflare D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/)
- Cloudflare Workers Free: 100,000 requests/day, 10 ms CPU per invocation. Paid: minimum $5/month per account, 10M requests included then $0.30/M, no egress charges — [Cloudflare Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/)
- Turso Free: 100 databases, 5 GB storage, 500M rows read/month, 10M rows written/month. Paid: Developer $4.99, Scaler $24.92, Pro $416.58 per month — [Turso pricing](https://turso.tech/pricing)
- Convex Free/Starter: $0, 1-6 developers, deployment limit 40, 1M function calls, 0.5 GB database, 1 GB files, 1 GB egress, pay-as-you-go beyond. Professional $25 per developer/month (deployment limit 300, 25M calls, 50 GB DB, 100 GB files). The page gives no explicit project count — [Convex pricing](https://www.convex.dev/pricing)
- Firebase: free quotas are per Firebase project, and Spark needs no payment method; Blaze is pay-as-you-go (new eligible accounts may get $300 credit) — [Firebase pricing](https://firebase.google.com/pricing)
- Nhost Starter (free): $0, per page table 1 project, with project paused after 1 week of inactivity; FAQ says a free org can have many projects with only one active at once; 1 GB DB, 1 GB storage, 5 GB egress. Pro from $25/month incl. $15 compute credits, 10 GB DB, 50 GB storage, 50 GB egress. Plans are per organization — [Nhost pricing](https://nhost.io/pricing)
- Appwrite Cloud: Free-plan hitting a limit freezes the project (console read-only); Pro hitting limits keeps running with extra charges, optional budget caps. Serverless databases have $0 fixed fee; dedicated databases from $10/month; $10 monthly compute credit. On downgrade to Free per-project limits are 3 platforms, 2 webhooks, 100 teams, 1 database, 3 buckets, 5 functions. Plans apply to the whole organization, resources are allocated per project — [Appwrite pricing](https://appwrite.io/pricing), [Appwrite Pro docs](https://appwrite.io/docs/advanced/billing/pro)
- Back4App Free: up to five projects (as the page states), 25K requests/month, 250 MB DB, 1 GB transfer, 1 GB files, 1 app per subscription, 20 MB max upload. Paid is per app per month: MVP $15, Pay-as-you-go $80, Dedicated $400 — [Back4App pricing](https://www.back4app.com/pricing/backend-as-a-service)
- Xata: open source self-host free; Xata Cloud pay-as-you-go from $0.012/hr (micro, 1 GB RAM, about $9/month) plus $0.28/GB-month storage; free trial only, no free tier found — [Xata pricing](https://xata.io/pricing)
- PocketHost: $9.99/month per instance, $59.99/year, or $149.99 lifetime; per DEV Community post (written by a competitor, disclosed bias, July 2026): 250 MB DB and 10 GB files per slot, 7-day trial, no free tier — [DEV Community](https://dev.to/tienbuilds/pocketbase-cloud-vs-pockethost-an-honest-pricing-breakdown-5da5). PocketHost's own FAQ reportedly mentions a free tier limited to 1 project, and a banner says pricing is changing with PocketHost 3.0 — conflicting, see [PocketHost docs via search](https://pockethost.io/docs/overview/faq/)
- PocketBase Cloud (third-party, competitor-authored comparison): Free 1 instance (50 MB) + 5 frontends; Starter $5/month with extra instances $3 each; Pro from about $13/month for a dedicated server running many instances. Their table: 3 projects about $11/month, 10 projects about $13/month — [DEV Community](https://dev.to/tienbuilds/pocketbase-cloud-vs-pockethost-an-honest-pricing-breakdown-5da5)
- Backendless: page only says a free plan exists with no credit card; no figures found — [Backendless](https://backendless.com/pricing/)

### Inferences
- Cheapest multi-project (database + auth) options in rank order: self-hosted on one VPS (flat cost), Neon free (100 projects) or Turso free (100 DBs) if only DB is needed, Cloudflare D1 + Workers ($5/month for everything).
- Firebase fits several tiny apps well: free quotas are per project and no pausing was mentioned, but Cloud Functions need Blaze.
- Convex free tier looks fine for many small apps, but the project-count limit is unclear.

### Gaps
- Not fetched or not obtainable: Hasura Cloud, Directus Cloud, AWS Amplify pricing, Cloudflare R2, Vercel/Netlify marketplace integrations, Firebase number of free projects (per-account project cap), PocketBase Cloud official page, Appwrite Free/Pro numeric limits and price (page did not render them).

## What are the limits and gotchas (pausing, caps, commercial use)?

### Takeaway
Pausing: Supabase Free (1 week) and Nhost Free (1 week) pause; Neon suspends compute after 5 min but resumes on request (cold start), no data pause; Railway Free services sleep after 5-10 min idle. Hard caps: D1 Free queries fail past daily limit; Appwrite Free freezes project.

### Cited Findings
- Supabase Free pauses after 1 week of inactivity — [Supabase pricing](https://supabase.com/pricing)
- Nhost Free paused after 1 week inactivity; Nhost says it never stops a project for exceeding limits but charges for excess — [Nhost pricing](https://nhost.io/pricing)
- Neon scale-to-zero after 5 minutes, cannot be disabled on Free — [Neon pricing](https://neon.com/pricing)
- Firebase Phone auth has no free tier (per SMS on Blaze); Cloud Functions are not on Spark; new `.firebasestorage.app` buckets are not covered by Spark, only Blaze, and free quotas apply only in us-central1/us-west1/us-east1 — [Firebase pricing](https://firebase.google.com/pricing). Firestore Spark: 1 GiB, 20K writes/day, 50K reads/day, 20K deletes/day, 10 GiB/month egress; Auth 50K MAU; legacy storage 5 GB
- Appwrite Free: project freezes when limits are hit — [Appwrite pricing](https://appwrite.io/pricing)
- Cloudflare D1 Free: queries fail once daily limits hit — [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/)
- Back4App Free: 1 app per subscription, 25K requests/month, 1-day log retention — [Back4App pricing](https://www.back4app.com/pricing/backend-as-a-service)

### Inferences
- Firebase's Blaze requires a card, but with usage inside free quotas the bill is $0; monitor budgets since no hard cap by default (general knowledge, not verified here).
- Auth is the missing piece with Neon, D1, Turso, Xata (Neon offers Auth with 60k MAU per project).

### Gaps
- Commercial-use restrictions for free tiers were not found in the fetched pages (none were noted). Directus and Hasura licence/cloud terms not checked.

## What is the cheapest self-host path (one small VPS, cost in EUR)?

### Takeaway
A Hetzner Regular Performance server (CPX02, 1 vCPU / 1 GB RAM / 20 GB NVMe, 20 TB traffic in EU) from EUR 5.49/month excl. VAT can host several PocketBase instances (single Go binary); CPX12 (2 GB) EUR 9.99 or CPX22 (4 GB) EUR 16.99 for heavier stacks like Appwrite or self-hosted Supabase (those need several GB of RAM; general knowledge, not verified here).

### Cited Findings
- Hetzner Regular Performance EU (FSN1/NBG1/HEL1), from, excl. VAT: CPX02 1 vCPU/1 GB/20 GB NVMe EUR 5.49; CPX12 1 vCPU/2 GB/40 GB EUR 9.99; CPX22 2 vCPU/4 GB/80 GB EUR 16.99; CPX32 4 vCPU/8 GB/160 GB EUR 30.49; all with 20 TB traffic; some plans show "currently unavailable"; billed hourly with monthly cap — [Hetzner](https://www.hetzner.com/cloud/regular-performance/). Cost-Optimized from EUR 5.99 listed as currently unavailable — [Hetzner Cloud](https://www.hetzner.com/cloud)
- Fly.io: shared-cpu-1x 256 MB about $2.19/month continuous; volumes $0.15/GB-month; new accounts get $1 credit, after adding a card $5 monthly usage allowance — [Fly.io pricing](https://docs.fly.io/about/pricing)
- Railway: Free $0 with $1 credit, services sleep after 5-10 min idle, 0.5 GB RAM max; Hobby $5/month incl. $5 usage, always-on; rates about $10/GB RAM, $20/vCPU, $0.15/GB volume per month — [Railway pricing](https://railway.com/pricing)
- Xata open source is free to self-host with scale-to-zero — [Xata pricing](https://xata.io/pricing)

### Inferences
- One CPX02 at about EUR 5.49 (plus VAT, about EUR 6.5 for an EU consumer; VAT rate not sourced) hosting 3-5 PocketBase apps beats PocketHost ($9.99 each) and Supabase Pro ($10 per extra project) by a wide margin; cost is your own ops time (backups, updates, TLS via Caddy).
- Fly.io with one 256 MB machine per PocketBase app costs about $2.19 + volume (about $0.15-0.45) = about $2.5-3 per app, cheaper than PocketHost but more expensive than sharing a VPS beyond about 2 apps.
- Railway Hobby $5/month could host a few small always-on services within the $5 credit if idle usage is low (estimate from the rates above).

### Gaps
- Hetzner CX/CAX (Arm) pricing not retrieved; page showed only CPX. Self-hosted Supabase/Appwrite minimum RAM requirements not sourced here. Hasura, Directus, AWS Amplify, R2, Vercel/Netlify integrations and PocketBase official hosting docs not covered.
