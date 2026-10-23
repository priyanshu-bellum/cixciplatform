"""
Media validation service.

Enforces the CIXCI Media / Image Asset Management Validation Rules:
- PNG only (extension + MIME sniff + PNG signature)
- Real transparency (alpha channel with at least one non-opaque pixel)
- File size / pixel-dimension limits
- Filename sanitisation (no path traversal, unsafe chars, length)
- Content-hash duplicate detection

Used by every media ingestion entry point (single upload, bulk ZIP,
CSV/URL import, product API) so rules cannot be bypassed by picking a
different endpoint.
"""
import hashlib
import os
import re
import zipfile
from dataclasses import dataclass, field

from django.conf import settings

# PNG magic number
PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"

# Asset types that must obey image validation rules. Other types
# (document, other) are not covered by the image rules.
IMAGE_ASSET_TYPES = {"product_image", "device_image", "brand_logo"}

# Unsafe filename characters: anything outside this set is stripped.
_UNSAFE_CHARS = re.compile(r"[^A-Za-z0-9._-]+")
_MAX_FILENAME_LEN = 200


@dataclass
class ValidationResult:
    ok: bool = False
    errors: list = field(default_factory=list)
    warnings: list = field(default_factory=list)
    width: int | None = None
    height: int | None = None
    has_transparency: bool = False
    content_hash: str = ""
    file_size_bytes: int = 0
    is_duplicate: bool = False
    duplicate_of: str | None = None

    @property
    def failed(self):
        return not self.ok


def _setting(name, default):
    return getattr(settings, name, default)


def max_image_bytes():
    return _setting("MEDIA_IMAGE_MAX_SIZE", 10 * 1024 * 1024)


def max_zip_bytes():
    return _setting("MEDIA_ZIP_MAX_SIZE", 100 * 1024 * 1024)


def max_zip_uncompressed_bytes():
    return _setting("MEDIA_ZIP_MAX_UNCOMPRESSED_SIZE", 500 * 1024 * 1024)


def max_image_dimension():
    return _setting("MEDIA_IMAGE_MAX_DIMENSION", 8000)


def min_image_dimension():
    return _setting("MEDIA_IMAGE_MIN_DIMENSION", 100)


def min_image_bytes():
    return _setting("MEDIA_IMAGE_MIN_BYTES", 100)


def sanitize_filename(raw: str) -> str:
    """
    Reduce an attacker- or user-supplied filename to a safe basename.

    - Drops any directory components (path traversal)
    - Strips characters outside [A-Za-z0-9._-]
    - Collapses runs of dots/underscores, trims leading/trailing noise
    - Enforces a length cap and a non-empty result
    """
    if not raw:
        return "upload.png"

    # 1. Drop directory components (handles both separators)
    name = os.path.basename(str(raw).replace("\\", "/").split("/")[-1])

    # 2. Strip unsafe characters
    name = _UNSAFE_CHARS.sub("_", name)

    # 3. Collapse repeated separators and clean edges
    name = re.sub(r"[._-]{2,}", "_", name).strip("._-")

    # 4. Guard against reserved/traversal results
    if not name or name in {".", ".."}:
        return "upload.png"

    # 5. Enforce length, keeping the extension
    if len(name) > _MAX_FILENAME_LEN:
        stem, ext = os.path.splitext(name)
        keep = _MAX_FILENAME_LEN - len(ext)
        name = stem[:keep] + ext

    return name


def extension_of(filename: str) -> str:
    return os.path.splitext(filename or "")[1].lower()


def is_png_bytes(head: bytes) -> bool:
    return head[:8] == PNG_SIGNATURE


