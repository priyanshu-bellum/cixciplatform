"""
Product Data Normalization Service — deterministic, versioned.

Implements the CIXCI Product Data Normalization & SEO Rules spec (22 sections).
This is a pure-function service: no AI, no network calls, no side effects.
Every result is PASS / WARN / FAIL with rule codes for audit.

Entry points: CSV/XLSX import, Vendor API, manual Add/Edit, batch revalidation.
"""
import html
import re
import unicodedata
from dataclasses import dataclass, field
from typing import Optional

RULE_VERSION = "1.0.0"


class Outcome:
    PASS = "PASS"
    WARN = "WARN"
    FAIL = "FAIL"


@dataclass
class NormalizationResult:
    outcome: str = Outcome.PASS
    changes: dict = field(default_factory=dict)
    warnings: list = field(default_factory=list)
    errors: list = field(default_factory=list)
    rule_codes: list = field(default_factory=list)
    rule_version: str = RULE_VERSION


# ── Unicode / Transport Cleanup (§16) ──────────────────────────────────────

_TRANSPORT_ARTIFACTS = re.compile(r"_x000D_|_x000A_|\\r\\n|\\r|\\n")
_CONTROL_CHARS = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")
_HTML_ENTITY = re.compile(r"&(?:#\d+|#x[0-9a-fA-F]+|[a-zA-Z]+);")
_REPEATED_SPACES = re.compile(r"[ \t]{2,}")
_REPEATED_NEWLINES = re.compile(r"\n{3,}")
_EMOJI_PATTERN = re.compile(
    r"[\U0001F600-\U0001F64F\U0001F300-\U0001F5FF\U0001F680-\U0001F6FF"
    r"\U0001F900-\U0001F9FF\U00002702-\U000027B0\U0001FA00-\U0001FAFF]+",
)


def clean_text(text: str) -> str:
    if not text:
        return text
    text = _TRANSPORT_ARTIFACTS.sub("\n", text)
    text = _CONTROL_CHARS.sub("", text)
    if _HTML_ENTITY.search(text):
        text = html.unescape(text)
    text = _EMOJI_PATTERN.sub("", text)
    text = _REPEATED_SPACES.sub(" ", text)
    text = _REPEATED_NEWLINES.sub("\n\n", text)
    return text.strip()


# ── Brand Normalization (§5, §22) ──────────────────────────────────────────

_LEGAL_SUFFIXES = re.compile(
    r"\s+\b(?:LLC|Inc\.?|Corp\.?|Ltd\.?|Distribution|Wholesale)\b\.?(?=\s|$)",
    re.IGNORECASE,
)


def normalize_brand_in_name(name: str, brand: str) -> tuple[str, list]:
    """Remove duplicate/malformed brand occurrences. Keep one legitimate instance."""
    if not brand or not name:
        return name, []
    codes = []
    brand_clean = brand.strip()
    brand_lower = brand_clean.casefold()
    occurrences = [(m.start(), m.end()) for m in re.finditer(re.escape(brand_clean), name, re.IGNORECASE)]
    if len(occurrences) > 1:
        result = name[:occurrences[0][1]]
        last_end = occurrences[0][1]
        for start, end in occurrences[1:]:
            before = name[last_end:start]
            if before.strip() in ("", "-", "–", "—", "/", "|"):
                codes.append("BRAND_NAME_NORMALIZED")
            else:
                result += name[last_end:end]
            last_end = end
        result += name[last_end:]
        name = " ".join(result.split())
    name = _LEGAL_SUFFIXES.sub("", name).strip()
    if _LEGAL_SUFFIXES.search(name):
        codes.append("BRAND_NAME_NORMALIZED")
    return name, codes


# ── Accessory Name Normalization (§5) ──────────────────────────────────────

_DASH_VARIANTS = re.compile(r"[–—―‐‑]+")
_ORPHAN_PUNCT = re.compile(r"(?:^[-–—/|,;:]+|[-–—/|,;:]+$)")
_REPEATED_SEPARATORS = re.compile(r"[-–—]{2,}")


