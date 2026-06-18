# Smart Cool Care — Render deploy (backend API)

Deploy **this folder** (`smartcoolcare-backend-render`) as its own GitHub repo. The frontend on Netlify calls this API.

**Live API:** `https://newcurser.onrender.com`  
**Health check:** `https://newcurser.onrender.com/health`

---

## 1. Push code to GitHub

1. Create a repo (e.g. `smartcoolcare-backend`).
2. Push this folder — **never** commit `.env`, `local-db.json`, or `node_modules/`.

---

## 2. Render web service

1. [render.com](https://render.com) → **New → Web Service** → connect GitHub repo.
2. Settings:
   - **Runtime:** Node
   - **Build command:** `npm install`
   - **Start command:** `npm start`
   - **Health check path:** `/health`
3. Or use `render.yaml` in this repo (Blueprint deploy).

---

## 3. Environment variables (Render)

**Environment → Add environment variable**

| Variable | Required | Notes |
|----------|----------|-------|
| `MONGODB_URI` | Yes | MongoDB Atlas connection string |
| `ADMIN_USERNAME` | Yes | Admin panel login |
| `ADMIN_PASSWORD` | Yes | Strong password — change from local dev |
| `ADMIN_SECRET` | Yes | Random string, **32+ characters** (JWT/session signing) |

**Do NOT set** `USE_JSON_STORE` on Render. That flag is for local dev only.

`PORT` is set automatically by Render.

---

## 4. MongoDB Atlas

1. [cloud.mongodb.com](https://cloud.mongodb.com) → your cluster.
2. **Network Access** → allow `0.0.0.0/0` (or Render’s IPs) so Render can connect.
3. **Database Access** → user with read/write on `smartcoolcare` database.
4. Copy connection string into `MONGODB_URI` on Render.

---

## 5. Seed production catalog (50 products + categories)

After Render is live and `MONGODB_URI` works, run **once** from your PC:

```bash
cd smartcoolcare-backend-render
```

Create a temporary `.env` (do not commit) with only:

```
MONGODB_URI=your-atlas-connection-string
```

Then:

```bash
npm install
npm run seed:catalog
```

This will:

- Upsert all **50 products** from `commonProducts.js` (matched by SKU)
- Upsert **6 shop categories** (Compressors, Capacitors, Air Conditioner, Remotes, Refrigerant, Copper)
- Hide old category slugs that are no longer used

Safe to re-run anytime you update the catalog in code.

---

## 6. Pair with Netlify frontend

On Netlify, set:

```
VITE_API_URL=https://newcurser.onrender.com
```

(Or your Render service URL if different.)

CORS is open (`*`) — any Netlify domain works.

---

## Local development (no MongoDB)

For the same data as production catalog on your machine:

```bash
cp .env.example .env
```

Edit `.env`:

```
PORT=3000
USE_JSON_STORE=1
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-local-password
ADMIN_SECRET=local-dev-secret-at-least-32-characters
```

Then:

```bash
npm install
npm run local:setup
npm run dev
```

Frontend `.env`: `VITE_API_URL=http://localhost:3000`

---

## Admin panel

- URL: `https://your-netlify-site.netlify.app/admin`
- Credentials: `ADMIN_USERNAME` / `ADMIN_PASSWORD` from **Render** env vars

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `MONGODB_URI environment variable is required` | Add URI on Render; remove `USE_JSON_STORE` |
| Health shows `disconnected` | Check Atlas IP whitelist and password in URI |
| Only 5 old products | Run `npm run seed:catalog` with production `MONGODB_URI` |
| Render sleeps (free tier) | First request after idle may take ~30s |
| Category images 404 | Images live on **Netlify** (`/images/categories/...`); API only stores paths |

---

## Scripts reference

| Command | Purpose |
|---------|---------|
| `npm start` | Production server (Render) |
| `npm run dev` | Local server with nodemon |
| `npm run local:setup` | Build `local-db.json` for `USE_JSON_STORE=1` |
| `npm run seed:catalog` | Sync products + categories to MongoDB |
