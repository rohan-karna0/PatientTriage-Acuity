# Deploying Acuity (Railway)

## Local build EPERM on Windows

If `npm run build` fails with:

```
EPERM: operation not permitted, rename ... query_engine-windows.dll.node
```

**Cause:** `npm run dev` (or another Node process) is locking Prisma’s DLL.

**Fix:**

```powershell
taskkill /IM node.exe /F
npm.cmd run build
```

Stop the dev server before building.

---

## Railway (recommended)

### 1. Prerequisites

- Code pushed to GitHub: `https://github.com/rohan-karna0/PatientTriage-Acuity`
- [railway.app](https://railway.app) account linked to GitHub

### 2. Create project

1. **New Project** → **Deploy from GitHub repo** → select `PatientTriage-Acuity`
2. **Add PostgreSQL** (New → Database → PostgreSQL) in the same project
3. Open your **web service** → **Variables** → **Add reference** to Postgres `DATABASE_URL`

Also set:

| Variable | Value |
|----------|--------|
| `DEFAULT_CLINICIAN_ID` | `nurse-demo-01` |
| `DEFAULT_CLINICIAN_ROLE` | `TRIAGE_NURSE` |

### 3. Build settings (auto from repo)

This repo includes `railway.toml` and `scripts/railway-build.sh`:

- **Build:** `npm install && npm run build` (+ Postgres schema push + seed when `DATABASE_URL` is `postgresql://`)
- **Start:** `npm run start` → Next.js on Railway’s `PORT`

If Railway still auto-detects wrong (Nx), in **Settings** set manually:

- **Build command:** `bash scripts/railway-build.sh`
- **Start command:** `npm run start`

### 4. Redeploy

Deployments → **Redeploy**. Open the generated **public URL**.

### 5. Verify

- FLOW board shows **22 patients**
- DOOR intake works
- Audit trail loads

---

## Local vs production database

| Environment | Database | Prisma provider |
|-------------|----------|-----------------|
| Local (`npm run setup`) | SQLite `apps/web/prisma/dev.db` | `sqlite` |
| Railway / cloud | PostgreSQL (linked service) | `postgresql` (switched at build by `railway-build.sh`) |

Do **not** commit `apps/web/prisma/dev.db`.

---

## Vercel (alternative)

1. Import GitHub repo on [vercel.com](https://vercel.com)
2. **Build command:** `npm run build`
3. **Install command:** `npm install`
4. Add **Neon** or **Supabase** Postgres → set `DATABASE_URL`
5. Run `db push` + `seed` once (Vercel CLI or Neon console)

Same Postgres requirement as Railway.

---

## After deploy

Add to [submission/SUBMISSION.md](../submission/SUBMISSION.md):

- **Repository URL:** `https://github.com/rohan-karna0/PatientTriage-Acuity`
- **Live demo URL:** your Railway/Vercel URL
