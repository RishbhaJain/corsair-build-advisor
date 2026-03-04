"""
Agent tool implementations.

Two tools:
  - search_builds: searches the local builds cache for posts matching the user's
    aesthetic preferences and build context.
  - get_corsair_products: filters the Corsair product catalog by category and
    budget, ranked by a weighted composite of visual/performance/value scores.
"""

import json
import logging
import os
from typing import Optional

logger = logging.getLogger(__name__)

_CACHE_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "builds_cache.json")
_PRODUCTS_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "corsair_products.json")

# Loaded once at first call, then cached in memory
_builds_cache: Optional[list[dict]] = None
_products_cache: Optional[list[dict]] = None


def _load_builds() -> list[dict]:
    global _builds_cache
    if _builds_cache is None:
        with open(_CACHE_PATH) as f:
            _builds_cache = json.load(f)
        logger.info("Loaded %d builds from cache", len(_builds_cache))
    return _builds_cache


def _load_products() -> list[dict]:
    global _products_cache
    if _products_cache is None:
        with open(_PRODUCTS_PATH) as f:
            _products_cache = json.load(f)
        logger.info("Loaded %d products from catalog", len(_products_cache))
    return _products_cache


# ---------------------------------------------------------------------------
# Tool 1: search_builds
# ---------------------------------------------------------------------------

def search_builds(
    keywords: list[str],
    max_results: int = 12,
) -> list[dict]:
    """
    Search the cached r/Corsair Builds posts.

    Args:
        keywords: List of words to match against post title and selftext
                  (e.g. ["RGB", "white", "clean"]). Case-insensitive OR match.
                  Pass an empty list to return the top posts by upvotes.
        max_results: Maximum number of posts to return (default 12).

    Returns:
        List of build dicts with keys: id, title, permalink, primary_image_url,
        all_image_urls, upvotes, selftext, pcpartpicker_url, flair.
    """
    builds = _load_builds()

    if not keywords:
        return builds[:max_results]

    kw_lower = [k.lower() for k in keywords]

    def score(build: dict) -> int:
        """Higher score = more keyword matches in title + selftext."""
        text = (build.get("title", "") + " " + build.get("selftext", "")).lower()
        return sum(1 for kw in kw_lower if kw in text)

    # Filter to builds with at least one match; fall back to all if none match
    scored = [(score(b), b) for b in builds]
    matched = [(s, b) for s, b in scored if s > 0]

    if not matched:
        logger.info("No keyword matches for %s — returning top upvoted builds", keywords)
        return builds[:max_results]

    matched.sort(key=lambda x: (x[0], x[1]["upvotes"]), reverse=True)
    return [b for _, b in matched[:max_results]]


# ---------------------------------------------------------------------------
# Tool 2: get_corsair_products
# ---------------------------------------------------------------------------

def get_corsair_products(
    categories: list[str],
    max_budget: float,
    visual_weight: float = 1.0,
    performance_weight: float = 1.0,
    value_weight: float = 1.0,
    tags: Optional[list[str]] = None,
) -> list[dict]:
    """
    Filter and rank Corsair products.

    Args:
        categories: Product categories to include (e.g. ["case", "cooling", "ram"]).
                    Pass ["all"] to include every category.
        max_budget: Maximum price per product (inclusive).
        visual_weight: Weight for visual_score (0.0–2.0). Boost for RGB builds.
        performance_weight: Weight for performance_score. Boost for high-perf builds.
        value_weight: Weight for value_score. Boost for budget-conscious builds.
        tags: Optional list of tags to filter by (OR match, e.g. ["rgb", "white"]).

    Returns:
        Top-ranked product per category (up to one per category), sorted by
        composite score descending. Each product dict includes all catalog fields.
    """
    products = _load_products()

    # Normalize categories
    cats_lower = [c.lower() for c in categories]
    include_all = "all" in cats_lower

    filtered = [
        p for p in products
        if (include_all or p.get("category", "").lower() in cats_lower)
        and p.get("price", 9999) <= max_budget
    ]

    # Optional tag filter (OR: product must match at least one tag)
    if tags:
        tags_lower = [t.lower() for t in tags]
        filtered = [
            p for p in filtered
            if any(t in [tag.lower() for tag in p.get("tags", [])] for t in tags_lower)
        ] or filtered  # fall back if no tag matches at all

    # Composite score
    def composite(p: dict) -> float:
        return (
            visual_weight * p.get("visual_score", 5)
            + performance_weight * p.get("performance_score", 5)
            + value_weight * p.get("value_score", 5)
        )

    filtered.sort(key=composite, reverse=True)

    # Return top product per category to avoid flooding with duplicates
    seen_categories: set[str] = set()
    top_products: list[dict] = []
    for p in filtered:
        cat = p.get("category", "")
        if cat not in seen_categories:
            seen_categories.add(cat)
            top_products.append(p)

    return top_products
