# Journal — #608: containerize app for home-network deploy

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-13T11:47:42-04:00 — initial push: Docker scaffold + standalone build + runbook

**Pushed:**
- `next.config.mjs`: add `output: 'standalone'` so `pnpm build` emits
  `.next/standalone/` for a slim runtime image.
- `Dockerfile`: multi-stage (`deps` → `builder` → `runner`) on
  `node:20-alpine`, pnpm pinned to `10.33.2` via corepack to match
  `package.json:packageManager`, non-root `nextjs` user, `HOSTNAME=0.0.0.0`
  so the standalone server binds outside the container.
- `.dockerignore`: keep build context small — exclude `.git`, `.next`,
  `node_modules`, tests, journal, design docs, `.env*` (except
  `.env.example`).
- `docker-compose.yml`: three required Supabase env vars + site URL
  pass-through, `extra_hosts: host-gateway` so `host.docker.internal:54321`
  resolves on Linux for server-side calls, `restart: unless-stopped`, a
  `wget`-based healthcheck (busybox `wget` ships in `node:20-alpine`).
- `docs/deploy-home-network.md`: runbook covering the LAN-IP gotcha
  (`NEXT_PUBLIC_SUPABASE_URL` must be the host LAN IP because the
  *browser* on each device also hits Supabase directly), firewall ports,
  and reboot-survival caveat (Supabase CLI needs to be re-started after
  reboot; only the app gets `restart: unless-stopped`).

**Why:** I want to run a long-lived instance on my home LAN. Without a
container, host-level Node/pnpm drift would silently break the deploy;
with one, the runtime image is hermetic.

**Scope note — what's NOT here:**
- Bundling Postgres/GoTrue/PostgREST/Realtime into compose. The Supabase
  CLI already manages those via `supabase/config.toml`; duplicating that
  in this repo guarantees drift. App-only is the right boundary.
- Dev-mode container; TLS / reverse proxy; CI publishing of the image.
  Easy follow-ups but not needed for plain LAN deploy.

**Notes:** Validated locally before this PR — image builds to ~163 MB,
container reaches `healthy` and serves HTTP 200 in ~110 ms on a cold
boot. Hosted CI's `build` job will be the canonical check that the
standalone change didn't break anything.

**Post-review fixes folded into the same initial push:**
- Code-reviewer caught a critical: the original `docker-compose.yml`
  passed `NEXT_PUBLIC_*` only as runtime `environment:`, but Next.js
  inlines those values into the browser JS bundle at *build* time. The
  healthcheck on `/` would pass (Server Component) but every page
  hitting `getSupabaseBrowserClient()` would throw "Supabase env vars
  missing." Fix: builder stage now declares `ARG` + `ENV` for the three
  `NEXT_PUBLIC_*` values, and compose forwards them via `build.args`
  with the `?set in .env` fail-fast form. The dropped `localhost:3000`
  default for `SITE_URL` was the matching significant.
- One-line clarifier added to `.env.example` for `NEXT_PUBLIC_SITE_URL`
  — the `?` interpolation guards presence, not value; a comment closes
  the gap of a user `cp .env.example .env`-ing without editing.

**Accepted minors** (noted in PR body, not fixed in this PR):
- `node:20-alpine` is a floating tag — project has no digest-pinning
  convention; tolerable for a manually-rebuilt home deploy.
- `libc6-compat` not installed in the runner stage — defensive only;
  this app uses no native node addons.
- `image: sparks-of-kether:latest` — cosmetic for single-instance.

**Commit(s):** filled in after the initial push.
