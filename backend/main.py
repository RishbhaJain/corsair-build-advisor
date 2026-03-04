"""
Corsair Build Advisor — FastAPI backend.

Routes:
  POST /api/search      → Phase 1: returns Reddit builds matching user preferences
  POST /api/recommend   → Phase 2: streams Corsair product recommendations (SSE)
  POST /api/refine      → Phase 3: streams updated recs after natural language refinement
  GET  /api/health      → health check
"""

import logging
import os
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from backend.agent.advisor import (
    find_inspiration_sync,
    recommend_stream,
    refine_stream,
)

load_dotenv()
logging.basicConfig(level=logging.INFO)

app = FastAPI(title="Corsair Build Advisor")

# Allow requests from the Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Request / response models
# ---------------------------------------------------------------------------

class SearchRequest(BaseModel):
    cpu: str = ""
    gpu: str = ""
    aesthetic: str = "RGB Enthusiast"
    use_case: str = "Gaming"
    existing_components: str = ""


class RecommendRequest(BaseModel):
    selected_builds: list[dict] = Field(default_factory=list)
    cpu: str = ""
    gpu: str = ""
    budget: float = 500.0
    aesthetic: str = "RGB Enthusiast"
    use_case: str = "Gaming"
    form_factor: str = "ATX"
    visual_priority: int = Field(default=7, ge=1, le=10)
    performance_priority: int = Field(default=7, ge=1, le=10)
    value_priority: int = Field(default=5, ge=1, le=10)


class RefineRequest(BaseModel):
    current_recommendations: list[dict] = Field(default_factory=list)
    refinement: str
    budget: float = 500.0
    cpu: str = ""
    gpu: str = ""


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/search")
def search(req: SearchRequest):
    """
    Phase 1: Return Reddit build inspiration posts matching user's preferences.
    No AI call needed — uses keyword search against the local builds cache.
    """
    builds = find_inspiration_sync(
        cpu=req.cpu,
        gpu=req.gpu,
        aesthetic=req.aesthetic,
        use_case=req.use_case,
        existing_components=req.existing_components,
    )
    return {"builds": builds}


@app.post("/api/recommend")
async def recommend(req: RecommendRequest):
    """
    Phase 2: Stream Corsair product recommendations as SSE.
    The agent calls get_corsair_products internally.
    """
    async def generator():
        async for chunk in recommend_stream(
            selected_builds=req.selected_builds,
            cpu=req.cpu,
            gpu=req.gpu,
            budget=req.budget,
            aesthetic=req.aesthetic,
            use_case=req.use_case,
            visual_priority=req.visual_priority,
            performance_priority=req.performance_priority,
            value_priority=req.value_priority,
            form_factor=req.form_factor,
        ):
            yield chunk

    return StreamingResponse(generator(), media_type="text/event-stream")


@app.post("/api/refine")
async def refine(req: RefineRequest):
    """
    Phase 3: Stream updated recommendations after a natural language refinement.
    """
    async def generator():
        async for chunk in refine_stream(
            current_recommendations=req.current_recommendations,
            refinement=req.refinement,
            budget=req.budget,
            cpu=req.cpu,
            gpu=req.gpu,
        ):
            yield chunk

    return StreamingResponse(generator(), media_type="text/event-stream")


# ---------------------------------------------------------------------------
# Serve React frontend (production build)
# ---------------------------------------------------------------------------

_DIST = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")

if os.path.isdir(_DIST):
    app.mount("/assets", StaticFiles(directory=os.path.join(_DIST, "assets")), name="assets")

    @app.get("/{full_path:path}")
    def serve_spa(full_path: str):
        return FileResponse(os.path.join(_DIST, "index.html"))
