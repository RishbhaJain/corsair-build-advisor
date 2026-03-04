# Corsair Build Advisor

## The Problem

PC builders know their parts, constraints, and performance goals, but they don’t know what to buy next. Corsair has 200+ SKUs across cases, cooling, RAM, fans, and peripherals, yet there’s no intelligent way to answer the core question: “What should I actually add to my build?”
Today, upsell decisions are driven by community clout (What’s trending on Reddit, YouTube, and Discord), not by guidance on Corsair’s own site. That signal exists, but it isn’t captured or surfaced where purchase decisions happen.

The result: High browse-to-purchase drop-off and missed upsell opportunities across the Corsair ecosystem.

---

## The Solution

A 3-step advisor that turns aesthetic preference into a personalized Corsair shopping list:

1. **Specs in** — CPU, GPU, budget, priorities (visual / performance / value)
2. **Inspiration gallery** — real r/Corsair community builds; user picks what resonates
3. **AI recommendations** — GPT-4o uses the selected builds as taste signal to pick Corsair products within budget, with a natural language refinement loop

The key insight: the build selection step captures taste that sliders can't - "I want *this* vibe", making recommendations feel personal, not algorithmic.

[Try out the prototype here!](https://corsair-build-advisor.onrender.com/)

---

## Flow

```mermaid
flowchart LR
    A([User]) -->|specs + priorities| B[Build Form]
    B -->|keyword search| C[(200 Reddit\nBuilds Cache)]
    C --> D[Inspiration Gallery]
    D -->|selected builds| E{GPT-4o Agent}
    E -->|get_corsair_products| F[(Product\nCatalog)]
    F --> E
    E -->|streaming SSE| G[Recommendations]
    G -->|natural language| E
    G -->|click-through| H[Corsair.com]
```

---

## Success Metrics

| Category | Metric | What it measures |
|---|---|---|
|Discovery and funnel | **Discovery → Gallery → Recommendation rate** | Are users engaged enough to select builds and continue? |
|Engagement | **Builds selected per session** | Depth of inspiration exploration (target: 2–4) |
|Engagement | **Refinement loops per session** | Conversational engagement; higher = stronger product-market fit signal |
|Conversion | **Corsair.com click-through rate** | Intent to purchase from the recommendation cards |
|Revenue | **Revenue** | Actual purchases made/revenue contributed |


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

Connect the GitHub repo on [render.com](https://render.com) — it auto-detects `render.yaml`. Add `OPENAI_API_KEY` in the Render environment tab.

---

## Refresh the Reddit cache

```bash
source .venv/bin/activate
python -m backend.utils.fetch_builds_cache
```
