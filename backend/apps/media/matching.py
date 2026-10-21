"""
Media filename → product matching service.

Implements Rule §7 (filename pattern matching) and §8 (SKU-to-image matching):

Supported filename patterns (basename without extension):
    SKU123            -> SKU
    SKU123_1          -> SKU + sequence
    SKU123_2          -> SKU + sequence
    VENDOR-SKU123-primary
    SKU123_alt1

Matching is case-insensitive and vendor-aware: if the same SKU exists for
multiple vendors, the Vendor + SKU form must be used so an image can never be
attached to the wrong vendor's product (Rule §8).
"""
import os
import re

# Sequence / variant suffixes that are not part of the SKU
_SEQUENCE_RE = re.compile(r"^(?P<sku>.+?)[_\-\s](?P<seq>\d+|alt\d*|primary|main|front|back|side)$", re.IGNORECASE)


def basename_without_ext(filename: str) -> str:
    return os.path.splitext(os.path.basename(filename or ""))[0]


def candidate_skus(filename: str) -> list:
    """
    Return candidate SKU strings derived from a filename, best-first.

    Examples:
        "SKU123.png"          -> ["SKU123"]
        "SKU123_1.png"        -> ["SKU123", "SKU123_1"]
        "VENDOR-SKU123_primary.png" -> ["VENDOR-SKU123", "VENDOR-SKU123_primary", "SKU123"]
    """
    base = basename_without_ext(filename).strip()
    if not base:
        return []

    candidates = [base]

    # Strip a trailing sequence/variant token
    m = _SEQUENCE_RE.match(base)
    if m:
        stripped = m.group("sku").strip()
        if stripped and stripped not in candidates:
            candidates.append(stripped)

    # If a separator exists, also try each token (SKU may be a segment)
    for sep in ("_", "-", " "):
        if sep in base:
            for token in base.split(sep):
                token = token.strip()
                if token and token not in candidates:
                    candidates.append(token)

    return candidates


def match_product(filename: str, sku_map: dict, vendor_map: dict = None):
    """
    Resolve a filename to a product using the SKU map.

    sku_map:    { "SKU" (upper) -> product }                     global
    vendor_map: { ("VENDOR_NAME", "SKU") (upper) -> product }    vendor-scoped

    Returns (product, matched_sku_key) or (None, None).
    """
    if vendor_map:
        for key, product in vendor_map.items():
            vendor_name, sku = key
            # Try vendor-qualified candidates first
            for cand in candidate_skus(filename):
                if cand.upper() == sku and _filename_mentions_vendor(filename, vendor_name):
                    return product, key

    for cand in candidate_skus(filename):
        product = sku_map.get(cand.upper())
        if product:
            return product, cand.upper()
    return None, None


def _filename_mentions_vendor(filename: str, vendor_name: str) -> bool:
    if not vendor_name:
        return False
    normalized = re.sub(r"[^a-z0-9]+", "", vendor_name.lower())
    if not normalized:
        return False
    return normalized in re.sub(r"[^a-z0-9]+", "", (filename or "").lower())
