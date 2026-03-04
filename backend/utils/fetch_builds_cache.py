"""
One-time script to pre-fetch r/Corsair Builds posts and save to
backend/data/builds_cache.json. Run this before starting the server
for a fast, rate-limit-free demo experience.

Usage:
    python -m backend.utils.fetch_builds_cache
    # or from CorsairPrototype/:
    .venv/bin/python -m backend.utils.fetch_builds_cache
"""

import json
import logging
import os
import sys

# Allow running as a script from the project root
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from backend.utils.reddit import fetch_corsair_builds

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

CACHE_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "builds_cache.json")


def main():
    logger.info("Fetching r/Corsair Builds posts...")
    builds = fetch_corsair_builds(limit=200, time_filter="all")
    logger.info("Fetched %d posts with images", len(builds))

    # Serialize to JSON
    data = [b.model_dump() for b in builds]
    os.makedirs(os.path.dirname(CACHE_PATH), exist_ok=True)
    with open(CACHE_PATH, "w") as f:
        json.dump(data, f, indent=2)

    logger.info("Saved to %s", os.path.abspath(CACHE_PATH))

    # Quick summary
    with_text = sum(1 for b in builds if b.selftext)
    with_pcp = sum(1 for b in builds if b.pcpartpicker_url)
    with_gallery = sum(1 for b in builds if len(b.all_image_urls) > 1)
    logger.info(
        "Summary: %d with selftext, %d with PCPartPicker link, %d gallery posts",
        with_text, with_pcp, with_gallery
    )


if __name__ == "__main__":
    main()
