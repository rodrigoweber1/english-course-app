# Feature parity of Supabase alternatives for small apps (as of Nov 2026)

Context: small web app, Supabase Auth via plain REST (no heavy SDK), DB stores user progress backups, few users, low traffic. Research depth limited (about 15 tool calls); several candidates have thin sourcing and are flagged in Gaps. Many comparison sources are vendor blogs or aggregators; treat as soft evidence.

## Which alternatives are closest to Supabase (Postgres, auth, RLS)?

### Takeaway
Only Neon (Data API + Managed Better Auth), Nhost, Xata and self-hosted Supabase keep real Postgres. Neon is the only one with an explicitly Supabase-shaped client API and RLS-based Data API, but it lacks storage, functions and realtime. PocketBase, Appwrite, Firebase, Convex, D1 and Turso all change the data model (SQLite, MariaDB or document), so they are functional replacements rather than parity.

### Cited Findings
- Neon is serverless Postgres with branching and scale-to-zero. One roundup says it has "no auth, no storage, no functions, no realtime" (as a database alone), and that Databricks acquired it last year — [DEV: Supabase alternatives 2026](https://dev.to/max4nhost/supabase-alternatives-in-2026-6of)
- Neon now offers Managed Better Auth plus a Neon Data API. Neon's guide says you swap the Supabase SDK for `@neon/neon-js`, set one URL variable, and most auth calls keep the same shape (`signUp`, `signInWithPassword`, `signInWithOAuth`, `getUser`, `getSession`, `signOut`). Existing `client.from()` queries work unchanged, and RLS is recommended for production — [Neon: migrate from Supabase](https://neon.com/docs/auth/migrate/from-supabase)
- Neon Auth gaps: no phone auth, no SAML SSO, no Web3 wallet auth; `updateUser()` does not accept `password` or `email`; email verification is not automatic (you build the UI) — [Neon: migrate from Supabase](https://neon.com/docs/auth/migrate/from-supabase)
- Neon Auth version/maturity is unclear: one Neon page says Better Auth 1.4.18 is supported, another pins 1.7.12, and an older overview marks Better Auth support Beta — [Neon/Better Auth search results](https://neon.com/docs/auth/migrate/from-supabase); [Better Auth Supabase guide](https://better-auth.com/docs/guides/supabase-migration-guide)
- Nhost: Postgres at the core, auth/storage/functions included, GraphQL API (Hasura-style/"Constellation" Go engine per one article). Access control is role-based row/column permissions in the query engine, not SQL RLS policies. Realtime via GraphQL subscriptions — [DEV: Supabase alternatives 2026](https://dev.to/max4nhost/supabase-alternatives-in-2026-6of)
- Appwrite: not Postgres. Own collection/document model per one source; another roundup says MariaDB. Strong self-hosting via docker-compose — [DEV: Supabase alternatives 2026](https://dev.to/max4nhost/supabase-alternatives-in-2026-6of); [search roundup of 2026 comparisons](https://uibakery.io/blog/supabase-alternatives)
- Convex: not Postgres; TypeScript backend functions, reactive queries by default, no ad-hoc SQL aggregation, steep learning curve — [DEV: Supabase alternatives 2026](https://dev.to/max4nhost/supabase-alternatives-in-2026-6of)
- Firebase: Firestore document model, strong offline-first realtime sync — [DEV: Supabase alternatives 2026](https://dev.to/max4nhost/supabase-alternatives-in-2026-6of)
- PocketBase: embedded SQLite, built-in auth management, realtime subscriptions, dashboard UI, REST-ish API, files stored in `pb_data`, runs as a standalone binary or Go framework, JS extension/migration hooks exist. Latest seen v0.42.3 — [PocketBase docs](https://pocketbase.io/docs/)
- Xata: vanilla Postgres platform with copy-on-write branching (with data). Its docs claim a free tier with no pausing and no cold starts. Xata's own comparison frames Supabase auth as a proprietary lock-in layer. I found nothing on whether Xata offers auth — [Xata vs Supabase](https://xata.io/compare/supabase); [Xata docs](https://xata.io/docs/concepts/how-it-works)
- Cloudflare D1 is SQLite on Workers. Free plan: 10 databases, 500 MB per DB, 5 GB per account, 5M rows read/day, 100k rows written/day, 7-day Time Travel — [Cloudflare D1 limits](https://developers.cloudflare.com/d1/platform/limits)
- Turso (libSQL/SQLite): free-tier numbers only from third-party comparisons, with conflicting figures (100 DBs/5 GB vs 500 DBs/1 GB) — [Turso vs D1](https://dev.to/theawesomeblog/turso-vs-cloudflare-d1-2026-which-edge-sqlite-database-wins-for-developers-19n9); [freetier.co](https://freetier.co/compare/cloudflare-d1-vs-turso)
- Self-hosted Supabase: full parity by definition (same Postgres/GoTrue/PostgREST/Realtime/Storage/Edge Runtime). Official minimum 4 GB RAM / 2 cores (8 GB+ recommended), about 11 containers; services can be removed from docker-compose to cut resources. A 2 GB VPS is "not reliably" enough. Supabase does not support self-hosted instances, so updates, backups and security are on you — [Supabase self-hosting docs](https://supabase.com/docs/guides/self-hosting/docker); [Contabo](https://contabo.com/blog/supabase-contabo-vps/); [SSD Nodes](https://www.ssdnodes.com/learn/self-host-supabase)
- Firebase Cloud Functions need the Blaze plan (billing account linked). Budget alerts do not cap spend. Some pricing pages mention changes effective Sept 1, 2026 (details unknown) — [Firebase pricing plans](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans)

### Inferences
- Closest to Supabase, in order: self-hosted Supabase (identical, but ops burden), then Neon with Data API and Neon Auth (same-shaped client, RLS, but missing storage/functions/realtime), then Nhost (Postgres but GraphQL and non-SQL permissions), then Xata (Postgres only, auth unknown).
- For a "user progress backup" workload (per-user JSON blobs plus auth), RLS is only needed if the browser talks to the DB directly. An app that already calls Supabase Auth by REST likely also calls PostgREST by REST with a user JWT, so Neon Data API (PostgREST-like) or Supabase-style RLS compatibility matters. Verify Neon Data API's raw REST format matches PostgREST (not confirmed in sources).
- PocketBase, Appwrite, Firebase would require rewriting every REST call (different endpoints and auth token formats), even though they are easy to use.

### Gaps
- Not researched with sources: Directus, Back4App, Convex auth/RLS-equivalent details, Neon Data API raw REST shape, whether Xata has built-in auth, PocketBase API rules/OAuth/password-reset details (docs page fetched did not cover them), D1/Workers auth options, Turso auth.
- Nhost's Hasura vs "Constellation" engine claim comes from a single article and is not verified against Nhost docs.

## Which are easiest to migrate to from Supabase (auth users export, data export, API compatibility)?

### Takeaway
Neon is the lowest-code-change path for the API surface but cannot import existing password hashes (users must re-register or use OAuth). Appwrite has a built-in Supabase migration tool but drops OAuth users and functions. PocketBase and Firebase have no found Supabase-specific guide. Supabase stores bcrypt hashes in `auth.users.encrypted_password`, which many auth vendors accept.

### Cited Findings
- Supabase password hashes are bcrypt in `auth.users.encrypted_password`, readable only via direct DB access or `pg_dump` of the `auth` schema (not through the API) — [Clerk migration guide](https://clerk.com/docs/guides/development/migrating/supabase); [WorkOS](https://workos.com/docs/migrate/supabase)
- WorkOS, Clerk, Kinde, PropelAuth publish Supabase user-import guides (bcrypt-compatible) — [WorkOS](https://workos.com/docs/migrate/supabase); [Kinde](https://docs.kinde.com/get-started/switch-to-kinde/supabase-to-kinde/); [PropelAuth](https://docs.propelauth.com/migrations/supabase)
- Better Auth has its own Supabase migration guide: create Better Auth tables, run a script moving users and accounts; include only plugins for features you used — [Better Auth guide](https://better-auth.com/docs/guides/supabase-migration-guide)
- Neon Managed Better Auth: "Existing password-based users cannot migrate due to different hashing algorithms"; guide is best for new projects — [Neon: migrate from Supabase](https://neon.com/docs/auth/migrate/from-supabase)
- Appwrite's Supabase migration: moves database (not every Postgres feature supported) and storage (using project URL + service_role key). Not migrated: functions, advanced indexes, Postgres functions, scheduling, OAuth users (must re-authenticate). The page does not state whether auth passwords migrate — [Appwrite migration docs](https://appwrite.io/docs/advanced/migrations/supabase)
- Firebase Auth import supports BCRYPT among hash algorithms (CLI `auth:import`, Admin SDK up to 1000 users per call). No Supabase-to-Firebase guide was found; guides run the other direction — [Firebase import users](https://firebase.google.com/docs/auth/admin/import-users); [Supabase: from Firebase Auth](https://supabase.com/docs/guides/migrations/firebase-auth)
- PocketBase: no Supabase migration guide found. A consultancy blog says bcrypt import would need a custom script (unverified) — [Rapidevelopers](https://www.rapidevelopers.com/md/no-code-to-code/how-to-migrate-pocketbase-project-to-code)
- Xata claims Supabase's auth is proprietary lock-in, while its Postgres is portable via `pg_dump` — [Xata vs Supabase](https://xata.io/compare/supabase); [DEV: alternatives](https://dev.to/max4nhost/supabase-alternatives-in-2026-6of)

### Inferences
- With only a few users, the practical migration cost of "users re-register or reset password" is small. Password reset email flow gives a cheap workaround for any target that cannot import hashes.
- Data migration is trivial for a backup-blob table on any target (dump JSON, load). Auth and REST call rewrite is the real cost.
- Easiest ranking for this app: self-hosted Supabase (zero change), Neon (SDK swap, re-register users), Firebase/Appwrite/PocketBase (rewrite REST calls, bcrypt import possible for Firebase).

### Gaps
- Whether PocketBase can take precomputed bcrypt hashes (PocketBase uses bcrypt per my background knowledge, not confirmed here).
- Whether Neon Data API/Auth expose plain REST endpoints usable without the SDK (relevant since the app avoids heavy SDKs).
- Directus/Back4App/Convex/D1/Turso migration paths not researched.

## Maturity, community, lock-in and reliability risks

### Takeaway
PocketBase is pre-1.0 with a single maintainer; Nhost shows reduced activity; Neon is now owned by Databricks; Firebase has the highest data-model lock-in. Supabase's own free tier pauses after a week of inactivity, the main reliability risk for this use case.

### Cited Findings
- PocketBase: "full backward compatibility is not guaranteed before reaching v1.0.0"; not recommended for production-critical apps unless you accept reading changelogs and doing manual migration steps — [PocketBase docs](https://pocketbase.io/docs/)
- PocketBase: about 60k GitHub stars, single maintainer, an auth-bypass CVE earlier in 2026 patched quickly, runs on a $5 VPS, single-node SQLite with no horizontal scale path — [DEV: Supabase alternatives 2026](https://dev.to/max4nhost/supabase-alternatives-in-2026-6of)
- Nhost: no acquisition or shutdown reports found; plans $0 Starter (pauses after 1 week inactivity per Toolradar), Pro from $25/mo, Team from $599. Blog output fell from 27 posts in 2022 to 7 across 2025-2026 (a weak activity signal) — [Toolradar](https://toolradar.com/tools/nhost/pricing); [Plushcap trend report](https://www.plushcap.com/trends/reports/trend-report-2026-05-26-nhost); [Nhost pricing](https://nhost.io/pricing)
- Supabase Free: 2 active projects, projects paused after a week of low activity (Pro and above never paused); paused projects don't count against the quota; free has no backups/PITR; about 500 MB DB, 1 GB files, 50k MAU per third-party sources — [Supabase pause FAQ](https://supabase.com/kb/faqs/platform/free-project-pausing); [DEV: Supabase free tier](https://dev.to/mahdi_benrhouma_fe1c6005/supabase-free-tier-limits-in-2026-what-you-actually-get-and-when-you-will-hit-them-4mhe)
- One blog claims a Data API grants change affecting existing free projects from Oct 30, 2026; no official confirmation found — [DEV: Supabase free tier](https://dev.to/mahdi_benrhouma_fe1c6005/supabase-free-tier-limits-in-2026-what-you-actually-get-and-when-you-will-hit-them-4mhe)
- Cloudflare: changelog says from Sept 1, 2026 D1 queries on Free fail once daily row read/write limits are exceeded; older notes say enforcement began Feb 2025 (conflict) — [Cloudflare changelog](https://developers.cloudflare.com/changelog/post/2026-09-01-d1-free-tier-limit-enforcement/); [D1 release notes](https://developers.cloudflare.com/d1/platform/release-notes)
- Appwrite and Firebase: higher lock-in because Postgres escape hatches (`pg_dump`, SQL) are absent; Firebase leaving means reworking the data model — [DEV: Supabase alternatives 2026](https://dev.to/max4nhost/supabase-alternatives-in-2026-6of)
- Xata free tier claimed to have no pausing (vendor claim); Xata Cloud usage-based $0.012/hr plus $0.28/GB-month per a 2026 review page — [Xata docs](https://xata.io/docs/concepts/serverless-data-platform); [Toolradar Xata](https://toolradar.com/tools/xata)
- Roundup scoring (small EU bootstrapped team): Supabase 4.40/5, PocketBase 3.95, Appwrite 3.90, Firebase 3.70; other guides advise not switching if Supabase works — [MEAN CEO](https://blog.mean.ceo/alternatives-to-supabase/); [search roundup](https://uibakery.io/blog/supabase-alternatives)

### Inferences
- A 1-week-inactivity pause on Supabase Free is the key operational pain for a rarely used backup service. Cheapest fixes: a scheduled ping, or Pro at $25/mo.
- Self-hosting (PocketBase or Supabase) trades pause risk for backup, patching and uptime duty on the owner.
- Neon free plan details (project count, compute pause/scale-to-zero cold start) were not verified in this pass.

### Gaps
- Nothing sourced on Convex, Directus, Back4App, Turso maturity or outage history.
- No primary-source Neon free-plan limits. A Neon page title mentions "1 GB Postgres storage per project, 100 projects" but I did not open it.
- No outage/incident history for any vendor.

## Can a single instance/project host several small apps (multi-tenant on one project)?

### Takeaway
Yes on Supabase: one project, one schema (or prefixed tables) per app, with a shared `auth.users` pool and per-app profile tables. Isolation of login identities between apps is weak. Other candidates were not researched on this point.

### Cited Findings
- Common pattern: one project, a schema per app, shared `auth.users`, app data linked through a `public` profile table — [search results incl. Supabase community](https://github.com/orgs/supabase/discussions/1615); [supabase-schemas (PyPI)](https://pypi.org/project/supabase-schemas/)
- A PyPI tool runs 80+ isolated per-app schemas in one Supabase instance, each with migration tracking and an `auth.users` view — [supabase-schemas](https://pypi.org/project/supabase-schemas/)
- Custom schemas must be added to the Data API "exposed schemas" setting in the dashboard to be served — [DEV: schema design with Supabase](https://dev.to/pipipi-dev/schema-design-with-supabase-partitioning-and-normalization-4b7i)
- Supabase Auth has one global identity namespace; per-app login isolation is awkward. `service_role` key bypasses all RLS and must never ship to frontends, more critical when apps share a DB — [Supabase community](https://supabase.com/contribute/u/rmorgado); [Supabase community post](https://supabase.com/contribute/u/funfunfunzig)
- Free tier allows 2 active projects, so one shared project for several apps also avoids that limit and pausing multiplied across projects — [Supabase pause FAQ](https://supabase.com/kb/faqs/platform/free-project-pausing)
- D1 free plan: 10 databases per account; Turso (unverified) 100+ databases free — [Cloudflare D1 limits](https://developers.cloudflare.com/d1/platform/limits); [freetier.co](https://freetier.co/compare/cloudflare-d1-vs-turso)
- Neon title snippet: free plan reportedly includes 100 projects (unverified; page not opened) — [Neon docs](https://neon.com/docs/auth/migrate/from-legacy-auth)

### Inferences
- For apps that share users (same login), the single-project, schema-per-app approach is clean. For apps with separate user bases, prefix a unique `app_id` column in profiles and RLS policies, or accept a shared user pool. Using several apps on one free project also means a single keep-alive covers all.
- PocketBase: one instance can hold many collections, and a single binary handles many apps, but this is my inference; not sourced.

### Gaps
- No sourced evidence on multi-app hosting for PocketBase, Appwrite (projects), Firebase (projects), Nhost, Directus, Back4App.
- No official Supabase doc found specifically endorsing schema-per-app.
