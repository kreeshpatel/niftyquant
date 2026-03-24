# NiftyQuant — Deployment Guide

## Railway (Backend)

1. Push code to GitHub
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Select repo → set root directory to `dashboard/backend`
4. Add environment variables:
   - `ALLOWED_ORIGIN` = `https://your-app.vercel.app`
   - `PORT` = `8000`
5. Deploy → copy the Railway URL (e.g. `https://niftyquant-backend.up.railway.app`)

## Vercel (Frontend)

1. Go to [vercel.com](https://vercel.com) → New Project → Import from GitHub
2. Set root directory: `dashboard/frontend`
3. Add environment variables:
   - `VITE_API_URL` = `https://your-backend.railway.app`
   - `VITE_WS_URL` = `wss://your-backend.railway.app`
4. Deploy → share the `.vercel.app` URL

## Password Setup

1. Run: `node generate_hash.js yourpassword`
2. Copy the SHA-256 hash output
3. Paste into `dashboard/frontend/src/auth/config.js` as `ACCESS_HASH`
4. Redeploy frontend on Vercel

## Local Development

```bash
# Backend
cd dashboard/backend
uvicorn main:app --reload --port 8000

# Frontend
cd dashboard/frontend
npm install
npm run dev
```

Or use `dashboard/start.bat` (Windows) / `dashboard/start.sh` (Linux/Mac).

## .gitignore additions

```
.env.local
dashboard/frontend/src/auth/config.js
```