def normalize_name(name: str, brand: str = "") -> tuple[str, list]:
    if not name:
        return name, [{"code": "FAIL", "field": "name", "reason": "Empty product name"}]
    codes = []
    name = clean_text(name)
    name = _DASH_VARIANTS.sub("-", name)
    name = _REPEATED_SEPARATORS.sub("-", name)
    name = _ORPHAN_PUNCT.sub("", name)
    name = " ".join(name.split())
    if brand:
        name, brand_codes = normalize_brand_in_name(name, brand)
        codes.extend(brand_codes)
    if not name.strip():
        return "", [{"code": "FAIL", "field": "name", "reason": "Name empty after cleanup"}]
    return name.strip(), codes


# ── Short Description (§6) — NEVER auto-generate ──────────────────────────

def normalize_short_description(short_desc: Optional[str]) -> tuple[Optional[str], list]:
    """Vendor pass-through only. Clean transport artifacts but never generate."""
    if not short_desc or not short_desc.strip():
        return None, []
    return clean_text(short_desc), []


# ── Long Description (§7, §8) ─────────────────────────────────────────────

_VENDOR_URL_PATTERN = re.compile(
    r"(?:available\s+at|visit|go\s+to|claims?\s+at|register\s+at|shop\s+at)\s+"
    r"(?:https?://)?[\w.-]+\.(?:com|net|org|io|co)[\w/.-]*",
    re.IGNORECASE,
)
_VENDOR_CTA_PATTERN = re.compile(
    r"(?:buy\s+from\s+us|shop\s+at\s+\S+|order\s+(?:now\s+)?(?:at|on)\s+\S+|"
    r"purchase\s+directly\s+(?:at|from)\s+\S+)",
    re.IGNORECASE,
)
_VENDOR_RETURN_PATTERN = re.compile(
    r"(?:return|exchange|shipping)\s+(?:policy|instructions?)\s+(?:at|on|available)\s+\S+",
    re.IGNORECASE,
)
# §8: Entire bullet lines that are vendor warranty / brand-channel claims
_WARRANTY_BULLET_LINE = re.compile(
    r"[-•*]\s*\S+\s+(?:lifetime\s+)?warranty\s*:\s*[^\n]*",
    re.IGNORECASE,
)
_WARRANTY_SENTENCE = re.compile(
    r"(?:for\s+more\s+information\s+about\s+warranty|warranty\s+terms\s+and\s+conditions)"
    r"[^\n.]*[.\n]?",
    re.IGNORECASE,
)
# Broad warranty statement: "Brand Limited Lifetime Warranty" standalone or as sentence
_WARRANTY_STATEMENT = re.compile(
    r"[^\n.]*(?:limited\s+)?(?:lifetime\s+)?(?:warranty|guarantee)"
    r"(?:\s+(?:is\s+)?(?:included|provided|offered|covers?|applies|valid|available))?[^\n.]*[.\n]?",
    re.IGNORECASE,
)
# Vendor policy paragraphs (returns, exchanges, shipping policy, etc.)
_VENDOR_POLICY_PATTERN = re.compile(
    r"[^\n.]*(?:return\s+policy|exchange\s+policy|shipping\s+policy|refund\s+policy|"
    r"satisfaction\s+guarantee|money[\s-]back\s+guarantee|"
    r"(?:all|any)\s+(?:returns?|exchanges?|claims?)\s+(?:must|should|will|can)\b)[^\n.]*[.\n]?",
    re.IGNORECASE,
)


def normalize_description(description: Optional[str]) -> tuple[Optional[str], list]:
    if not description or not description.strip():
        return None, []
    codes = []
    text = clean_text(description)
    cleaned = _WARRANTY_BULLET_LINE.sub("", text)
    cleaned = _WARRANTY_SENTENCE.sub("", cleaned)
    cleaned = _WARRANTY_STATEMENT.sub("", cleaned)
    cleaned = _VENDOR_URL_PATTERN.sub("", cleaned)
    cleaned = _VENDOR_CTA_PATTERN.sub("", cleaned)
    cleaned = _VENDOR_RETURN_PATTERN.sub("", cleaned)
    cleaned = _VENDOR_POLICY_PATTERN.sub("", cleaned)
    if cleaned != text:
        codes.append("CHANNEL_SPECIFIC_VENDOR_CONTENT_REMOVED")
    cleaned = re.sub(r"[•\-]\s*\n", "", cleaned)
    cleaned = _REPEATED_NEWLINES.sub("\n\n", cleaned)
    return cleaned.strip() or None, codes


# ── Warranty (§8) ──────────────────────────────────────────────────────────

