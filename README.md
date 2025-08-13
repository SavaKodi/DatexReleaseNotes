### Environment configuration (.env and .env.local)

This app uses Vite and Supabase. You must set these variables for the app to work:

Required variables:

- VITE_SUPABASE_URL: Supabase project API URL
- VITE_SUPABASE_ANON_KEY: Supabase anon public key

Where to set them:

- .env: committed defaults for all environments (safe values or placeholders)
- .env.local: developer-specific overrides (git-ignored). Prefer putting real keys here.

Example .env (checked in):

```
# Generic placeholders – safe to commit
VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
VITE_SUPABASE_ANON_KEY=REPLACE_ME
```

Example .env.local (not committed):

```
# Real project values – do NOT commit
VITE_SUPABASE_URL=https://nmopwjbhncmlonpoavxb.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...<trimmed>
```

Windows/WSL notes:

- If running in WSL, place env files inside the project folder (e.g. /mnt/c/Users/.../release-notes-search/.env.local)
- After changing env files, restart the dev server so Vite picks up new values.

Where these are used in code:

- `src/lib/supabase/client.ts`
- `src/config/env.ts`

How to verify:

- Open the browser devtools Network tab and look for requests to `/rest/v1/...` – the host should match your VITE_SUPABASE_URL.
- 401 errors usually indicate wrong URL/key or pointing to the wrong Supabase project.