def sniff_mime(head: bytes) -> str:
    """Best-effort MIME sniffing from magic bytes (never trusts client input)."""
    if is_png_bytes(head):
        return "image/png"
    if head[:3] == b"\xff\xd8\xff":
        return "image/jpeg"
    if head[:6] in (b"GIF87a", b"GIF89a"):
        return "image/gif"
    if head[:4] == b"RIFF" and head[8:12] == b"WEBP":
        return "image/webp"
    if head[:4] == b"%PDF":
        return "application/pdf"
    return "application/octet-stream"


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def check_transparency(img) -> bool:
    """
    Return True only when the PNG has a real alpha channel AND at least one
    pixel is not fully opaque (i.e. an actual transparent background).
    """
    if img.mode in ("RGBA", "LA", "PA") or "transparency" in img.info:
        try:
            alpha = img.convert("RGBA").getchannel("A")
        except Exception:
            return False
        # getextrema is O(n) in C — far faster than per-pixel iteration
        lo, _hi = alpha.getextrema()
        return lo < 255
    return False


def validate_image_bytes(
    data: bytes,
    filename: str,
    asset_type: str = "product_image",
    mime_hint: str | None = None,
    check_duplicates: bool = True,
    company_id=None,
) -> ValidationResult:
    """
    Validate a single media file against the platform image rules.

    Non-image asset types are skipped (only filename/size enforced).
    """
    result = ValidationResult()

    # ── Size ──
    size = len(data)
    result.file_size_bytes = size
    if size == 0:
        result.errors.append("File is empty (0 bytes).")
        return result
    if size < min_image_bytes():
        result.errors.append(
            f"File is too small ({size} bytes); minimum is {min_image_bytes()} bytes."
        )
        return result
    if size > max_image_bytes():
        result.errors.append(
            f"File size ({size / 1024 / 1024:.2f} MB) exceeds the "
            f"{max_image_bytes() / 1024 / 1024:.0f} MB limit."
        )
        return result

    ext = extension_of(filename)
    if not ext:
        result.errors.append("Filename must have an extension.")
        return result

    result.content_hash = sha256_bytes(data)

    # ── Non-image asset types: no format rules ──
    if asset_type not in IMAGE_ASSET_TYPES:
        result.ok = True
        return result

    # ── Format: extension, signature, MIME ──
    if ext != ".png":
        result.errors.append(
            f"Unsupported file type '{ext}'. Only PNG images are allowed."
        )
        return result

    head = data[:32]
    sniffed = sniff_mime(head)
    if sniffed != "image/png":
        result.errors.append(
            f"File content is '{sniffed}', not PNG. Renamed files are rejected."
        )
        return result

    if mime_hint and mime_hint not in ("image/png", "", None):
        result.errors.append(
            f"Declared content type '{mime_hint}' does not match PNG."
        )
        return result

    # ── Decode, dimensions, transparency ──
    try:
        from io import BytesIO
        from PIL import Image

        img = Image.open(BytesIO(data))
        img.load()
    except Exception as exc:
        result.errors.append(f"PNG appears corrupted or unreadable ({exc}).")
        return result

    width, height = img.size
    result.width = width
    result.height = height

    if width > max_image_dimension() or height > max_image_dimension():
        result.errors.append(
            f"Image dimensions {width}x{height} exceed the "
            f"{max_image_dimension()}px maximum."
        )
        return result

    if width < min_image_dimension() or height < min_image_dimension():
        result.errors.append(
            f"Image dimensions {width}x{height} are below the "
            f"{min_image_dimension()}px minimum."
        )
        return result

    if not check_transparency(img):
        result.errors.append(
            "Image has no transparent background (alpha channel required)."
        )
        return result

    result.has_transparency = True

    # ── Duplicate detection ──
    if check_duplicates and result.content_hash and company_id:
        from apps.media.models import MediaAsset

        dup = (
            MediaAsset.objects.filter(
                content_hash=result.content_hash,
                company_scope_reference=company_id,
                status="ready",
            )
            .exclude(original_filename=filename)
            .first()
        )
        if dup:
            result.is_duplicate = True
            result.duplicate_of = str(dup.id)
            result.warnings.append(
                f"Duplicate of existing asset '{dup.original_filename}'."
            )

    result.ok = True
    return result


