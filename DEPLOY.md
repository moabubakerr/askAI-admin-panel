# Deploying the SCAI admin panel on the on-prem VM

Static SPA (Vite + React). No SSR, so the runtime is **nginx** serving the built
bundle plus an `/api` proxy location. The VM needs only Docker and git — the
image builds itself, including the Node toolchain, in a discarded build stage.

- Host port: **17100**
- Image: `askai-admin-panel:latest`
- Container: `askai-admin-panel`
- Network: `kap_shared_network` (external, already created)
- Image size: **54.1 MB**

## One-time, before the first deploy

Clone into a lowercase directory. The repository is named `askAI-admin-panel`,
so a bare `git clone` creates `~/askAI-admin-panel` — and on Linux that is a
different path from the `~/askai-admin-panel` used throughout this file. Passing
the target directory explicitly settles it:

```
cd ~
git clone https://github.com/moabubakerr/askAI-admin-panel.git askai-admin-panel
cd askai-admin-panel
```

If you already cloned without the target argument, rename it once:

```
cd ~ && mv askAI-admin-panel askai-admin-panel && cd askai-admin-panel
```

The shared network must also exist:

```
docker network ls | grep kap_shared_network
```

If that prints nothing, the network is missing and `up` will fail with
`network kap_shared_network declared as external, but could not be found`.
Create it with `docker network create kap_shared_network`.

## Deploy

```
cd ~/askai-admin-panel
git pull
docker compose -f docker-compose.admin.yml build
docker compose -f docker-compose.admin.yml up -d --force-recreate
docker compose -f docker-compose.admin.yml logs -f --tail=50
```

Then check it:

```
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:17100/
curl -s http://localhost:17100/api/health
```

The first should be `200`. The second should be the API's own health payload —
if it is `502`, the panel is up and the API is not; see the failure table.

### Why `--force-recreate` matters

`docker compose build` produces a new image, but `up -d` on its own compares the
**service definition**, not the image. Nothing in `docker-compose.admin.yml`
changed, so Compose decides the running container is already correct, leaves it
alone, and the old container keeps serving the old bundle. You then have a new
image on disk that nobody is using, and a deploy that looks like it worked.
`--force-recreate` replaces the container unconditionally.

### Confirming the new bundle is actually live

The bundle filename is content-hashed, so it changes whenever the code does:

```
docker exec askai-admin-panel ls /usr/share/nginx/html/assets | grep '^index-.*\.js$'
curl -s http://localhost:17100/ | grep -o 'index-[A-Za-z0-9_-]*\.js'
```

Both must print the same name, and it must differ from what you saw before the
deploy.

## Pointing it at the API

The upstream is an environment variable. Nothing about the API's address is
compiled into the bundle.

```
API_UPSTREAM        default: http://host.docker.internal:18000
API_CALLER_HEADER   default: X-Caller
API_CALLER          default: scai-admin-panel
```

**The default is the VM host's published port**, reached through
`host.docker.internal`, which requires the `extra_hosts: ["host.docker.internal:host-gateway"]`
already in the compose file. Two reasons it is the default:

- It does not depend on the API's container name or on which networks the API
  joined.
- `host.docker.internal` is an `/etc/hosts` entry, so it always resolves. nginx
  therefore always starts, and an API that is down is a **502 on `/api`** rather
  than a panel that will not come up at all.

Note that inside a container `localhost` is *that container*, not the VM. Never
point `API_UPSTREAM` at `localhost` — nothing is listening there.

### The alternative: the API's service name

Find the API's container name and the port it listens on *inside* its own
container:

```
docker ps --format '{{.Names}}\t{{.Image}}\t{{.Ports}}' | grep 18000
```

That prints something like `askai-api   askai-api:latest   0.0.0.0:18000->8000/tcp`.
The name is the first column and the internal port is the one on the right of
the arrow. Using those:

```
API_UPSTREAM=http://askai-api:8000 \
  docker compose -f docker-compose.admin.yml up -d --force-recreate
```

Both containers must be on `kap_shared_network` for that name to resolve:

```
docker network inspect kap_shared_network --format '{{range .Containers}}{{.Name}} {{end}}'
```

