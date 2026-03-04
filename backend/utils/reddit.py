"""
Reddit API utility — fetches r/Corsair "Builds" flair posts with images.

Image extraction handles three post types validated against live data:
  1. Direct image posts (url contains i.redd.it)
  2. Standard image posts (preview.images)
  3. Gallery posts (is_gallery=True, images in media_metadata)

PCPartPicker scraping is not supported (login-walled); links are surfaced as-is.
Supports optional OAuth (REDDIT_CLIENT_ID + REDDIT_CLIENT_SECRET env vars) for
60 req/min vs 10 req/min unauthenticated.
"""

import html
import logging
import os
import re
import time
from typing import Optional

import requests
from pydantic import BaseModel

logger = logging.getLogger(__name__)

BUILDS_SUBREDDIT = "Corsair"
BUILDS_FLAIR = "flair:Builds"

_oauth_token: Optional[str] = None
_token_expiry: float = 0.0


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

class RedditBuild(BaseModel):
    id: str
    title: str
    permalink: str          # full reddit.com URL
    primary_image_url: str  # best single image for gallery display
    all_image_urls: list[str]  # all images (galleries have multiple)
    upvotes: int
    author: str
    selftext: str           # post body text (empty string if none)
    pcpartpicker_url: Optional[str] = None  # extracted if present in selftext
    flair: Optional[str] = None
    num_comments: int = 0


# ---------------------------------------------------------------------------
# OAuth
# ---------------------------------------------------------------------------

def _get_oauth_token() -> Optional[str]:
    global _oauth_token, _token_expiry

    client_id = os.getenv("REDDIT_CLIENT_ID")
    client_secret = os.getenv("REDDIT_CLIENT_SECRET")
    if not client_id or not client_secret:
        return None

    now = time.time()
    if _oauth_token and now < _token_expiry - 30:
        return _oauth_token

    try:
        resp = requests.post(
            "https://www.reddit.com/api/v1/access_token",
            auth=(client_id, client_secret),
            data={"grant_type": "client_credentials"},
            headers={"User-Agent": "CorsairBuildAdvisor/1.0"},
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()
        _oauth_token = data["access_token"]
        _token_expiry = now + data.get("expires_in", 3600)
        logger.info("Reddit OAuth token obtained (expires in %ds)", data.get("expires_in", 3600))
        return _oauth_token
    except Exception as exc:
        logger.warning("Reddit OAuth failed (%s) — using public API (10 req/min)", exc)
        return None


def _headers(token: Optional[str]) -> dict:
    h = {"User-Agent": "CorsairBuildAdvisor/1.0"}
    if token:
        h["Authorization"] = f"Bearer {token}"
    return h


# ---------------------------------------------------------------------------
# Image extraction (handles all three post types)
# ---------------------------------------------------------------------------

def _extract_images(post: dict) -> tuple[Optional[str], list[str]]:
    """
    Returns (primary_image_url, all_image_urls).

    Priority:
      1. Direct i.redd.it URL (no entity encoding needed)
      2. preview.images[0].source.url (needs html.unescape for &amp;)
      3. Gallery posts: media_metadata ordered by gallery_data.items
    """
    all_urls: list[str] = []

    # 1. Direct image post
    direct_url = post.get("url", "")
    if "i.redd.it" in direct_url:
        return direct_url, [direct_url]

    # 2. Standard preview image
    preview_images = post.get("preview", {}).get("images", [])
    if preview_images:
        raw = preview_images[0].get("source", {}).get("url", "")
        if raw:
            url = html.unescape(raw)
            return url, [url]

    # 3. Gallery post
    media_metadata = post.get("media_metadata", {})
    gallery_items = post.get("gallery_data", {}).get("items", [])
    if media_metadata and gallery_items:
        for item in gallery_items:
            mid = item.get("media_id", "")
            meta = media_metadata.get(mid, {})
            # Source is in meta["s"]["u"]; fall back to largest in meta["p"]
            source_url = meta.get("s", {}).get("u", "")
            if not source_url:
                resolutions = meta.get("p", [])
                if resolutions:
                    source_url = max(resolutions, key=lambda r: r.get("x", 0)).get("u", "")
            if source_url:
                all_urls.append(html.unescape(source_url))
        if all_urls:
            return all_urls[0], all_urls

    return None, []


# ---------------------------------------------------------------------------
# Parsing
# ---------------------------------------------------------------------------

def _extract_pcpartpicker_url(text: str) -> Optional[str]:
    match = re.search(r"https?://(?:\w+\.)?pcpartpicker\.com/\S+", text or "")
    if match:
        return match.group(0).rstrip(")")  # strip trailing ) from markdown links
    return None


def _parse_post(child: dict) -> Optional[RedditBuild]:
    if child.get("kind") != "t3":
        return None

    p = child["data"]
    primary_img, all_imgs = _extract_images(p)
    if not primary_img:
        return None  # skip posts with no image

    selftext = html.unescape(p.get("selftext") or "").strip()
    pcp_url = _extract_pcpartpicker_url(selftext)

    return RedditBuild(
        id=p["id"],
        title=html.unescape(p.get("title", "")),
        permalink=f"https://www.reddit.com{p.get('permalink', '')}",
        primary_image_url=primary_img,
        all_image_urls=all_imgs,
        upvotes=p.get("ups", 0),
        author=p.get("author", ""),
        selftext=selftext,
        pcpartpicker_url=pcp_url,
        flair=p.get("link_flair_text"),
        num_comments=p.get("num_comments", 0),
    )


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def fetch_corsair_builds(limit: int = 25, time_filter: str = "all") -> list[RedditBuild]:
    """
    Fetch top r/Corsair posts with "Builds" flair.

    Paginates automatically using Reddit's `after` cursor when limit > 100
    (Reddit's per-request max is 100).

    Args:
        limit: Total number of posts to fetch.
        time_filter: Reddit time filter — "day", "week", "month", "year", "all".

    Returns:
        List of RedditBuild objects with images, sorted by upvotes descending.
    """
    token = _get_oauth_token()
    base = f"https://{'oauth' if token else 'www'}.reddit.com/r/{BUILDS_SUBREDDIT}/search.json"

    PAGE_SIZE = 100  # Reddit's maximum per request
    all_children: list[dict] = []
    after: Optional[str] = None

    while len(all_children) < limit:
        batch_size = min(PAGE_SIZE, limit - len(all_children))
        params: dict = {
            "q": BUILDS_FLAIR,
            "restrict_sr": "on",
            "sort": "top",
            "t": time_filter,
            "limit": batch_size,
        }
        if after:
            params["after"] = after

        try:
            resp = requests.get(base, params=params, headers=_headers(token), timeout=15)
            resp.raise_for_status()
            data = resp.json().get("data", {})
            children = data.get("children", [])
            after = data.get("after")  # None when no more pages
        except Exception as exc:
            logger.error("Failed to fetch r/Corsair builds (after=%s): %s", after, exc)
            break

        if not children:
            break  # no more results

        all_children.extend(children)

        if not after:
            break  # Reddit has no more pages

    builds = [_parse_post(c) for c in all_children]
    builds = [b for b in builds if b is not None]

    # Deduplicate by post ID
    seen: set[str] = set()
    unique: list[RedditBuild] = []
    for b in builds:
        if b.id not in seen:
            seen.add(b.id)
            unique.append(b)

    unique.sort(key=lambda b: b.upvotes, reverse=True)
    return unique
