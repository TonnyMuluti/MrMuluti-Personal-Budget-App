# S&T Budget App — Complete Finance Edition v4.0

Cloud personal finance dashboard with budgeting, transactions, recurring payments, bill alerts, multi-debt Snowball/Avalanche planning, savings goals, emergency fund tracking, money calendar, net worth, reports, browser notifications, profile preferences and the S&T Financial Assistant.

## Upgrade from v3.1

1. Run `supabase-v4-migration.sql` once in Supabase SQL Editor.
2. Replace your project files with this package (keep your existing `.env.local`).
3. Run `npm install` and `npm run build`.
4. Commit and push to GitHub; Vercel will redeploy automatically.

Your existing localStorage key remains unchanged for backward compatibility.


## v5.0 PWA & Offline Foundation

This build adds the first v5 foundation:
- Installable Progressive Web App (PWA)
- Standalone app manifest and icons
- Service-worker app-shell/runtime caching
- Online/offline status
- IndexedDB pending-sync snapshot
- Automatic retry when connectivity returns
- Install / update controls in Settings

The Supabase v5 migration must be applied before the later v5 goal, vehicle and household modules are enabled.
