# S&T Budget App — Smart Finance Edition v3.0

Cloud budget app built with React, Vite and Supabase.

## New in v3.0

- Improved mobile layout with a fixed bottom navigation bar
- 12 month history with income, expenses, savings and net cash flow
- Bill alerts with overdue, urgent, upcoming and paid states
- Optional browser bill notifications
- Enhanced savings goals with target dates and required monthly contribution
- Vehicle finance progress, months saved and extra-payment comparison chart
- Report centre with charts
- Downloadable PDF budget report
- Downloadable Excel workbook with Summary, Expenses, Transactions, Savings Goals and 12 Month History sheets
- Existing Supabase cloud sync, authentication, RLS, backup import/export and local cache remain intact

## Local setup

1. Run `npm install`
2. Copy `.env.example` to `.env.local`
3. Set:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
4. Run `npm run dev`

## Production / Vercel

The same two environment variables must exist in Vercel for Production. They are Vite browser configuration values; use the Supabase **publishable** key, never a secret/service-role key.

After pushing this version to GitHub, Vercel should deploy automatically. If not, redeploy the latest `main` branch commit.

## Supabase

No new database tables are required for v3.0. The new views use the existing transactions, bills, savings goals, debt and settings data already synced by the app.
