"""
Corsair Build Advisor — OpenAI GPT-4o agent with function calling.

Three phases:
  Phase 1 (search):  Given build specs + preferences, find matching Reddit builds.
  Phase 2 (recommend): Given selected builds + user preferences, recommend
                        Corsair products and generate a "build story".
  Phase 3 (refine):  Given existing recommendations + a natural language
                     refinement instruction, update the product selection.
"""

import json
import logging
import os
import re
from typing import AsyncIterator, Optional

from dotenv import load_dotenv
from openai import OpenAI

from backend.agent.tools import get_corsair_products, search_builds

load_dotenv()
logger = logging.getLogger(__name__)

MODEL = "gpt-4o"

# ---------------------------------------------------------------------------
# Tool schemas (OpenAI function calling format)
# ---------------------------------------------------------------------------

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "search_builds",
            "description": (
                "Search the cached r/Corsair Builds posts for visually inspiring builds. "
                "Returns a list of community build posts with images, titles, and any "
                "available build descriptions. Use aesthetic keywords from the user's "
                "preferences (e.g. ['RGB', 'white', 'minimalist', 'stealth'])."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "keywords": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": (
                            "Aesthetic and style keywords to search for in build titles and "
                            "descriptions. Examples: ['RGB', 'all white', 'clean', 'stealth', "
                            "'minimalist', 'gaming']. Pass [] to get top builds by upvotes."
                        ),
                    },
                    "max_results": {
                        "type": "integer",
                        "description": "Maximum builds to return (default 12, max 20).",
                    },
                },
                "required": ["keywords"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_corsair_products",
            "description": (
                "Filter and rank Corsair products from the catalog based on categories, "
                "budget, and weighted scoring. Returns the top product per category "
                "sorted by a composite visual/performance/value score."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "categories": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": (
                            "Product categories to include. Options: case, cooling, ram, psu, "
                            "fans, lighting, keyboard, mouse, headset. Use ['all'] for everything."
                        ),
                    },
                    "max_budget": {
                        "type": "number",
                        "description": "Maximum price per product in USD.",
                    },
                    "visual_weight": {
                        "type": "number",
                        "description": "Weight for visual/RGB appeal (0.5–2.0). Boost for RGB builds.",
                    },
                    "performance_weight": {
                        "type": "number",
                        "description": "Weight for performance score (0.5–2.0). Boost for high-perf builds.",
                    },
                    "value_weight": {
                        "type": "number",
                        "description": "Weight for value/budget score (0.5–2.0). Boost for budget builds.",
                    },
                    "tags": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Optional tags to filter by (OR match). E.g. ['white'] for white builds.",
                    },
                },
                "required": ["categories", "max_budget"],
            },
        },
    },
]

SYSTEM_PROMPT = """You are an expert Corsair PC build advisor helping enthusiasts discover inspiring community builds and get personalized Corsair product recommendations.

You have two tools:
- search_builds: finds inspiring builds from the r/Corsair community
- get_corsair_products: gets ranked Corsair products from our catalog

PHASE 1 — SEARCH (when asked to find inspiration):
Call search_builds with relevant aesthetic keywords derived from the user's preferences.
Return the builds as-is — the user will browse and select which ones inspire them.

PHASE 2 — RECOMMEND (when given selected builds + preferences):
1. Analyze what the user's selected builds have in common aesthetically
2. Call get_corsair_products with categories and weights reflecting user priorities:
   - High visual appeal → higher visual_weight (1.5–2.0)
   - High performance → higher performance_weight (1.5–2.0)
   - High value/budget focus → higher value_weight (1.5–2.0)
3. Return ONLY this JSON (no prose outside the JSON block):
{
  "build_story": "2-3 sentence vision for the completed build",
  "recommendations": [
    {
      "product_id": "id",
      "product_name": "name",
      "category": "category",
      "price": 189,
      "reason": "why this fits the user's aesthetic and use case"
    }
  ],
  "total_price": 450,
  "budget_remaining": 50
}

PHASE 3 — REFINE (when given a natural language refinement):
Interpret and call get_corsair_products with adjusted weights:
- "more RGB / more visual" → visual_weight=2.0
- "more memory / more RAM" → add "ram" to categories
- "quieter / silent" → tags=["quiet"], lower visual_weight
- "cheaper" → value_weight=2.0
- "more power / performance" → performance_weight=2.0
- "white build" → tags=["white"]
- "better cooling" → prioritize "cooling", high performance_weight
Return the same JSON structure as Phase 2.

Rules:
- Stay within the user's stated budget (max_budget per product)
- Prioritize Corsair products
- Be specific about WHY each product fits — reference aesthetic choices and selected builds
- In build_story, paint a vivid picture of the completed setup"""


