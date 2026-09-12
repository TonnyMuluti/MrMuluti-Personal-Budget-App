# S&T Budget App v5.1 — Visual Edition

Premium visual refresh of the v5.0.1 finance app. No new Supabase migration is required. Includes upgraded dashboard gauges, vehicle payoff visuals, goal progress graphics, transaction/bill chips, refined dark mode, mobile navigation, motion, and polished empty/loading states.

# S&T Budget App v5.0.1 — Final Complete Edition

The final v5 release combines the six selected upgrades into one deployable Vite/React/Supabase app:

1. Goal Priority System — Critical/High/Medium/Low priorities, goal types, ordering, pause/resume, milestones, minimum monthly contributions and recommended allocations.
2. PWA Installation — installable app shell, icons, manifest, service worker, update checks and standalone support.
3. Shared Household Budgeting — households, Owner/Partner/Viewer roles, invitations, shared transactions, bills, goals and contributions while personal data stays private.
4. S&T Financial Assistant+ — Budget Coach, Debt Coach, Savings Planner and What-If calculations using live app data.
5. Offline Mode — IndexedDB snapshot queue, online/offline status, automatic replay to Supabase and installable offline app shell.
6. Vehicle Finance Dashboard+ — vehicle finance details, principal-aware amortisation, extra-payment payoff estimates, interest/months saved, target-payment estimate and payment history.

## Database
Run these migrations in order if they have not already been run:

- `supabase-v4-migration.sql`
- `supabase-v5-migration.sql`
- `supabase-v5-final-migration.sql`

If the first two are already installed, run only `supabase-v5-final-migration.sql` before using household invite acceptance.

## Environment
Create `.env.local` locally (never commit it):

```env
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

## Run

```bash
npm install
npm audit
npm run build
npm run dev
```

## Deploy
Push to the existing GitHub repository. Vercel can deploy the Vite project automatically. Keep `.env.local` excluded and configure the two Vite Supabase environment variables in Vercel.


## v5.0.1 Debt Payoff Fix
- Restores the missing snowball/avalanche payoff simulation used by the Debt Payoff page.
- Keeps the vehicle-finance account selected consistently when debts are loaded from Supabase.
- Makes debt edits work even when upgrading from older single-debt data.
