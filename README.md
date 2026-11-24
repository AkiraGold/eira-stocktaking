# EIRA Stocktaking

Mobile-first frontend for inventory stocktaking against an EIRA backend. Pick an inventura, work room by room, scan QR codes, mark items found / missing / moved, and add assets from the master list when something shows up that wasn’t expected.

Built for phones on the floor: bottom nav (Přehled · Inventura · Scan · Majetek · Profil), offline-friendly edits, and a light/dark theme.

<!-- Screenshots: add under docs/ when the redesign is finished. -->

## What it does

- **Přehled** — current inventura, progress, “I’m in this room”, rooms still to walk
- **Inventura** — item feed with filters, sort, quick state actions, notes
- **Scan** — camera QR flow with confirm / move / undo feedback
- **Majetek** — search the full asset register, link into inventura, or create new
- **Profil** — user, theme, inventura display mode, offline download / pending sync
- Proxies `/api/*` to the Spring inventory API (`API_BASE_URL`)
- Optional offline queue for state changes when the signal drops

## Stack

- **Frontend:** Next.js 15 (App Router), React 19, Tailwind CSS 3, Yarn
- **Device:** Material Icons Round, `react-qr-barcode-scanner`, HEIC → JPEG via `heic2any`
- **Offline:** IndexedDB wrapper + fetch queue in `src/offline/`
- **Backend (separate):** Spring Boot `eira-service` under `/api/inventory/*`

## Setup

Needs Node (LTS fine) and [Yarn](https://yarnpkg.com) 1.x.

```bash
git clone https://github.com/AkiraGold/eira-stocktaking.git
cd eira-stocktaking

yarn install
```

Create `.env` (or export when starting):

```env
API_BASE_URL="https://rest.example.eira.com"
# local backend example:
# API_BASE_URL="http://localhost:8090"
```

If `API_BASE_URL` is unset, the server falls back to `http://localhost:8088`.

```bash
yarn dev            # http://localhost:3000
```

Token access is expected (cookie / auth guard). Use the usual EIRA entry link or the token flow on `/error` when testing.

## Scripts

```bash
yarn dev
yarn build
yarn start          # production; respects PORT / -p
yarn lint
```

## Layout

```text
src/
  app/                  App Router pages + /api proxy
    (inventory)/        Majetek / base-item detail
    profile/
    stocktakingList/    inventura pick, list, item, scan, link, new
    api/                auth + catch-all proxy to API_BASE_URL
  components/           atoms / molecules / organisms + guards
  contexts/
  hooks/
  offline/              IndexedDB, offline fetch, boot, status
  utils/                states, navigation, theme, images, …
public/
next.config.mjs
package.json
yarn.lock
```

## Deploy

```bash
yarn install
yarn build
```

Ship at least:

- `.next`
- `public`
- `next.config.mjs`
- `package.json`
- `yarn.lock`
- `.env` (or set `API_BASE_URL` in the process environment)

```bash
API_BASE_URL=http://172.x.x.x:8090 yarn start
# or systemd: Environment=PORT=3000 Environment=API_BASE_URL=...
```

Changing `API_BASE_URL` only needs a process restart, not a rebuild. Frontend browser calls stay on same-origin `/api/*`; the Node server forwards to the backend.

## License

All rights reserved.