This route is tidier and keeps the traffic off the host's published port. The
trade-off is real and one-directional: **nginx resolves an upstream hostname
once, at startup, and refuses to start if it cannot.** With `restart: unless-stopped`
that becomes a restart loop, and the entire panel is down — not just `/api` —
whenever the API container is absent, renamed, or merely started after this one.
Verified behaviour with a name that does not resolve:

```
nginx: [emerg] host not found in upstream "askai-api-typo" in /etc/nginx/conf.d/default.conf:52
```

Do not make this the default. Use it only if you are willing to couple the
panel's availability to the API's.

### Prefix mapping

The API's routes sit at its root. The panel calls `/api/...`; the trailing slash
on `proxy_pass` strips the prefix:

| Browser asks for | Upstream receives |
| --- | --- |
| `/api/health` | `/health` |
| `/api/chat` | `/chat` |
| `/api/admin/stats` | `/admin/stats` |

`API_UPSTREAM` must carry no trailing slash of its own, or `proxy_pass` becomes
`http://host:18000//` and every request arrives with a doubled slash and 404s.
The entrypoint strips a trailing slash defensively and says so in the log, so
this is a warning rather than an outage — but do not rely on it.

### Identity

`API_CALLER_HEADER` / `API_CALLER` are applied with `proxy_set_header`, which
**overwrites whatever the browser sent**. A client that can set a header can
forge it, so this is decided server-side. Verified: a request carrying
`X-Caller: forged-by-browser` reaches the upstream as
`X-Caller: scai-admin-panel`.

`Authorization` is deliberately *not* overwritten — the panel's own bearer token
has to reach the API.

## What this exposes — read before publishing on 17100

`/api/` proxies to the **root of the API**, so every route the API serves is
reachable through the panel's host port. That includes:

- `POST /chat`, `POST /read`, `GET /health`, `GET /session/{id}`
- **every `/admin/*` route**, including the ones that return the full chat
  corpus: `/admin/messages`, `/admin/feedback`, `/admin/messages/{id}/provenance`,
  `/admin/sessions`, `/admin/stats`, `/admin/catalogue`, `/admin/lineage`

Those responses contain everything users typed into the chat — personal data
under Qatar's PDPL.

Three things to be clear about:

1. **The proxy enforces no authentication of its own.** nginx forwards `/api/*`
   to the API and lets the API decide. The panel has a login screen and sends a
   bearer token, but that is the panel being polite, not the proxy being a
   gate. `curl http://localhost:17100/api/admin/messages` on the VM goes straight
   through, and so does the same call from any host that can route to it.
   Whether it returns data or a 401 depends entirely on whether the API enforces
   auth on those routes. **Confirm that before exposing this port.** As of
   writing this, that has not been verified against the deployed API — no part of
   this deployment makes it true.
2. **The identity header is applied to every request through the port**, not
   only to the panel's own. If the API treats `X-Caller` as any kind of
   authorisation, then publishing 17100 hands that identity to anyone who can
   reach the port.
3. **Publishing on a host port puts these routes on the network** for everyone
   who can route to the VM. If that is wider than the intended audience, bind
   the published port to a specific interface (`"127.0.0.1:17100:8080"`) and
   reach it over SSH or a reverse proxy that authenticates, rather than leaving
   it on `0.0.0.0`.

The panel itself makes no writes: there are no create, update or delete calls
anywhere in it.

## Offline fallback

If the VM cannot pull base images, build elsewhere and ship the image:

On a machine with egress and this repo:

```
docker compose -f docker-compose.admin.yml build
docker save askai-admin-panel:latest | gzip > askai-admin-panel.tar.gz
```

Copy `askai-admin-panel.tar.gz` to the VM, then on the VM:

```
cd ~/askai-admin-panel
docker load < askai-admin-panel.tar.gz
docker compose -f docker-compose.admin.yml up -d --force-recreate --no-build
```

`--no-build` matters: without it Compose rebuilds and undoes the point of the
exercise.

## Rollback

Tag the current image before deploying, so there is something to go back to:

```
docker tag askai-admin-panel:latest askai-admin-panel:previous
```

To roll back:

```
docker tag askai-admin-panel:previous askai-admin-panel:latest
docker compose -f docker-compose.admin.yml up -d --force-recreate --no-build
```

Keep a dated tag if you want more than one step of history:

