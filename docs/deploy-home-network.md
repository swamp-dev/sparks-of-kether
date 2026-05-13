# Home-network deploy

Run Sparks of Kether on a box on your LAN, with the Next.js app in
Docker and the Supabase local stack via the Supabase CLI on the host.

## Prereqs

- Docker + Docker Compose v2 on the host.
- Supabase CLI (`supabase` on `$PATH`).
- The host's LAN IP (e.g. `192.168.1.42`). Don't use `localhost` — other
  devices on the LAN can't reach it.

## 1. Start Supabase on the host

```bash
supabase start
```

Note the printed `API URL`, `anon key`, and `service_role key`. The
local stack binds Postgres on `54322` and the API on `54321`.

## 2. Configure env

```bash
cp .env.example .env
```

Edit `.env` and set:

```
NEXT_PUBLIC_SUPABASE_URL=http://<host-lan-ip>:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from supabase start>
SUPABASE_SERVICE_ROLE_KEY=<from supabase start>
NEXT_PUBLIC_SITE_URL=http://<host-lan-ip>:3000
```

`NEXT_PUBLIC_SUPABASE_URL` must be the LAN IP, not `localhost` — the
browser on each player's device talks to Supabase directly for queries
and Realtime. Same reasoning for `NEXT_PUBLIC_SITE_URL`.

The `NEXT_PUBLIC_*` values are inlined by Next.js into the browser JS
bundle at build time, so they must be set in `.env` **before** the
first `docker compose up --build`. Compose forwards them to the build
stage via `build.args`. If you change any of them later, you must
rebuild the image (`docker compose up -d --build`); a restart alone
won't update the baked-in client values.

## 3. (Optional) extend Supabase redirect URLs

If anon-auth redirects break when joining from a phone or another
laptop, add the LAN origin to `supabase/config.toml`:

```toml
[auth]
site_url = "http://<host-lan-ip>:3000"
additional_redirect_urls = ["http://<host-lan-ip>:3000"]
```

Then `supabase stop && supabase start` to pick up the change. Don't
commit this — it's specific to your LAN.

## 4. Build & run

```bash
docker compose up -d --build
```

First build takes a few minutes (Next.js compile + standalone bundle).
Subsequent rebuilds use the pnpm and Docker layer cache.

## 5. Verify

```bash
docker compose ps         # status: healthy after ~30s
docker compose logs -f app
```

From another LAN device, open `http://<host-lan-ip>:3000/`. Landing
screen should load, anon-auth should complete, and you should be able
to create or join a room.

## 6. Firewall

Open both ports on the host's firewall to the LAN:

- `3000` — Next.js app
- `54321` — Supabase API (browsers hit this directly for Realtime)

Example with `ufw`:

```bash
sudo ufw allow from 192.168.1.0/24 to any port 3000
sudo ufw allow from 192.168.1.0/24 to any port 54321
```

## Lifecycle

- **Update**: `git pull && docker compose up -d --build`.
- **Stop**: `docker compose down`.
- **Restart**: `docker compose restart`.
- **Reboot survival**: `restart: unless-stopped` brings the app back
  automatically. Supabase needs `supabase start` re-run after a host
  reboot — wire it up via systemd, cron `@reboot`, or a small script if
  you want the whole thing to come back unattended.

## Out of scope

This setup is plain HTTP on the LAN. No TLS, no reverse proxy, no
external exposure. If you want to expose this beyond the LAN, put a
reverse proxy (Caddy or Traefik) in front and harden Supabase
accordingly.
