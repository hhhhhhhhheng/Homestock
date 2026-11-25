# HomeStock Project Preferences

- **Mobile Testing Preference**: Whenever the user wants to test on a mobile phone (including PWA "Add to Home Screen", clipboard copy, or cross-device sync), prioritize committing and pushing to GitHub (`origin/main`) to deploy via Vercel and test on the Vercel `https://` URL rather than relying only on local LAN `http://` URLs.
- **Environment & Supabase Checklist**: Never commit `.env.local`. Remind the user when needed that Vercel Environment Variables must include `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and Supabase `public.items` must allow `anon` CRUD and belong to `supabase_realtime`.
