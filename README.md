# v5.3.2 — Delete All Debts Fix

This release adds a dedicated **Delete All Debts** action on Debt Payoff. It clears every debt account, clears vehicle payment history, updates local storage immediately, deletes cloud debt rows directly, and performs a final empty-state cloud save so deleted records do not return after refresh. Individual debt deletion also now deletes the exact Supabase row first before saving the remaining list.

No new Supabase migration is required.

# S&T Budget App v5.2 — Add & Delete Edition

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


## v5.2 Add & Delete Edition

Adds consistent Add and Delete controls across editable records: monthly expenses, transactions, bills, savings goals, debt accounts, vehicle payment history, net-worth assets, custom categories, household transactions, household bills, household goals and household contributions. Household owners can delete a household, and invitations can be declined. Derived views such as Dashboard, Bill Alerts, Money Calendar, Monthly History, Annual Overview, Reports and Insights continue to update automatically from their source records. Delete actions use confirmation prompts.


## v5.2.1 Delete Persistence Fix
- Fixed Monthly Budget deletions returning after refresh.
- Empty cloud collections now stay empty instead of being repopulated from starter data.
- Persisted expense deletions are sent to Supabase immediately, while normal edits continue using autosave.
- Debt collections can now remain empty without recreating the starter vehicle debt.


## v5.3 Interactive Edition
- Grouped collapsible sidebar navigation to reduce visual overload.
- Sticky quick-access navigation for Dashboard, Budget, Transactions, Debt and Goals.
- Premium hover effects, shimmer interactions, icon motion and card lift.
- Animated page transitions with reduced-motion accessibility support.
- Keeps the v5.2.1 delete-persistence fix.


## v5.3.1 Debt Delete Fix
- Vehicle Finance can now be deleted directly from Debt Payoff.
- Every debt account has a delete control, including the last remaining debt.
- Empty debt lists remain empty after refresh and cloud sync.
- Deleting Vehicle Finance also clears its payment history.
- Add Vehicle Finance and Add Debt controls are available after deletion.


## v5.3.3
- Fixes localhost showing stale v5.3.0/v5.3.2 UI by unregistering old service workers and clearing S&T caches during local development.
- Keeps Delete Vehicle Finance and Delete All Debts from v5.3.2.


## v5.3.5 Auto-hide Sidebar
Desktop sidebar is compact by default and smoothly expands when hovered or keyboard-focused. Mobile drawer behaviour is unchanged.


## v5.3.7
Desktop sidebar is fully hidden. Move the pointer to the far-left 12px edge to reveal it; it closes when the pointer leaves. There is no permanent arrow/tab.


## v5.3.9
Desktop hidden sidebar now uses a visible three-line hamburger Menu button at the top-left. Click it to open or close the sidebar.


## v5.4.0 — Integrated top-bar menu
- Removed the floating hamburger control from the page edge.
- Added the three-line navigation button inside the white top header, directly before the page title.
- Desktop sidebar now opens and closes on click only.
- Clicking the dimmed page area closes the sidebar.
- Removed hover-to-open behaviour on desktop.
- Mobile navigation behaviour remains unchanged.


## v5.4.1 Visual Finance Edition
Adds a compact, page-specific visual banner to every main app page. Three supplied finance images are bundled locally; additional finance-planning photography uses free Pexels image endpoints and therefore loads when online. The banners retain a dark overlay for legibility and collapse cleanly on mobile.


## v5.4.3 Midnight Finance Edition
Page imagery is now integrated as blended background artwork with navy/teal overlays and a soft fade into the app content, matching the visual finance concept while preserving readability.


## v5.4.3 Midnight Finance Edition
Applied the approved dark navy/glass visual direction across the app: blended page imagery, glass cards, blue/teal accents, dark tables/forms, harmonised charts, and responsive styling. Existing finance logic, Supabase sync, PWA/offline behaviour, and topbar menu are unchanged.
