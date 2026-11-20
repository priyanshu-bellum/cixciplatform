"""Provider-neutral translation of declared device references, never inferred scope.

Connection JSON owns provider paths/aliases. Canonical catalog commands continue
to own permission, category eligibility, exclusions, history and matching rules.
"""
import re
import uuid
from html import unescape

from django.core.exceptions import ValidationError

from apps.devices.models import Device, DeviceType, Manufacturer
from apps.catalog.compatibility_contract import product_universal_types
from .catalog_config import path_value


def normalized_name(value):
    return ' '.join(unescape(str(value or '')).split()).casefold()


class CatalogDeviceResolver:
    """Resolve a bounded feed page against one reusable canonical-device index."""

    def __init__(self, config):
        self.config = config.get('compatibility', {})
        self._devices = None

    def _index(self):
        if self._devices is None:
            self._devices = {}
            for device in Device.objects.select_related('manufacturer').iterator():
                for label in {device.name, str(device), device.model_number} - {''}:
                    self._devices.setdefault(normalized_name(label), {})[str(device.pk)] = device
        return self._devices

    def _fuzzy_lookup(self, name):
        index = self._index()
        n = normalized_name(name)
        for alt in self._name_variations(n):
            hits = index.get(alt)
            if hits:
                return list(hits.values())
        return []

    _MANUFACTURER_PREFIXES = [
        'samsung', 'apple', 'google', 'motorola', 'oneplus',
        'lg', 'nokia', 'sony', 'huawei', 'xiaomi', 'oppo',
        'vivo', 'zte', 'tcl', 'alcatel', 'blu', 'cat',
        'cricket', 'boost', 't-mobile', 'at&t', 'metro',
    ]

    def _auto_create_device(self, name):
        """Auto-create a Device from an unresolved vendor name."""
        mfr_name, device_name = None, name
        lower = name.lower()
        for prefix in self._MANUFACTURER_PREFIXES:
            if lower.startswith(prefix + ' '):
                mfr_name = name[:len(prefix)]
                device_name = name[len(prefix):].strip()
                break
        if not mfr_name:
            parts = name.split(None, 1)
            if len(parts) == 2:
                mfr_name, device_name = parts
        if not mfr_name:
            mfr_name = 'Unknown'
        mfr, _ = Manufacturer.objects.get_or_create(
            name__iexact=mfr_name,
            defaults={'name': mfr_name, 'is_active': True},
        )
        phone_type = DeviceType.objects.filter(
            code='phone', is_active=True,
        ).first()
        device = Device(
            device_type=phone_type,
            manufacturer=mfr,
            name=device_name,
            lifecycle_status='available',
        )
        device.save()
        idx = self._index()
        for label in {device.name, str(device), device.model_number} - {''}:
            idx.setdefault(normalized_name(label), {})[str(device.pk)] = device
        return device

    @staticmethod
    def _name_variations(n):
        seen = set()
        def _emit(v):
            if v and v not in seen:
                seen.add(v)
                return True
            return False

        if _emit(re.sub(r'\s+plus\b', '+', n)):
            yield re.sub(r'\s+plus\b', '+', n)
        m = re.match(r'^(.+?)\s+-\s+(\d{4})\s*$', n)
        if m:
            alt = f'{m.group(1).strip()} ({m.group(2)})'
            if _emit(alt):
                yield alt
        for prefix in ('motorola ', 'moto '):
            if n.startswith(prefix):
                rest = n[len(prefix):]
                if _emit(rest):
                    yield rest
                rest_plus = re.sub(r'\s+plus\b', '+', rest)
                if _emit(rest_plus):
                    yield rest_plus
                m2 = re.match(r'^(.+?)\s+-\s+(\d{4})\s*$', rest)
                if m2:
                    alt2 = f'{m2.group(1).strip()} ({m2.group(2)})'
                    if _emit(alt2):
                        yield alt2
                    alt2p = re.sub(r'\s+plus\b', '+', alt2)
                    if _emit(alt2p):
                        yield alt2p
                m2b = re.match(r'^(.+?)\s+\((\d{4})\)\s*$', rest)
                if m2b:
                    alt2b = f'{m2b.group(1).strip()} ({m2b.group(2)})'
                    if _emit(alt2b):
                        yield alt2b
                    alt2bp = re.sub(r'\s+plus\b', '+', alt2b)
                    if _emit(alt2bp):
                        yield alt2bp
        alt = re.sub(r'(\D)\s+(\d)', r'\1\2', n)
        if _emit(alt):
            yield alt
        m3 = re.match(r'^(.+?)\s+-\s+(\d{4})\s*/\s*(\d{4})\s*$', n)
        if m3:
            for yr in (m3.group(2), m3.group(3)):
                alt3 = f'{m3.group(1).strip()} ({yr})'
                if _emit(alt3):
                    yield alt3
        for prefix in ('motorola ', 'moto '):
            if n.startswith(prefix):
                rest = n[len(prefix):]
                m4 = re.match(r'^(.+?)\s+-\s+(\d{4})\s*/\s*(\d{4})\s*$', rest)
                if m4:
                    for yr in (m4.group(2), m4.group(3)):
                        alt4 = f'{m4.group(1).strip()} ({yr})'
                        if _emit(alt4):
                            yield alt4

    def declaration(self, raw, *, category, product=None):
        if raw is None or raw == '':
            return ''
        entries = raw if isinstance(raw, list) else re.split(r'[;,]', raw) if isinstance(raw, str) else None
        if entries is None or len(entries) > 500:
            raise ValidationError('Supply declared device names, IDs or a bounded array of device references.')
        tokens = []
        aliases = self.config.get('device_map', {})
        for entry in entries:
            manufacturer = ''
            if isinstance(entry, dict):
                label = path_value(entry, self.config.get('name_path', 'name'), '')
                manufacturer = path_value(entry, self.config.get('manufacturer_path', 'manufacturer'), '')
                references = [
                    f'id:{path_value(entry, self.config.get("id_path", "id"), "")}',
                    f'slug:{path_value(entry, self.config.get("slug_path", "slug"), "")}',
                    str(label),
                ]
                mapped = {str(aliases[key]) for key in references if key in aliases}
                if len(mapped) > 1:
                    raise ValidationError('Conflicting configured canonical device mappings.')
                token = next(iter(mapped)) if mapped else label
            elif isinstance(entry, str):
                token = aliases.get(entry.strip(), entry.strip())
            else:
                raise ValidationError('Each device reference must be a name, canonical ID or configured object.')
            if not isinstance(token, str) or not token.strip():
                raise ValidationError('A device reference needs a configured canonical mapping or non-empty name.')
            token = token.strip()
            try:
                uuid.UUID(token)
            except ValueError:
                candidates = list(self._index().get(normalized_name(token), {}).values())
                if not candidates:
                    candidates = self._fuzzy_lookup(token)
                if manufacturer:
                    candidates = [device for device in candidates if normalized_name(device.manufacturer.name) == normalized_name(manufacturer)]
                    if not candidates:
                        raise ValidationError('Declared device manufacturer does not resolve to a canonical device.')
                if len(candidates) > 1:
                    active = [d for d in candidates if getattr(d, 'lifecycle_status', '') == 'available']
                    candidates = active if active else candidates
                if candidates:
                    token = str(candidates[0].pk)
                elif not manufacturer:
                    token = str(self._auto_create_device(token).pk)
            tokens.append(token)
        if len(tokens) == 1 and normalized_name(tokens[0]) == 'universal':
            types = self.config.get('universal_type_map', {}).get(category, [])
            if not types and product is not None:
                types = [str(record.pk) for record in product_universal_types(product)]
            if not types:
                from apps.devices.models import DeviceType
                types = [str(dt.pk) for dt in DeviceType.objects.filter(
                    code__in=('phone', 'tablet', 'smartwatch'), status='active', is_active=True)]
            if not types:
                raise ValidationError('Universal requires an explicit approved Device Type scope.')
            tokens.extend(str(value) for value in types)
        return '; '.join(tokens)
