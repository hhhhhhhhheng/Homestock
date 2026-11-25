---
name: vercel-mobile-preview
description: >-
  Use when the user asks to preview or test the app on a mobile phone, verify
  PWA home-screen installation, or test multi-device Realtime sync. Prioritizes
  deploying to Vercel over HTTPS via git push instead of relying only on local
  LAN HTTP.
---

# Vercel Mobile Preview & Deployment Workflow

When the user wants to test on a mobile phone (especially PWA standalone mode,
clipboard sharing, or multi-device Supabase Realtime sync), prioritize pushing
changes to GitHub so Vercel serves an HTTPS preview/production URL.

## Steps

1. Run pre-deploy verification locally:
   - `npx tsc --noEmit`
   - `npm run lint`
   - `npm run build`
2. Verify `.env.local` is excluded by `.gitignore` (`.env*`) before staging files.
3. With user confirmation, stage changes, commit with a clear message, and push
   to `origin/main` so Vercel triggers a deployment.
4. Remind the user to ensure Vercel Project Environment Variables include:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
5. Provide the Vercel HTTPS URL testing checklist once deployed.
