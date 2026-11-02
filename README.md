# Offbook

Real-world skills for classes 6 to 12. See `CLAUDE.md` for the stack, layout, rules and phase plan.

## First-time setup

1. **Supabase.** Create a project at supabase.com in the Mumbai (ap-south-1) region. Copy `.env.example` to `.env.local` and fill in the URL, the publishable key, the secret key, the project ref and the DB password. Set `STUDENT_SESSION_SECRET` to 32+ random characters.
2. **Email codes.** In Supabase, go to Authentication → Emails → "Magic Link" and add `{{ .Token }}` to the template, so the email carries a 6-digit code as well as the link. Add `http://localhost:3000/auth/callback` to Authentication → URL Configuration → Redirect URLs.
3. **Database.** Run:
   ```bash
   npx supabase link --project-ref <your-ref>
   npm run db:push
   npm run seed
   ```
4. **Run it.** `npm run dev`, then open http://localhost:3000. With `ENABLE_DEV_LOGIN=true`, the login page offers "Sign in as demo parent / HQ admin". The demo children's PIN is `1234`.

## Checks

```bash
npm run typecheck
npm run lint
npm test
npm run test:db   # RLS tests against your Supabase project
```

## Brand assets

Save the official logo PNG as `public/brand/offbook-logo.png`. The SVG marks in `components/brand/Logo.tsx` and `public/brand/*.svg` are traced from it.
