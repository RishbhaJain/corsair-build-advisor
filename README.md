# Corsair Build Advisor

An AI-powered PC build advisor that helps you discover inspiring community builds and get personalized Corsair product recommendations.

**Flow:** Enter your specs → browse real Reddit builds for inspiration → select what you like → get AI-curated Corsair recommendations within your budget → refine with natural language.

---

## Stack

- **Backend:** FastAPI + GPT-4o (function calling)
- **Frontend:** React + Vite + Tailwind CSS
- **Data:** 200 pre-cached r/Corsair community builds, 30+ Corsair products

---

## Setup

**1. Install dependencies**
```bash
python -m venv .venv && source .venv/bin/activate
pip install -r backend/requirements.txt

cd frontend && npm install && cd ..
```

**2. Add your OpenAI key**
```bash
echo "OPENAI_API_KEY=sk-..." > .env
```

**3. Run**
```bash
# Terminal 1 — backend
source .venv/bin/activate
uvicorn backend.main:app --reload --port 8000

# Terminal 2 — frontend (dev)
cd frontend && npm run dev
```

Open [localhost:5173](http://localhost:5173).

---

## Deployment (Render)

```bash
# Build frontend first
cd frontend && npm run build && cd ..

# Then uvicorn serves everything on one port
uvicorn backend.main:app --host 0.0.0.0 --port $PORT
```

Connect the GitHub repo on [render.com](https://render.com) — it auto-detects `render.yaml`. Add `OPENAI_API_KEY` in the Render environment tab.

---

## Refresh the Reddit cache

```bash
source .venv/bin/activate
python -m backend.utils.fetch_builds_cache
```