def validate_zip_archive(
    zip_file,
    company_id,
    asset_type: str = "product_image",
):
    """
    Validate a ZIP archive before extracting images.

    Returns a dict:
      ok: bool
      error: str | None   (archive-level rejection)
      entries: list[dict] (per-file payloads: info, data, filename)
      summary: dict (counters for the archive)
    """
    summary = {
        "total_files": 0,
        "png_files": 0,
        "unsupported_type": 0,
        "encrypted": 0,
        "too_large": 0,
        "corrupted": 0,
        "not_transparent": 0,
        "below_min_size": 0,
        "below_min_dimension": 0,
        "duplicates": 0,
    }

    if not zipfile.is_zipfile(zip_file):
        return {"ok": False, "error": "Uploaded file is not a valid ZIP archive.", "entries": [], "summary": summary}

    zip_size = zip_file.size
    if zip_size > max_zip_bytes():
        return {
            "ok": False,
            "error": (
                f"ZIP file size ({zip_size / 1024 / 1024:.1f} MB) exceeds maximum "
                f"({max_zip_bytes() / 1024 / 1024:.0f} MB)."
            ),
            "entries": [],
            "summary": summary,
        }

    entries = []
    try:
        with zipfile.ZipFile(zip_file, "r") as zf:
            infos = zf.infolist()

            # Encrypted / password-protected entries
            encrypted = [i.filename for i in infos if i.flag_bits & 0x1]
            if encrypted:
                return {
                    "ok": False,
                    "error": "ZIP contains password-protected entries. Remove passwords and re-upload.",
                    "entries": [],
                    "summary": summary,
                }

            # ZIP-bomb guard: total uncompressed size
            total_uncompressed = sum(i.file_size for i in infos if not i.is_dir())
            if total_uncompressed > max_zip_uncompressed_bytes():
                return {
                    "ok": False,
                    "error": (
                        f"ZIP uncompressed size ({total_uncompressed / 1024 / 1024:.1f} MB) "
                        f"exceeds the {max_zip_uncompressed_bytes() / 1024 / 1024:.0f} MB limit."
                    ),
                    "entries": [],
                    "summary": summary,
                }

            file_infos = [i for i in infos if not i.is_dir()]
            if not file_infos:
                return {"ok": False, "error": "ZIP archive contains no files.", "entries": [], "summary": summary}

            summary["total_files"] = len(file_infos)

            for info in file_infos:
                base_name = sanitize_filename(os.path.basename(info.filename))
                ext = extension_of(base_name)

                if ext != ".png":
                    summary["unsupported_type"] += 1
                    entries.append({
                        "filename": base_name,
                        "source_name": info.filename,
                        "status": "failed",
                        "reason": f"Unsupported file type '{ext or 'unknown'}'. Only PNG is allowed.",
                        "data": None,
                    })
                    continue

                if info.file_size > max_image_bytes():
                    summary["too_large"] += 1
                    entries.append({
                        "filename": base_name,
                        "source_name": info.filename,
                        "status": "failed",
                        "reason": (
                            f"Image exceeds the {max_image_bytes() / 1024 / 1024:.0f} MB per-image limit."
                        ),
                        "data": None,
                    })
                    continue

                try:
                    data = zf.read(info)
                except Exception as exc:
                    summary["corrupted"] += 1
                    entries.append({
                        "filename": base_name,
                        "source_name": info.filename,
                        "status": "failed",
                        "reason": f"Could not read file from ZIP ({exc}).",
                        "data": None,
                    })
                    continue

                if len(data) < min_image_bytes():
                    summary["below_min_size"] += 1
                    entries.append({
                        "filename": base_name,
                        "source_name": info.filename,
                        "status": "failed",
                        "reason": f"File is too small ({len(data)} bytes).",
                        "data": None,
                    })
                    continue

                validation = validate_image_bytes(
                    data=data,
                    filename=base_name,
                    asset_type=asset_type,
                    check_duplicates=True,
                    company_id=company_id,
                )
                summary["png_files"] += 1

                if not validation.ok:
                    reason = validation.errors[0] if validation.errors else "Validation failed."
                    if "transparency" in reason or "alpha" in reason:
                        summary["not_transparent"] += 1
                    elif "dimensions" in reason and "below" in reason:
                        summary["below_min_dimension"] += 1
                    entries.append({
                        "filename": base_name,
                        "source_name": info.filename,
                        "status": "failed",
                        "reason": reason,
                        "data": None,
                    })
                    continue

                if validation.is_duplicate:
                    summary["duplicates"] += 1
                    # Downgrade to warning: cross-product image reuse is legitimate
                    # (e.g. cables of different lengths sharing the same photo).
                    # Per-product duplicate blocking is handled later in upload_zip.

                entries.append({
                    "filename": base_name,
                    "source_name": info.filename,
                    "status": "valid",
                    "reason": "",
                    "data": data,
                    "content_hash": validation.content_hash,
                    "width": validation.width,
                    "height": validation.height,
                    "has_transparency": validation.has_transparency,
                    "file_size_bytes": validation.file_size_bytes,
                })

    except zipfile.BadZipFile:
        return {"ok": False, "error": "ZIP archive is corrupted and could not be opened.", "entries": [], "summary": summary}

    return {"ok": True, "error": None, "entries": entries, "summary": summary}