_WARRANTY_VENDOR_CHANNEL = re.compile(
    r"(?:warranty|guarantee)\s+.*?(?:available|claims?|register)\s+(?:at|on|through)\s+"
    r"(?:https?://)?[\w.-]+\.(?:com|net|org|io|co)[\w/.-]*",
    re.IGNORECASE,
)


def normalize_warranty_in_description(description: str) -> tuple[str, list]:
    """Remove vendor-channel-specific warranty language from buyer-facing description."""
    if not description:
        return description, []
    codes = []
    cleaned = _WARRANTY_VENDOR_CHANNEL.sub("", description)
    cleaned = _WARRANTY_BULLET_LINE.sub("", cleaned)
    cleaned = _WARRANTY_SENTENCE.sub("", cleaned)
    cleaned = _WARRANTY_STATEMENT.sub("", cleaned)
    cleaned = _VENDOR_POLICY_PATTERN.sub("", cleaned)
    if cleaned != description:
        codes.append("CHANNEL_SPECIFIC_VENDOR_CONTENT_REMOVED")
    return cleaned.strip(), codes


# ── Meta Title (§9) ───────────────────────────────────────────────────────

def generate_meta_title(
    name: str,
    brand: str = "",
    category: str = "",
    color: str = "",
) -> tuple[str, list]:
    """
    Generate canonical CIXCI Meta Title deterministically.
    Target: 50-60 chars. No "CIXCI" platform name.
    """
    if not name:
        return "", [{"code": "FAIL", "field": "meta_title"}]
    codes = []
    parts = []
    name_clean = name.strip()
    brand_in_name = brand and brand.casefold() in name_clean.casefold()
    if brand and not brand_in_name:
        parts.append(brand.strip())
    parts.append(name_clean)
    if color and color.casefold() not in name_clean.casefold():
        parts.append(f"- {color.strip()}")
    title = " ".join(parts)
    if len(title) > 60:
        title = " ".join([name_clean])
        if len(title) > 60:
            words = title.split()
            title = ""
            for w in words:
                candidate = f"{title} {w}".strip()
                if len(candidate) > 57:
                    break
                title = candidate
    return title.strip(), codes


# ── Meta Description (§10) ────────────────────────────────────────────────

def generate_meta_description(
    name: str,
    brand: str = "",
    category: str = "",
    description: str = "",
) -> tuple[str, list]:
    """
    Generate canonical CIXCI Meta Description deterministically.
    Target: 140-155 chars. No "CIXCI" platform name. No invented claims.
    """
    if not name:
        return "", [{"code": "FAIL", "field": "meta_description"}]
    codes = []
    intro = f"Shop the {name}"
    if brand and brand.casefold() not in name.casefold():
        intro = f"Shop the {brand} {name}"
    if category:
        intro += f" in {category}"
    intro += "."
    if description:
        first_sentence = ""
        for sentence in re.split(r"(?<=[.!?])\s+", description.strip()):
            sentence = sentence.strip()
            if sentence and len(sentence) > 15 and not _VENDOR_URL_PATTERN.search(sentence):
                first_sentence = sentence
                break
        if first_sentence:
            combined = f"{intro} {first_sentence}"
            if len(combined) <= 155:
                intro = combined
            elif len(intro) < 140:
                remaining = 155 - len(intro) - 1
                if remaining > 20:
                    words = first_sentence.split()
                    snippet = ""
                    for w in words:
                        candidate = f"{snippet} {w}".strip()
                        if len(candidate) > remaining - 3:
                            break
                        snippet = candidate
                    if snippet:
                        intro = f"{intro} {snippet}..."
    if len(intro) > 155:
        words = intro.split()
        intro = ""
        for w in words:
            candidate = f"{intro} {w}".strip()
            if len(candidate) > 152:
                break
            intro = candidate
        intro += "..."
    return intro.strip(), codes


# ── Cross-Field Validation (§11) ──────────────────────────────────────────

_WATTAGE_PATTERN = re.compile(r"(\d+)\s*[Ww](?:att)?(?:s)?\b")
_PORT_COUNT_PATTERN = re.compile(r"(\d+)\s*[-\s]?[Pp]ort")
_PACK_QTY_PATTERN = re.compile(r"(\d+)\s*[-\s]?[Pp]ack")