# ---------------------------------------------------------------------------
# Tool dispatch
# ---------------------------------------------------------------------------

def _dispatch_tool(tool_name: str, tool_input: dict) -> str:
    try:
        if tool_name == "search_builds":
            result = search_builds(
                keywords=tool_input.get("keywords", []),
                max_results=min(tool_input.get("max_results", 12), 20),
            )
        elif tool_name == "get_corsair_products":
            result = get_corsair_products(
                categories=tool_input.get("categories", ["case"]),
                max_budget=tool_input.get("max_budget", 500),
                visual_weight=tool_input.get("visual_weight", 1.0),
                performance_weight=tool_input.get("performance_weight", 1.0),
                value_weight=tool_input.get("value_weight", 1.0),
                tags=tool_input.get("tags"),
            )
        else:
            result = {"error": f"Unknown tool: {tool_name}"}
        return json.dumps(result)
    except Exception as exc:
        logger.error("Tool %s failed: %s", tool_name, exc)
        return json.dumps({"error": str(exc)})


# ---------------------------------------------------------------------------
# Agentic tool-use loop (sync)
# ---------------------------------------------------------------------------

def _run_agent(messages: list[dict]) -> str:
    """Run the GPT-4o agent in a tool-use loop. Returns the final text."""
    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

    while True:
        response = client.chat.completions.create(
            model=MODEL,
            messages=messages,
            tools=TOOLS,
            tool_choice="auto",
        )

        msg = response.choices[0].message
        messages.append(msg.to_dict() if hasattr(msg, "to_dict") else {
            "role": "assistant",
            "content": msg.content,
            "tool_calls": [
                {
                    "id": tc.id,
                    "type": "function",
                    "function": {"name": tc.function.name, "arguments": tc.function.arguments}
                }
                for tc in (msg.tool_calls or [])
            ] or None,
        })

        if response.choices[0].finish_reason == "stop":
            return msg.content or ""

        if response.choices[0].finish_reason == "tool_calls":
            for tc in msg.tool_calls or []:
                tool_input = json.loads(tc.function.arguments)
                logger.info("Tool call: %s(%s)", tc.function.name, tc.function.arguments[:100])
                result = _dispatch_tool(tc.function.name, tool_input)
                messages.append({
                    "role": "tool",
                    "tool_call_id": tc.id,
                    "content": result,
                })
        else:
            break

    return ""


# ---------------------------------------------------------------------------
# Phase 1: find inspiration (sync, returns list)
# ---------------------------------------------------------------------------

def _aesthetic_to_keywords(aesthetic: str) -> list[str]:
    mapping = {
        "rgb": ["RGB", "rainbow", "colorful"],
        "rgb enthusiast": ["RGB", "rainbow", "colorful"],
        "clean": ["clean", "minimal", "white"],
        "clean & minimal": ["clean", "minimal"],
        "dark stealth": ["black", "dark", "stealth"],
        "stealth": ["black", "dark", "stealth"],
        "all-white": ["white", "white build"],
        "minimalist": ["minimal", "clean"],
    }
    for key, kws in mapping.items():
        if key in aesthetic.lower():
            return kws
    return aesthetic.lower().split()