# ── Image URL validation (Rule §11) ──────────────────────────────────────────

def validate_image_url(url: str, timeout: int = 10):
    """
    Validate an external image URL before importing it as managed media.

    Returns (ok: bool, data: bytes|None, filename: str|None, errors: list[str]).

    Rules §11:
    - valid absolute HTTPS URL
    - reachable at processing time
    - must return PNG content (checked via signature after download)
    - redirects followed by the HTTP client (bounded, same as fetch)
    """
    import urllib.request
    import urllib.parse

    errors = []
    if not url or not isinstance(url, str):
        return False, None, None, ["Image URL is empty."]

    parsed = urllib.parse.urlparse(url.strip())
    if parsed.scheme not in ("https", "http"):
        return False, None, None, ["Image URL must use http(s)."]
    # §11: HTTPS is the approved protocol; warn on plain http.
    if parsed.scheme != "https":
        errors.append("Image URL should use HTTPS for security.")

    filename = os.path.basename(parsed.path) or "image.png"
    if "?" in filename:
        filename = filename.split("?")[0]

    try:
        req = urllib.request.Request(url, headers={"User-Agent": "CIXCI-Media-Validator"})
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            ctype = (resp.headers.get("Content-Type") or "").split(";")[0].strip().lower()
            data = resp.read(max_image_bytes() + 1)
    except Exception as exc:
        return False, None, None, [f"Image URL is not reachable ({exc})."]

    if len(data) > max_image_bytes():
        return False, None, None, [
            f"Remote image exceeds the {max_image_bytes() / 1024 / 1024:.0f} MB limit."
        ]

    if ctype and ctype not in ("image/png", "application/octet-stream", ""):
        errors.append(f"Remote content type '{ctype}' is not PNG.")

    if not is_png_bytes(data[:8]):
        errors.append("Remote content is not a PNG image.")

    ok = len(errors) == 0
    return ok, (data if ok else None), filename, errors


# ── Alt text validation (Rule §19) ───────────────────────────────────────────
_MAX_ALT_TEXT_LEN = 500
_ALT_UNSAFE = re.compile(r"[<>{}\\]")


def validate_alt_text(
    alt_text: str,
    required: bool = False,
    max_length: int = _MAX_ALT_TEXT_LEN,
):
    """
    Validate image alt text.

    Returns (ok: bool, errors: list[str]).

    Rules §19:
    - required (when CIXCI uses the accessibility/SEO field)
    - not blank when required
    - within the approved character limit
    - no unsupported characters (angle brackets, braces, backslashes)
    - not obviously keyword-stuffed
    """
    errors = []
    value = (alt_text or "").strip()

    if not value:
        if required:
            errors.append("Alt text is required.")
        return (not errors), errors

    if len(value) > max_length:
        errors.append(f"Alt text exceeds the {max_length} character limit.")

    if _ALT_UNSAFE.search(value):
        errors.append("Alt text contains unsupported characters.")

    words = value.split()
    if words:
        lowered = [w.lower() for w in words]
        # keyword stuffing: any single word repeated more than 3 times
        for w in set(lowered):
            if lowered.count(w) > 3 and len(w) > 2:
                errors.append("Alt text appears keyword-stuffed.")
                break

    return (not errors), errors