def cross_field_validate(name: str, meta_title: str = "", meta_description: str = "", description: str = "") -> list:
    """Flag material contradictions between product fields."""
    warnings = []

    def _extract(pattern, text):
        m = pattern.search(text or "")
        return int(m.group(1)) if m else None

    name_watt = _extract(_WATTAGE_PATTERN, name)
    for field_name, field_val in [("meta_title", meta_title), ("meta_description", meta_description), ("description", description)]:
        field_watt = _extract(_WATTAGE_PATTERN, field_val)
        if name_watt and field_watt and name_watt != field_watt:
            warnings.append({"code": "SEO_PRODUCT_FACT_CONFLICT", "field": field_name,
                             "detail": f"Name says {name_watt}W, {field_name} says {field_watt}W"})

    name_ports = _extract(_PORT_COUNT_PATTERN, name)
    for field_name, field_val in [("meta_title", meta_title), ("meta_description", meta_description)]:
        field_ports = _extract(_PORT_COUNT_PATTERN, field_val)
        if name_ports and field_ports and name_ports != field_ports:
            warnings.append({"code": "SEO_PRODUCT_FACT_CONFLICT", "field": field_name,
                             "detail": f"Name says {name_ports}-Port, {field_name} says {field_ports}-Port"})

    return warnings


# ── Weight Unit Normalization ─────────────────────────────────────────────

def normalize_weight(weight_value, weight_unit: str = "oz") -> tuple:
    """Ensure weight is stored in the declared unit. No silent conversion."""
    if weight_value is None:
        return None, weight_unit or "oz", []
    return weight_value, weight_unit or "oz", []


# ── Color Mapping ─────────────────────────────────────────────────────────

_COLOR_SEPARATORS = re.compile(r"\s*[&/]\s*")


def resolve_system_color(vendor_color: str, color_mappings: dict) -> tuple[str, list]:
    """Map vendor color to CIXCI system color using configured mappings."""
    if not vendor_color:
        return "", []
    key = vendor_color.strip().casefold()
    system_color = color_mappings.get(key, "")
    if system_color:
        return system_color, []
    return "", [{"code": "COLOR_MAPPING_REQUIRED", "field": "system_color",
                 "detail": f"No mapping for vendor color '{vendor_color}'"}]


def resolve_system_colors(vendor_color: str, color_mappings: dict) -> tuple[list[str], str, list]:
    """Resolve multi-color vendor values to a list of system colors.

    Splits on & and / separators. Returns (system_colors_list, primary_system_color, warnings).
    """
    if not vendor_color:
        return [], "", []
    full_key = vendor_color.strip().casefold()
    full_match = color_mappings.get(full_key)
    if full_match:
        return [full_match], full_match, []
    parts = [p.strip() for p in _COLOR_SEPARATORS.split(vendor_color) if p.strip()]
    if len(parts) <= 1:
        return [], "", [{"code": "COLOR_MAPPING_REQUIRED", "field": "system_color",
                         "detail": f"No mapping for vendor color '{vendor_color}'"}]
    resolved, warnings = [], []
    for part in parts:
        key = part.casefold()
        mapped = color_mappings.get(key)
        if mapped:
            if mapped not in resolved:
                resolved.append(mapped)
        else:
            warnings.append({"code": "COLOR_MAPPING_REQUIRED", "field": "system_color",
                             "detail": f"No mapping for color part '{part}' in '{vendor_color}'"})
    primary = resolved[0] if resolved else ""
    return resolved, primary, warnings


# ── Buyer Export Formatting (§14) ─────────────────────────────────────

_BULLET_LINE = re.compile(r"^\s*[•\-\*]\s+", re.MULTILINE)
_KEY_FEATURES_HEADING = re.compile(r"^key\s+features\s*:?\s*$", re.IGNORECASE | re.MULTILINE)


def _split_description_parts(description: str) -> tuple[str, list[str]]:
    """Split a canonical description into intro paragraph and bullet list."""
    if not description:
        return "", []
    heading_match = _KEY_FEATURES_HEADING.search(description)
    if heading_match:
        intro = description[:heading_match.start()].strip()
        after = description[heading_match.end():]
    else:
        intro = ""
        after = description

    bullets = []
    remaining_lines = []
    for line in after.split("\n"):
        stripped = line.strip()
        if _BULLET_LINE.match(line):
            bullets.append(_BULLET_LINE.sub("", line).strip())
        elif stripped:
            remaining_lines.append(stripped)

    if not intro and remaining_lines:
        intro = " ".join(remaining_lines)
        remaining_lines = []
    elif remaining_lines and not bullets:
        intro = (intro + " " + " ".join(remaining_lines)).strip()

    return intro, bullets


