# Eera Frontend (Next.js)

Live: https://ease-weld.vercel.app/

Backend (Render): https://eera-yni0.onrender.com/

## Local Development
```bash
npm install
npm run dev
```

Environment variable:
- `NEXT_PUBLIC_BACKEND_URL` (default `http://localhost:8000`)
- Production: `NEXT_PUBLIC_BACKEND_URL=https://eera-yni0.onrender.com`

## Vercel Deployment
- Framework Preset: Next.js
- Root Directory: `frontend`
- Environment Variables:
  - `NEXT_PUBLIC_BACKEND_URL=https://eera-yni0.onrender.com`
- Leave "Output Directory" empty (use Next.js default)
