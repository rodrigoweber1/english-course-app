# Cost-saving strategies and developer experience: many small apps on Supabase or alternatives

## 1. Exact current Supabase rules for extra projects, free tier, pausing, consolidation

### Takeaway
On Pro, every extra project is its own dedicated Postgres server billed hourly for compute (Micro ~ $10/month); the $10/month compute credit covers only one Micro, so each additional project adds about $10 (~9-10 EUR). Free plan allows 2 active projects with auto-pause after about a week of low activity; paused projects cost nothing. Consolidating apps into one project (schemas + RLS + shared Auth) is the commonly cited way to avoid the per-project fee, with isolation caveats.

### Cited Findings
- Each project on Pro runs its own dedicated Postgres instance and you are charged for that server's compute regardless of usage; "Each project you launch increases your monthly Compute costs." Usage quotas (egress, storage) are pooled across the organization — [Supabase billing docs](https://supabase.com/docs/guides/platform/billing-on-supabase)
- Compute is billed hourly (partial hour counts as full): Nano $0 (free plan only), Micro $0.01344/h (~$10/mo), Small ~$15, Medium ~$60, Large ~$111. In paid orgs Nano is billed at the Micro price — [Supabase compute docs](https://supabase.com/docs/guides/platform/manage-your-usage/compute)
- Paid plans include $10/month compute credits, covering one Micro/Nano project or part of larger ones; credits reset monthly, do not accumulate, and apply only to compute (not read replicas/branching compute) — [Supabase compute docs](https://supabase.com/docs/guides/platform/manage-your-usage/compute)
- Pro starts at $25/month; additional projects add their full compute cost; billing is per organization and plans cannot be mixed within one organization — [search summary of Supabase pricing/KB](https://supabase.com/pricing), [Supabase KB on pausing](https://supabase.com/kb/faqs/platform/free-project-pausing)
- Free plan: 2 active projects across all orgs where you are Owner/Admin; paused projects do not count toward the limit; no project in a Pro org is paused — [Supabase billing docs](https://supabase.com/docs/guides/platform/billing-on-supabase)
- Free project: 500 MB database, shared CPU, 500 MB RAM; paused if no sufficient database activity over a week; warning email about a week before; resume manually from dashboard — [Supabase pausing docs](https://supabase.com/docs/guides/platform/free-plan-pausing), [Supabase KB](https://supabase.com/kb/faqs/platform/free-project-pausing)
- Paused projects do not count toward compute usage — [Supabase compute docs](https://supabase.com/docs/guides/platform/manage-your-usage/compute)
- Compute hours are not covered by the Spend Cap — [Supabase compute docs](https://supabase.com/docs/guides/platform/manage-your-usage/compute)
- Community feature request asked for a cheaper middle tier ("$5 a month for 5 projects or $10 for 10"); no evidence found that Supabase adopted it — [Supabase community post](https://supabase.com/contribute/t/860-66969-7729-gd_D_kwDODMpXOc4Aph5x) (as summarized by search)
- Consolidation pattern: one project, per-app schemas (e.g. app_a, app_b), shared auth.users, RLS keyed on auth.uid(); "exposed schemas" is a project-wide setting so every app's publishable key can reach every exposed schema and RLS must do the real access control; never ship service_role to frontends — [Supabase community posts](https://supabase.com/contribute/u/funfunfunzig), [Lovable FAQ](https://lovable.dev/faq/backend/supabase/one-supabase-multiple-projects)
- Reported trade-offs of one shared DB: auth isolation, one service accidentally accessing another's data without isolation, and "things start to break under load" (anecdotal) — [DEV community](https://dev.to/haraf/best-practices-for-handling-multiple-schemas-in-the-same-database-across-applications-with-1bkp); Reddit users on r/lovable/r/Supabase suggest the same one-project approach — [r/Supabase thread mirror](https://reddit.zackpollard.pro/r/Supabase/comments/1ltoyw3/looking_for_advice_how_to_iterate_on_multiple_app)

### Inferences
- With one Pro org (25 USD) + 1 Micro covered by credit, N extra projects cost ~10 USD each; 1 USD ≈ 0.9 EUR so "about 10 EUR" fits. Consolidating N small apps into one project keeps total at $25 (or $0 if all apps fit the free tier in 2 projects and tolerate pausing).
- Pausing risk for free tier: a light-use app with no DB activity for a week gets paused; a scheduled keep-alive query is a known workaround pattern but I did not verify it in a cited source here (and may conflict with Supabase's intent).
- For a solo dev with light use, a single Pro project with schemas per app is the cheapest Supabase-native option; main downside is shared blast radius (one Micro instance, shared auth users, shared exposed-schema setting).

### Gaps
- Did not retrieve Supabase's own pricing page text to confirm current Pro base price/included quotas beyond secondary summary.
- Whether organizations can be used to dodge fees (e.g. multiple free orgs): the free limit is stated as across all orgs where you are Owner/Admin, so this is closed per docs; no further detail found.
- No Supabase-official guidance on multi-app-in-one-project found; only community posts.

## 2. Alternatives recommended by indie developers (2025-2026) and reported pitfalls

### Takeaway
Blog/DEV-community consensus: PocketBase (single binary, SQLite) on a cheap VPS is the favorite for many small side projects; Neon free tier (100 projects) is the favorite Postgres-compatible zero-cost option; Firebase Spark still works but with new Blaze requirements. Pitfalls: SQLite single-writer/vertical scaling, no Postgres extensions in PocketBase, scale-to-zero cold starts and tight storage caps on Neon, and policy churn at free tiers. Note: I found no genuine Hacker News 2025 threads via search; sources are mostly blog posts (often promotional).

### Cited Findings
- PocketBase is a single binary; runs on a Raspberry Pi 4; a $5/month VPS covers most side projects; self-hosted Supabase needs 7 containers and a VPS with at least 4 GB RAM (8 GB recommended) — [DEV: PocketBase vs Supabase](https://dev.to/selfhostingsh/pocketbase-vs-supabase-h1l), [DEV: PocketBase vs Supabase 2026](https://dev.to/truongandev/pocketbase-vs-supabase-which-backend-wins-in-2026-55ab)
- Solo-developer comparison: PocketBase better for small solo projects with predictable scale; Supabase safer if growing into a real business — [solodevstack](https://solodevstack.com/blog/pocketbase-vs-supabase-solo-developers)
- PocketBase pitfalls: embedded SQLite, serialized writes, vertical scaling only; poor fit for write-heavy high concurrency or Postgres extensions (PostGIS, pgvector); no Deno-style edge functions like Supabase — [DEV: PocketBase Cloud tour](https://dev.to/tienbuilds/10-side-projects-for-13month-a-tour-of-pocketbase-cloud-42) (author's promotional post), [search summary of comparisons](https://dev.to/selfhostingsh/pocketbase-vs-supabase-h1l)
- PocketBase Cloud (managed): Free 1 instance; Starter $5/mo per project; Pro from ~$13/mo dedicated 2 core/4 GB server that the author says can host ~10 instances; automated backups included (details unspecified); regions in Germany/Finland. Author's own claims, comment on post contradicts free-plan description — [DEV: PocketBase Cloud tour](https://dev.to/tienbuilds/10-side-projects-for-13month-a-tour-of-pocketbase-cloud-42)
- Neon Free plan: 100 projects, 10 branches/project, 100 CU-hours compute/project/month, 1 GB storage per project (20 GB total), 5 GB public transfer; compute scales to zero after 5 min inactivity; one comparison says 5-10 low-traffic apps under $10 total is feasible on Free — [Neon free plan FAQ](https://neon.com/faqs/free-plan-limits-and-quotas), [Neon FAQ multiple apps](https://neon.com/faqs/postgres-providers-multiple-apps-separate-databases-under-10) (vendor source). Older pages show a different (outdated) free tier of 1 project.
- Neon paid: Launch pay-as-you-go $0.106/CU-hour, $0.35/GB-month — [Activepieces Neon pricing summary](https://www.activepieces.com/blog/neon-pricing-2026-plans-free-tier-limits-and-costs.md)
- Firebase: Spark is free without card; Cloud Storage for Firebase requires Blaze since Feb 3 2026 (per a DEV guide); Firestore free quota 1 GiB, 50k reads/20k writes/20k deletes per day; Firebase pricing page says a new pricing structure takes effect Sept 1, 2026 (details not verified) — [Firebase pricing plans](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans), [DEV: Spark vs Blaze](https://dev.to/androve2k/spark-vs-blaze-the-firebase-pricing-guide-i-wish-id-read-sooner-onb)
- Unverified claim from a third-party guide that Turso announced (Oct 2026) it is joining Supabase; I could not confirm from Turso's site — [search summary citing DEV guide](https://dev.to/devtoolpicks/best-supabase-alternatives-for-indie-hackers-in-2026-honest-picks-2d73)
- Self-hosted Supabase estimated $12-25/month on a VPS; Supabase docs treat self-hosting as community-supported — [DreamHost guide](https://www.dreamhost.com/blog/self-host-supabase/)

### Inferences
- For this user (English-learning app, light use, Supabase Auth via REST + Postgres tables), the lowest-friction migrations keep Postgres: Neon (needs separate auth) or consolidating into one Supabase project. PocketBase requires rewriting auth/REST calls but bundles auth, files and realtime.
- Neon free has no built-in auth/REST; the app would need its own backend or something like Neon Auth/Data API (not verified here).

### Gaps
- No verified Hacker News or Reddit thread text on Appwrite, Convex, Cloudflare (D1/Workers) for side projects; not researched in depth because of tool-call budget.
- Turso status and Appwrite/Convex free-tier limits not verified.
- Firebase September 2026 pricing change details not retrieved.

## 3. Cheapest self-hosting options in EUR and maintenance trade-offs

### Takeaway
Hetzner remains the common choice but its small plans got more expensive in 2026 and availability of cost-optimized plans was reported disabled; third-party figures conflict, so verify live pricing. Oracle's free tier is risky (idle reclamation, terminations). Self-hosting shifts backups, updates and security entirely to the owner.

### Cited Findings
- Hetzner raised prices on April 1, 2026, with a further adjustment for new orders/rescales from June 15, 2026 (per official price-adjustment page title/search snippet; direct fetch returned 404) — [Hetzner price adjustment](https://docs.hetzner.com/general/infrastructure-and-availability/price-adjustment/), [Tom's Hardware](https://www.tomshardware.com/tech-industry/hetzner-to-raise-prices-by-up-to-37-percent-from-april-1)
- One comparison table: CX22 EUR 3.29 -> EUR 4.49 after April; CAX11 EUR 4.49 -> EUR 5.99 (Northflank table, step inferred); CX22 reportedly replaced by CX23, quoted at EUR 5.49 vs EUR 2.99 at launch — [agentdeals](https://agentdeals.dev/hetzner-pricing-2026), [Northflank](https://northflank.com/blog/hetzner-cloud-server-price-increases), [Bitdoze](https://www.bitdoze.com/hetzner-cloud-cost-optimized-plans/). These figures conflict with each other.
- Bitdoze reports the Create button disabled for all Cost-Optimized (CX/CAX) plans on dates through 20 Oct 2026; existing servers keep running — [Bitdoze](https://www.bitdoze.com/hetzner-cloud-cost-optimized-plans/)
- One solo dev moved from Supabase free tier to a Hetzner CPX32 at EUR 15/month for self-hosted Supabase, saying it suits those comfortable with Postgres and backups — [DEV: moved to self-hosted](https://dev.to/lambopoewert/moved-from-hosted-supabase-to-self-hosted-on-a-single-vps-heres-what-i-learned-after-weeks-in-2om1)
- Coolify does not make Supabase managed: you own host, credentials, updates, capacity and recovery; provider snapshots can be lost with the account, so keep independent offsite backups; "Redeploy latest" is not a safe update process — [Hetzner community Coolify+Supabase tutorial](https://community.hetzner.com/tutorials/coolify-supabase-deploy/), [WZ-IT](https://wz-it.com/knowledge/supabase/mit-coolify-installieren/)
- A Coolify review argues the managed-platform cost "buys you sleep" for a solo dev with one production app (opinion) — [DEV: Coolify review](https://dev.to/pickuma/coolify-review-self-host-your-own-vercel-alternative-on-a-vps-2iho)
- Hetzner itself publishes a one-click Coolify guide — [Hetzner blog](https://www.hetzner.com/blog/one-click-self-hosting-with-coolify/)
- Oracle Always Free: idle instances (95th percentile CPU < 10%) reclaimed after warnings; forum posts of accounts terminated without notice and A1 instances disabled (anecdotal); docs say free accounts stay active if used in past 60 days — [Oracle forum: reclamation](https://community.oracle.com/CustomerConnect/discussion/680560/oci-wants-to-reclaim-my-idle-always-free-instances-but-they-are-not-idle), [Oracle forum: termination](https://community.oracle.com/customerconnect/discussion/842370/my-always-free-account-was-terminated-without-any-reason-or-information)
- PocketHost / PocketBase Cloud style managed hosting at $5-13/month (see section 2).

### Inferences
- A realistic budget: ~EUR 5-6/month for the smallest Hetzner server running PocketBase (several instances, or Coolify with several small apps) plus ~EUR 1-3 for backup storage; self-hosting full Supabase needs a bigger box (~EUR 15) and is not cheaper than consolidating on one Pro project ($25) unless many apps are involved.
- Oracle free is not recommended for anything with user data given termination reports.

### Gaps
- No verified current Hetzner price table (official page 404 on fetch); no data on Fly.io, Railway, Render pricing in 2026 or on PocketHost's own pricing page.
- No quantified data on maintenance hours or security incidents for solo self-hosters.
- Cloudflare free tier (Workers/D1) and Appwrite/Convex not covered with sources.
