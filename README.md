# MrMuluti Personal Budget 2026 Pro — Cloud Edition v2.1

React + Vite personal finance app with Supabase authentication, PostgreSQL cloud storage, Row Level Security, automatic sync, local cache, backup import/export, monthly budget, transactions, bills, savings goals, vehicle payoff, annual overview, what-if planning and insights.

## Local environment
Create `.env.local` beside `package.json`:

```text
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_KEY
```

Never add a service-role or secret key to this browser app.

## Local run

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
npm run preview
```

## Vercel deployment
This project includes `vercel.json` so client-side routes fall back to `index.html`.

In Vercel, add these Environment Variables for Production, Preview, and Development:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Use Build Command `npm run build` and Output Directory `dist` if Vercel does not detect Vite automatically.

## Supabase production URL
After Vercel gives you a production URL, open Supabase > Authentication > URL Configuration:

- Set **Site URL** to the production Vercel URL.
- Add the production URL to **Redirect URLs**.
- Keep `http://localhost:5173` as a redirect URL while developing locally.

Email confirmation and password-reset links will then be able to return to the deployed app.

## Existing cloud data
Signing into the same Supabase account on the deployed app loads the same cloud budget data. Your local browser cache is only a responsiveness/offline convenience layer.

## v2.0.1 hotfix retained
The React hook-order login crash remains fixed in this build.
