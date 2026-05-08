# Deploying to Vercel

The `apps/web` Next.js application is the only thing that runs on Vercel. The widget bundle (`apps/widget`) is a separate Vite build that should go to a CDN (Cloudflare R2, Vercel Blob, etc.) — not deployed by this Vercel project.

---

## Prerequisites

- A Supabase project with all migrations applied (already true for `sxcvhsjclgmwvmugojsk`).
- Anon and service-role keys from Supabase → Settings → API.
- A 64-character hex secret for `SESSION_HMAC_SECRET`. Generate one with:
  ```bash
  openssl rand -hex 32
  ```

---

## One-time setup (5 minutes)

### 1. Push to GitHub

```bash
git remote add origin git@github.com:itdev-gr/assistantproject.git
git push -u origin main
```

### 2. Import the project on Vercel

1. Go to https://vercel.com/new and pick the GitHub repository.
2. **Framework Preset**: Vercel will detect Next.js automatically.
3. **Root Directory**: leave at the repo root — `vercel.json` already points the build at `apps/web`.
4. **Build & Output Settings**: leave defaults — `vercel.json` sets `buildCommand`, `installCommand`, `outputDirectory`.

### 3. Set environment variables

In Vercel → Project → Settings → Environment Variables, add these for **Production** (and optionally Preview):

| Key | Value | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://sxcvhsjclgmwvmugojsk.supabase.co` | Public, fine to commit if you want |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | the anon JWT | Public, but treat the value carefully |
| `SUPABASE_SERVICE_ROLE_KEY` | the service-role JWT | **Secret. Server-only.** Never expose to the browser |
| `SESSION_HMAC_SECRET` | `openssl rand -hex 32` output | **Secret.** Used to sign guest session cookies and referral redirects |
| `NEXT_PUBLIC_APP_URL` | `https://your-prod-domain.vercel.app` | Used to build absolute URLs (e.g. signed referral CTAs) |

Don't set `NODE_ENV` — Vercel sets it for you.

### 4. Update Supabase Auth allow-list

In Supabase Dashboard → Authentication → URL Configuration:

- **Site URL**: `https://your-prod-domain.vercel.app`
- **Redirect URLs**: add
  - `https://your-prod-domain.vercel.app/auth/callback`
  - `https://your-prod-domain.vercel.app/auth/callback?next=*`
  - `https://*.vercel.app/auth/callback` (for preview deployments — optional)

The Custom Access Token Hook is already wired to `pg-functions://postgres/public/custom_access_token_hook` and works in production unchanged.

### 5. Deploy

Click **Deploy** in Vercel. First build takes ~2 minutes (cold install + Next build).

---

## Verifying after deploy

```bash
# Replace with your production URL
PROD=https://your-prod-domain.vercel.app

curl -sI $PROD/en | head -1                      # 200
curl -sI $PROD/en/p/<a-business-id>              # 200
curl -sI $PROD/en/admin                          # 307 → /login (auth gate)
curl -sI $PROD/api/widget/loader.js              # 200, javascript content-type
```

Then sign in at `$PROD/login` with `mkifokeris@itdev.gr` / `pass123456789` and confirm /admin loads.

---

## Branch deploys & previews

Every PR automatically gets a Vercel preview URL. Caveats:

- Supabase Auth callbacks: previews use `*.vercel.app` URLs. Either add the wildcard to the redirect URL list (above) or use Vercel deployment protection so previews aren't reachable.
- Preview deployments hit the **production** Supabase database. Either point preview env vars at a separate Supabase project, or accept that previews can read/write live data.

---

## Subsequent deploys

Just push to `main`. Vercel will redeploy automatically using the cache. The `ignoreCommand` in `vercel.json` skips builds when neither `apps/web` nor `packages/` changed (e.g. doc-only PRs).

---

## Updating the database schema after deploy

```bash
# from your local machine
SUPABASE_ACCESS_TOKEN=<your-personal-token> supabase db push --linked
SUPABASE_ACCESS_TOKEN=<your-personal-token> pnpm db:types  # regenerate types
git add packages/db/src/database.types.ts && git commit -m "regen db types" && git push
```

Vercel will redeploy with the regenerated types.

---

## The widget bundle (separate deploy)

`apps/widget` is **not** deployed by this Vercel project. To distribute it:

```bash
AGA_LOCALE=el pnpm --filter @aga/widget build  # produces dist/el/widget.el.iife.js
AGA_LOCALE=en pnpm --filter @aga/widget build  # produces dist/en/widget.en.iife.js
```

Upload both files to a CDN bucket (e.g. Cloudflare R2). Update `apps/web/src/app/api/widget/loader.js/route.ts` so the inline loader script points at that CDN origin instead of the Vercel origin if you want the widget to be edge-cached separately.

---

## Custom domain

In Vercel → Project → Settings → Domains, add your domain (e.g. `app.itdev.gr`). Update `NEXT_PUBLIC_APP_URL` to match, and add the new domain to Supabase's Auth redirect URL list.

---

## Rollback

Vercel keeps every deployment. If something breaks, click **Promote to Production** on a previous successful deployment in the Vercel dashboard.
