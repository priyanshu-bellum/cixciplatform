"""Provider-neutral translation of declared device references, never inferred scope.

Connection JSON owns provider paths/aliases. Canonical catalog commands continue
to own permission, category eligibility, exclusions, history and matching rules.
"""
import re
import uuid
from html import unescape

from django.core.exceptions import ValidationError

from apps.devices.models import Device
from apps.catalog.compatibility_contract import product_universal_types
from .catalog_config import path_value


def normalized_name(value):
    return ' '.join(unescape(str(value or '')).split()).casefold()


class CatalogDeviceResolver:
    """Resolve a bounded feed page against one reusable canonical-device index."""

    def __init__(self, config, vendor_company_id=None):
        self.config = config.get('compatibility', {})
        self.vendor_company_id = vendor_company_id
        self._devices = None
        self._vendor_names = None
        self._feature_values = None
        # Names the last declaration() call could not find in the Device Catalog.
        self.missing = []

    def _index(self):
        if self._devices is None:
            self._devices = {}
            for device in Device.objects.select_related('manufacturer').iterator():
                for label in {device.name, str(device), device.model_number} - {''}:
                    self._devices.setdefault(normalized_name(label), {})[str(device.pk)] = device
        return self._devices

    def _is_feature_value(self, token):
        """An approved compatibility value such as Lightning or MagSafe is a feature
        declaration for the importer to judge, never a device name."""
        if self._feature_values is None:
            from apps.catalog.compatibility_values import NEGATIVE, value_catalog
            self._feature_values = {option['value'].casefold() for options in value_catalog()['fields'].values()
                for option in options} - {NEGATIVE.casefold(), 'yes', 'no'}
        return token.casefold() in self._feature_values

    def _fuzzy_lookup(self, name):
        index = self._index()
        n = normalized_name(name)
        for alt in self._name_variations(n):
            hits = index.get(alt)
            if hits:
                return list(hits.values())
        return []

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
        self.missing = []
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
            if tokens and normalized_name(tokens[0]) == 'universal':
                # "Universal, Phone": what follows is the declared type scope, not models.
                tokens.append(token)
                continue
            if normalized_name(token) == 'universal':
                # A scope declaration, not a model name: it must never be looked
                # up or auto-created as a device called "Universal".
                tokens.append(token)
                continue
            # An admin's decision about this vendor's wording wins over name matching.
            if self._vendor_names is None:
                from apps.catalog.missing_devices import vendor_names
                self._vendor_names = vendor_names(self.vendor_company_id)
            known_names, dismissed_names = self._vendor_names
            if normalized_name(token)[:255] in dismissed_names:
                continue
            if normalized_name(token)[:255] in known_names:
                tokens.append(known_names[normalized_name(token)[:255]])
                continue
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
                if len(candidates) > 1:
                    # Two catalog devices answer to this name: an admin links the
                    # right one in Missing Devices instead of the sync picking one.
                    self.missing.append(token)
                    continue
                if candidates:
                    token = str(candidates[0].pk)
                elif not manufacturer and self._is_feature_value(token):
                    tokens.append(token)
                    continue
                elif not manufacturer:
                    # Never invent a device (or its type) from a vendor's text.
                    # The known models are still mapped; this name goes to the
                    # Missing Devices panel for an admin to add with the right type.
                    self.missing.append(token)
                    continue
            tokens.append(token)
        if len(tokens) == 1 and normalized_name(tokens[0]) == 'universal':
            types = self.config.get('universal_type_map', {}).get(category, [])
            if not types and product is not None:
                types = [str(record.pk) for record in product_universal_types(product)]
            if not types:
                # A bare provider "Universal" keeps its original three-type meaning.
                # A type added later (e.g. Laptop) is never implied: it needs an
                # explicit universal_type_map entry or an admin's product scope.
                from apps.devices.models import DeviceType
                from apps.catalog.compatibility_contract import CORE_DEVICE_TYPE_CODES
                types = [str(dt.pk) for dt in DeviceType.objects.filter(
                    code__in=CORE_DEVICE_TYPE_CODES, status='active', is_active=True)]
            if not types:
                raise ValidationError('Universal requires an explicit approved Device Type scope.')
            tokens.extend(str(value) for value in types)
        return '; '.join(tokens)
