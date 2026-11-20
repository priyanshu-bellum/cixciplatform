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
                if manufacturer:
                    candidates = [device for device in candidates if normalized_name(device.manufacturer.name) == normalized_name(manufacturer)]
                    if not candidates:
                        raise ValidationError('Declared device manufacturer does not resolve to a canonical device.')
                if len(candidates) > 1:
                    raise ValidationError('Ambiguous device name; configure its canonical Device ID.')
                if candidates:
                    token = str(candidates[0].pk)
            tokens.append(token)
        if len(tokens) == 1 and normalized_name(tokens[0]) == 'universal':
            types = self.config.get('universal_type_map', {}).get(category, [])
            if not types and product is not None:
                types = [str(record.pk) for record in product_universal_types(product)]
            if not types:
                raise ValidationError('Universal requires an explicit approved Device Type scope in connection configuration or the product.')
            tokens.extend(str(value) for value in types)
        return '; '.join(tokens)