def find_inspiration_sync(
    cpu: str,
    gpu: str,
    aesthetic: str,
    use_case: str,
    existing_components: str = "",
) -> list[dict]:
    """Phase 1: returns builds directly from cache without an API call."""
    keywords = _aesthetic_to_keywords(aesthetic)
    return search_builds(keywords=keywords, max_results=12)


# ---------------------------------------------------------------------------
# Phase 2 + 3: streaming SSE generator
# ---------------------------------------------------------------------------

async def recommend_stream(
    selected_builds: list[dict],
    cpu: str,
    gpu: str,
    budget: float,
    aesthetic: str,
    use_case: str,
    visual_priority: int,
    performance_priority: int,
    value_priority: int,
    form_factor: str = "ATX",
) -> AsyncIterator[str]:
    """
    Phase 2: stream Corsair product recommendations as SSE chunks.
    Yields: data: {"type": "status"|"text", "content": "..."}
    """
    import asyncio

    builds_summary = "\n".join(
        f"- \"{b['title']}\" ({b['upvotes']}↑)"
        + (f": {b['selftext'][:100]}" if b.get("selftext") else "")
        for b in selected_builds[:6]
    )

    def to_weight(p: int) -> float:
        return round(0.5 + (p / 10) * 1.5, 2)

    user_msg = f"""Generate Corsair product recommendations for these selected inspiring builds:

SELECTED BUILDS:
{builds_summary}

USER'S BUILD:
- CPU: {cpu or "not specified"}
- GPU: {gpu or "not specified"}
- Budget: ${budget}
- Aesthetic: {aesthetic}
- Use case: {use_case}
- Form factor: {form_factor}

PRIORITY WEIGHTS:
- Visual appeal: {visual_priority}/10 → {to_weight(visual_priority)}
- Performance: {performance_priority}/10 → {to_weight(performance_priority)}
- Value/budget: {value_priority}/10 → {to_weight(value_priority)}

Call get_corsair_products and return the JSON response."""

    yield f"data: {json.dumps({'type': 'status', 'content': 'Analyzing your preferences...'})}\n\n"
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_msg},
    ]

    loop = asyncio.get_event_loop()
    result_text = await loop.run_in_executor(None, lambda: _run_agent(messages))

    yield f"data: {json.dumps({'type': 'text', 'content': result_text})}\n\n"
    yield "data: [DONE]\n\n"


async def refine_stream(
    current_recommendations: list[dict],
    refinement: str,
    budget: float,
    cpu: str = "",
    gpu: str = "",
) -> AsyncIterator[str]:
    """
    Phase 3: stream updated recommendations after a refinement request.
    """
    import asyncio

    current_summary = "\n".join(
        f"- {r['product_name']} (${r['price']}): {r['reason']}"
        for r in current_recommendations
    )

    user_msg = f"""Refine the Corsair product recommendations.

CURRENT RECOMMENDATIONS:
{current_summary}

REFINEMENT: "{refinement}"

USER BUILD:
- CPU: {cpu or "not specified"}
- GPU: {gpu or "not specified"}
- Budget: ${budget}

Call get_corsair_products with adjusted weights and return updated JSON."""

    yield f"data: {json.dumps({'type': 'status', 'content': f'Applying refinement: {refinement}...'})}\n\n"
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_msg},
    ]

    loop = asyncio.get_event_loop()
    result_text = await loop.run_in_executor(None, lambda: _run_agent(messages))

    yield f"data: {json.dumps({'type': 'text', 'content': result_text})}\n\n"
    yield "data: [DONE]\n\n"


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _extract_json(text: str) -> Optional[dict]:
    match = re.search(r'\{.*\}', text, re.DOTALL)
    if match:
        return json.loads(match.group(0))
    return None