def format_description_html(description: str) -> str:
    """Format canonical description as sanitized HTML preserving structure (§14)."""
    if not description:
        return ""
    intro, bullets = _split_description_parts(description)
    parts = []
    if intro:
        safe_intro = html.escape(intro)
        parts.append(f"<p>{safe_intro}</p>")
    if bullets:
        parts.append("<h3>Key Features</h3>")
        items = "".join(f"<li>{html.escape(b)}</li>" for b in bullets)
        parts.append(f"<ul>{items}</ul>")
    return "".join(parts) if parts else html.escape(description)


def format_description_plaintext(description: str) -> str:
    """Format canonical description as UTF-8 plain text with bullet markers (§14)."""
    if not description:
        return ""
    intro, bullets = _split_description_parts(description)
    parts = []
    if intro:
        parts.append(intro)
    if bullets:
        parts.append("\nKey Features")
        for b in bullets:
            parts.append(f"• {b}")
    return "\n".join(parts) if parts else description


# ── Buyer Sync Detection (§15) ───────────────────────────────────────

BUYER_FACING_FIELDS = frozenset([
    "name", "description", "short_description", "meta_title", "meta_description",
])


def detect_buyer_sync_needed(original: dict, proposed: dict) -> bool:
    """Return True if any buyer-facing field changed between original and proposed."""
    for field in BUYER_FACING_FIELDS:
        orig_val = (original.get(field) or "").strip()
        prop_val = (proposed.get(field) or "").strip()
        if orig_val != prop_val:
            return True
    return False


# ── Full Normalization Pipeline ───────────────────────────────────────────

def normalize_product(
    *,
    name: str,
    brand: str = "",
    category: str = "",
    color: str = "",
    short_description: str = None,
    description: str = None,
    meta_title: str = None,
    meta_description: str = None,
    warranty: str = None,
    vendor_meta_title: str = None,
    vendor_meta_description: str = None,
) -> NormalizationResult:
    """
    Run the full normalization pipeline. Returns proposed canonical values.
    Does not mutate the product — caller decides whether to apply changes.
    """
    result = NormalizationResult()

    norm_name, name_codes = normalize_name(name, brand)
    result.changes["name"] = norm_name
    result.rule_codes.extend(name_codes)

    norm_short, _ = normalize_short_description(short_description)
    result.changes["short_description"] = norm_short

    norm_desc, desc_codes = normalize_description(description)
    if norm_desc:
        norm_desc, warranty_codes = normalize_warranty_in_description(norm_desc)
        desc_codes.extend(warranty_codes)
    result.changes["description"] = norm_desc
    result.rule_codes.extend(desc_codes)

    gen_title, title_codes = generate_meta_title(norm_name, brand, category, color)
    result.changes["meta_title"] = gen_title
    result.rule_codes.extend(title_codes)

    if vendor_meta_title and vendor_meta_title.strip():
        vmt = vendor_meta_title.strip().casefold()
        if vmt in ("active", "draft", "inactive") or vmt.isdigit() or len(vmt) < 5:
            result.warnings.append({"code": "INVALID_META_TITLE_SOURCE_VALUE",
                                    "field": "meta_title", "source": vendor_meta_title})

    gen_desc, mdesc_codes = generate_meta_description(
        norm_name, brand, category, norm_desc or "")
    result.changes["meta_description"] = gen_desc
    result.rule_codes.extend(mdesc_codes)

    if vendor_meta_description and vendor_meta_description.strip():
        vmd = vendor_meta_description.strip()
        if vmd.isdigit() or len(vmd) < 10:
            result.warnings.append({"code": "INVALID_META_DESCRIPTION_SOURCE_VALUE",
                                    "field": "meta_description", "source": vendor_meta_description})

    xfield_warnings = cross_field_validate(norm_name, gen_title, gen_desc, norm_desc or "")
    result.warnings.extend(xfield_warnings)

    def _code_str(c):
        return c.get("code", "") if isinstance(c, dict) else str(c)

    if any(_code_str(c) == "FAIL" for c in name_codes):
        result.outcome = Outcome.FAIL
    elif result.warnings or any("REVIEW" in _code_str(c) for c in result.rule_codes):
        result.outcome = Outcome.WARN
    else:
        result.outcome = Outcome.PASS

    return result