```
docker tag askai-admin-panel:latest askai-admin-panel:2026-09-22
```

## Failure table

| Symptom | Cause | Fix |
| --- | --- | --- |
| **502 on every `/api` request**, panel itself loads fine | nginx reached the upstream address and got no answer: nothing is listening on `API_UPSTREAM`. Usually the API is stopped, or it is not publishing 18000 on the VM host. | `curl -s http://localhost:18000/health` on the VM. If that fails, the API is the problem, not the panel. If it works, check `docker logs askai-admin-panel \| grep normalise` shows the upstream you expect. |
| **504 on every `/api` request** | Same family, different cause: the address resolves but packets go nowhere, typically because the API container was stopped and its address left the network. nginx waits out `proxy_connect_timeout` (15s) first. | Start the API. A 504 rather than a 502 is a hint that you are proxying to a container name whose container is gone. |
| **Container restart-looping**, logs show `nginx: [emerg] host not found in upstream "..."` | `API_UPSTREAM` is a container name nginx cannot resolve at startup — the API is not running, was renamed, or is not on `kap_shared_network`. nginx resolves upstream names once and exits if it fails. | Either start the API first and `up -d --force-recreate`, or switch back to the default `http://host.docker.internal:18000`, which always resolves. |
| **404 from every `/api` request**, and the API's own logs show paths with `//` | `API_UPSTREAM` ends with a slash, so `proxy_pass` doubled it. | Remove the trailing slash. The entrypoint now strips it and logs `API_UPSTREAM had a trailing slash`; if you see that line, fix the variable anyway. |
| **"I pulled and nothing changed"** | Almost always the wrong branch, or a build that reused a cached source layer. | `git branch -vv` — confirm you are on the branch you pushed to and that it is not behind its upstream. Then watch the build output: the `COPY src ./src` step must **not** report `CACHED` if the source changed. If it does, the tree on the VM is not what you think it is; `git status` and `git log --oneline -3`. |
| **New image built, old UI still served** | `up -d` without `--force-recreate` kept the running container. | Re-run with `--force-recreate`, then compare the `index-*.js` hash as shown above. |
| **`network kap_shared_network declared as external, but could not be found`** | The shared network does not exist on this VM. | `docker network create kap_shared_network` (it is meant to already exist — check whether you are on the right host first). |
| **Port 17100 already allocated** | Something else took it. | `ss -ltnp \| grep 17100`, then either free it or change the published port in `docker-compose.admin.yml`. Do not use 17000, 17800, 17900, 18000, 8080, 8210 or 3000. |
| **Arabic renders as boxes** | A remote font was expected and the VM has no egress. | Should be impossible — fonts are bundled from `node_modules` and the build fails if the HTML references a remote stylesheet. Confirm with `docker exec askai-admin-panel ls /usr/share/nginx/html/assets \| grep woff2` (expect 37 files). |
| **Panel shows invented data** | The mode chip in the top bar reads "Mock data". A production build defaults to live, so this only happens if someone clicked it. | Click the chip to return to Live API. Mock mode is fixtures only; no request leaves the browser. |

## What the container does at startup

```
docker logs askai-admin-panel | head -20
```

Expected, in order:

```
/docker-entrypoint.sh: Sourcing /docker-entrypoint.d/10-normalise-upstream.envsh
10-normalise-upstream: proxying /api/ -> http://host.docker.internal:18000/  with X-Caller: scai-admin-panel
/docker-entrypoint.sh: Launching /docker-entrypoint.d/20-envsubst-on-templates.sh
20-envsubst-on-templates.sh: Running envsubst on /etc/nginx/templates/default.conf.template to /etc/nginx/conf.d/default.conf
/docker-entrypoint.sh: Configuration complete; ready for start up
```

If the `envsubst` line is missing, or you see
`find: /etc/nginx/templates/...: Permission denied`, the template was not
rendered and nginx is serving its packaged default — the panel will load but
`/api` will 404 and deep links will break.

The container runs as `nginx` (uid 101), listens on 8080 inside, and reports
health by fetching its own `/` with `wget --spider`. `docker ps` shows
`(healthy)` once the first probe passes. The healthcheck deliberately does not
touch `/api`, so the panel is not reported unhealthy just because the API is
down.
