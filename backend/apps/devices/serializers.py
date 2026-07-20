"""
Device Catalog — Serializers
"""
from rest_framework import serializers
from .models import (
    Device, DeviceType, Manufacturer,
    FeatureGroup, FeatureValue, DeviceFeatureAssignment, DeviceCapabilityEvidence,
    CompatibilityMarker, DataQualityException, SuggestedNormalization,
    BuyerDevicePortfolioReference, BuyerDevicePortfolioSnapshot, BuyerDevicePortfolioChangeRecord,
)


class DeviceTypeSerializer(serializers.ModelSerializer):
    code = serializers.SlugField(required=False)

    class Meta:
        model = DeviceType
        fields = [
            "id", "name", "code", "description", "is_active", "created_at",
            "status", "auto_mapping_eligible", "supported_accessory_categories", "compatibility_rules"
        ]
        read_only_fields = ["id", "created_at"]

    def validate(self, data):
        name = data.get("name", self.instance.name if self.instance else "")
        if name:
            name_stripped = name.strip()
            name_lower = name_stripped.lower()
            if name_lower not in ["phone", "tablet", "smartwatch", "laptop", "smartphone"]:
                raise serializers.ValidationError({"name": "Device Type must be Phone, Tablet, Smartwatch or Laptop."})
            if name_lower == "smartphone":
                data["name"] = "Phone"
            else:
                data["name"] = name_stripped.title()
            if not data.get("code") and (not self.instance or not self.instance.code):
                from django.utils.text import slugify
                data["code"] = slugify(name_stripped)

        # Enforce compatibility rules
        compatibility_rules = data.get("compatibility_rules", self.instance.compatibility_rules if self.instance else {})
        if name and not compatibility_rules:
            # Auto-configure default compatibility rules using backend keys
            name_lower = name.strip().lower()
            if name_lower == "phone":
                compatibility_rules = {
                    "charging_interface": {"mode": "required"},
                    "storage_expansion_type": {"mode": "required"},
                    "max_supported_storage": {"mode": "conditional", "condition_field": "storage_expansion_type", "condition_values": ["microSDXC", "microSDHC"]},
                    "headphone_jack_type": {"mode": "required"},
                    "bluetooth_supported": {"mode": "required", "default_value": "Yes"},
                    "wireless_charging_type": {"mode": "required"}
                }
            elif name_lower == "tablet":
                compatibility_rules = {
                    "charging_interface": {"mode": "required"},
                    "storage_expansion_type": {"mode": "required"},
                    "max_supported_storage": {"mode": "conditional", "condition_field": "storage_expansion_type", "condition_values": ["microSDXC", "microSDHC"]},
                    "headphone_jack_type": {"mode": "required"},
                    "bluetooth_supported": {"mode": "required", "default_value": "Yes"}
                }
            elif name_lower == "smartwatch":
                compatibility_rules = {
                    "bluetooth_supported": {"mode": "required", "default_value": "Yes"},
                    "wireless_charging_type": {"mode": "required"},
                    "watch_case_size": {"mode": "required"}
                }
            elif name_lower == "laptop":
                compatibility_rules = {
                    "charging_interface": {"mode": "required"},
                    "headphone_jack_type": {"mode": "required"},
                    "bluetooth_supported": {"mode": "required", "default_value": "Yes"}
                }
            data["compatibility_rules"] = compatibility_rules

        # Set status to active if rules are present
        if compatibility_rules and (not self.instance or self.instance.status == "setup_required"):
            cats = data.get("supported_accessory_categories", self.instance.supported_accessory_categories if self.instance else [])
            if not cats:
                from apps.catalog.models import DynamicDropdownConfig
                cats = list(DynamicDropdownConfig.objects.filter(field_name="product_category", status="active").values_list("value", flat=True))
                if not cats:
                    cats = ["Phone Cases", "Chargers & Cables", "Screen Protectors", "Watch Bands", "Audio Accessories", "Mounts & Stands", "Power Banks"]
                data["supported_accessory_categories"] = cats
            data["status"] = "active"

        status = data.get("status", self.instance.status if self.instance else "setup_required")
        if status == "active":
            if not compatibility_rules:
                raise serializers.ValidationError({"compatibility_rules": "Compatibility rules must be configured before a Device Type can be active."})
            
            # Active Device Type must define eligible Product Categories
            cats = data.get("supported_accessory_categories", self.instance.supported_accessory_categories if self.instance else [])
            if not cats:
                from apps.catalog.models import DynamicDropdownConfig
                cats = list(DynamicDropdownConfig.objects.filter(field_name="product_category", status="active").values_list("value", flat=True))
                if not cats:
                    cats = ["Phone Cases", "Chargers & Cables", "Screen Protectors", "Watch Bands", "Audio Accessories", "Mounts & Stands", "Power Banks"]
                data["supported_accessory_categories"] = cats

            valid_fields = [
                "compatible_charging_interface", "charging_interface",
                "storage_expansion_compatibility", "storage_expansion_type",
                "maximum_supported_storage", "max_supported_storage",
                "headphone_jack_compatibility", "headphone_jack_type",
                "bluetooth_compatibility", "bluetooth_supported",
                "wireless_charging_compatibility", "wireless_charging_type",
                "compatible_watch_case_size", "watch_case_size"
            ]
            valid_modes = ["required", "optional", "hidden", "defaulted", "conditional"]
            for field, rule in compatibility_rules.items():
                if field not in valid_fields:
                    raise serializers.ValidationError({"compatibility_rules": f"Invalid compatibility field: '{field}'"})
                if not isinstance(rule, dict) or "mode" not in rule:
                    raise serializers.ValidationError({"compatibility_rules": f"Rule for '{field}' must specify a 'mode'."})
                if rule["mode"] not in valid_modes:
                    raise serializers.ValidationError({"compatibility_rules": f"Invalid mode '{rule['mode']}' for field '{field}'."})
        return data


class ManufacturerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Manufacturer
        fields = ["id", "name", "company_reference", "is_active", "created_at"]
        read_only_fields = ["id", "created_at"]


class DeviceListSerializer(serializers.ModelSerializer):
    """Compact serializer for list views."""
    manufacturer_name = serializers.CharField(source="manufacturer.name", read_only=True)
    device_type_name = serializers.CharField(source="device_type.name", read_only=True)
    launch_date = serializers.CharField(required=False, allow_null=True, allow_blank=True)

    class Meta:
        model = Device
        fields = "__all__"
        read_only_fields = ["id", "created_at"]


class DeviceDetailSerializer(serializers.ModelSerializer):
    manufacturer_name = serializers.CharField(source="manufacturer.name", read_only=True)
    device_type_name = serializers.CharField(source="device_type.name", read_only=True)
    launch_date = serializers.CharField(required=False, allow_null=True, allow_blank=True)

    class Meta:
        model = Device
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_launch_date(self, value):
        if not value or str(value).strip() == "":
            return None
        from datetime import datetime, date
        if isinstance(value, date):
            return value
        if isinstance(value, str):
            try:
                return datetime.strptime(value.strip(), "%m/%d/%Y").date()
            except ValueError:
                try:
                    return datetime.strptime(value.strip(), "%Y-%m-%d").date()
                except ValueError:
                    raise serializers.ValidationError("Launch Date must be in MM/DD/YYYY format.")
        return value

    def validate(self, attrs):
        # 1. Clean and validate Manufacturer and Device Name
        manufacturer = attrs.get('manufacturer') or (self.instance.manufacturer if self.instance else None)
        name = attrs.get('name') or (self.instance.name if self.instance else None)
        
        if not name or str(name).strip() == "":
            raise serializers.ValidationError({"name": "Device Name is required."})
            
        if not manufacturer:
            raise serializers.ValidationError({"manufacturer": "Device Manufacturer is required."})

        m_name = manufacturer.name.strip().lower()
        d_name = str(name).strip()
        if d_name.lower().startswith(m_name):
            d_name = d_name[len(m_name):].strip().lstrip(" -/\\")
            
        if not d_name or d_name == "":
            raise serializers.ValidationError({"name": "Device Name is required."})
            
        d_name_lower = d_name.lower().strip()
        if any(char in d_name for char in [",", "+", ";"]):
            raise serializers.ValidationError({"name": "Device Name cannot contain special characters/delimiters like ',', '+', or ';'."})
        if d_name_lower in [
            "lightning", "magsafe", "qi", "qi2", "type-c", "microsd",
            "microsdhc", "microsdxc", "40mm", "41mm", "42mm", "44mm",
            "45mm", "46mm", "49mm"
        ]:
            raise serializers.ValidationError({"name": "Device Name cannot be a generic compatibility feature name."})

        attrs['name'] = d_name
        name = d_name

        # Check unique constraint (Device Manufacturer + Device Name must be unique)
        from .models import Device
        qs = Device.objects.filter(manufacturer=manufacturer, name__iexact=name)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError({"name": "The Device Already Exists"})

        # 2. Check Device Type
        device_type = attrs.get('device_type') or (self.instance.device_type if self.instance else None)
        if not device_type:
            raise serializers.ValidationError({"device_type": "Device Type is required."})
            
        # Validate Device Type Status
        if not self.instance:
            request = self.context.get('request')
            is_admin = request and request.user and getattr(request.user, 'is_cixci_admin', False)
            if device_type.status == 'setup_required':
                if not is_admin:
                    raise serializers.ValidationError({"device_type": f"Device Type '{device_type.name}' is in Setup Required status and only CIXCI Admins can create devices with it."})
            elif device_type.status != 'active':
                raise serializers.ValidationError({"device_type": f"Device Type '{device_type.name}' is not Active."})

        # 3. Dynamic Compatibility Rules
        rules = device_type.compatibility_rules or {}
        
        # We have 7 compatibility fields. Let's map model fields to backend keys and vice versa:
        FIELD_MAP = {
            "compatible_charging_interface": "charging_interface",
            "storage_expansion_compatibility": "storage_expansion_type",
            "maximum_supported_storage": "max_supported_storage",
            "headphone_jack_compatibility": "headphone_jack_type",
            "bluetooth_compatibility": "bluetooth_supported",
            "wireless_charging_compatibility": "wireless_charging_type",
            "compatible_watch_case_size": "watch_case_size"
        }
        
        # Resolve the rule mode and details for each model field:
        # Note: rules may be keyed by model field OR by backend key.
        def get_rule_for_field(model_field):
            b_key = FIELD_MAP[model_field]
            if model_field in rules:
                return rules[model_field]
            if b_key in rules:
                return rules[b_key]
            return None

        # Clean/normalize all fields first
        cleaned_vals = {}
        for f in FIELD_MAP.keys():
            val = attrs.get(f)
            if val is None:
                if self.instance and hasattr(self.instance, f):
                    val = getattr(self.instance, f)
                else:
                    val = ""
            cleaned_vals[f] = str(val).strip()

        # Helper to check if a value is "empty"
        def is_empty(val, field_name):
            val_str = str(val).strip().lower()
            return not val or val_str in ["", "select", "select...", "select options", "select option"]

        # Apply rules for each field
        for f, b_key in FIELD_MAP.items():
            rule = get_rule_for_field(f)
            mode = rule.get("mode", "optional") if rule else "optional"
            
            # 1. Hidden mode
            if mode == "hidden":
                attrs[f] = "No" if f == "bluetooth_compatibility" else "Not Compatible"
                cleaned_vals[f] = attrs[f]
                continue
                
            # 2. Defaulted mode
            if mode == "defaulted":
                if is_empty(cleaned_vals[f], f):
                    default_val = rule.get("default_value")
                    if not default_val:
                        default_val = "Yes" if f == "bluetooth_compatibility" else "Not Compatible"
                    attrs[f] = default_val
                    cleaned_vals[f] = default_val

            # 3. Required mode
            if mode == "required":
                if is_empty(cleaned_vals[f], f):
                    raise serializers.ValidationError({f: f"{f.replace('_', ' ').title().replace('Compatibility', '').strip()} is required."})

            # 4. Conditional mode
            if mode == "conditional":
                cond_field = rule.get("condition_field")
                cond_values = rule.get("condition_values", [])
                # The condition field in rules could be a model field or a backend key
                cond_model_field = cond_field
                if cond_field in FIELD_MAP.values():
                    # Map backend key to model field
                    for k, v in FIELD_MAP.items():
                        if v == cond_field:
                            cond_model_field = k
                            break
                            
                # Get the value of the condition field
                cond_val = cleaned_vals.get(cond_model_field, "")
                # Normalize condition values and value for comparison
                cond_val_norm = cond_val.lower()
                cond_values_norm = [cv.lower() for cv in cond_values]
                
                if cond_val_norm in cond_values_norm:
                    # Required!
                    if is_empty(cleaned_vals[f], f):
                        raise serializers.ValidationError({f: f"{f.replace('_', ' ').title().replace('Compatibility', '').strip()} is required."})
                else:
                    # Not required; if empty, we can default to Not Compatible
                    if is_empty(cleaned_vals[f], f):
                        attrs[f] = "No" if f == "bluetooth_compatibility" else "Not Compatible"
                        cleaned_vals[f] = attrs[f]

        # 4. Validate value lists for each field
        for f, val in cleaned_vals.items():
            # If field is hidden, it has already been forced above.
            rule = get_rule_for_field(f)
            mode = rule.get("mode", "optional") if rule else "optional"
            if mode == "hidden":
                continue

            if f == "bluetooth_compatibility":
                if val.lower() == "yes" or not val:
                    attrs[f] = "Yes"
                elif val.lower() == "no":
                    attrs[f] = "No"
                else:
                    raise serializers.ValidationError({f: "Bluetooth Compatibility must be Yes or No."})
                    
            elif f == "compatible_charging_interface":
                vl = val.lower()
                if vl == "type-c":
                    attrs[f] = "Type-C"
                elif vl == "lightning":
                    attrs[f] = "Lightning"
                elif vl == "not compatible" or not val:
                    attrs[f] = "Not Compatible"
                else:
                    raise serializers.ValidationError({f: "Compatible Charging Interface must be Type-C, Lightning, or Not Compatible."})
                    
            elif f == "headphone_jack_compatibility":
                vl = val.lower()
                if vl == "type-c":
                    attrs[f] = "Type-C"
                elif vl == "lightning":
                    attrs[f] = "Lightning"
                elif vl == "not compatible" or not val:
                    attrs[f] = "Not Compatible"
                else:
                    raise serializers.ValidationError({f: "Headphone Jack Compatibility must be Type-C, Lightning, or Not Compatible."})
                    
            elif f == "storage_expansion_compatibility":
                vl = val.lower()
                if vl == "microsdxc":
                    attrs[f] = "microSDXC"
                elif vl == "microsdhc":
                    attrs[f] = "microSDHC"
                elif vl == "not compatible" or not val:
                    attrs[f] = "Not Compatible"
                else:
                    raise serializers.ValidationError({f: "Storage Expansion Compatibility must be microSDXC, microSDHC, or Not Compatible."})
                    
            elif f == "maximum_supported_storage":
                se_val = attrs.get("storage_expansion_compatibility", "Not Compatible")
                if se_val in ["microSDXC", "microSDHC"]:
                    vu = val.upper()
                    if se_val == "microSDXC":
                        allowed = ['32GB', '64GB', '128GB', '256GB', '512GB', '1TB', '2TB']
                    else:
                        allowed = ['16GB', '32GB', '64GB', '128GB', '256GB', '512GB', '1TB', '1.5TB']
                    if vu not in allowed:
                        raise serializers.ValidationError({f: f"Maximum Supported Storage must match the allowed list ({', '.join(allowed)}) for {se_val}."})
                    attrs[f] = vu
                else:
                    attrs[f] = "Not Compatible"
                    
            elif f == "compatible_watch_case_size":
                vl = val.lower()
                allowed_wcs = ["not compatible", "40mm", "41mm", "42mm", "44mm", "45mm", "46mm", "49mm"]
                if not val or vl == "" or vl == "not compatible":
                    attrs[f] = "Not Compatible"
                elif vl not in allowed_wcs:
                    raise serializers.ValidationError({f: "Compatible Watch Case Size must be 40mm, 41mm, 42mm, 44mm, 45mm, 46mm, 49mm, or Not Compatible."})
                else:
                    attrs[f] = vl
                    
            elif f == "wireless_charging_compatibility":
                if not val or val.lower() == "not compatible":
                    attrs[f] = "Not Compatible"
                else:
                    import re
                    parts = [p.strip() for p in re.split(r'[\+,;]', val) if p.strip()]
                    normalized = []
                    for p in parts:
                        pl = p.lower()
                        if pl == "magsafe":
                            normalized.append("MagSafe")
                        elif pl == "qi":
                            normalized.append("Qi")
                        elif pl == "qi2":
                            normalized.append("Qi2")
                        elif pl == "not compatible":
                            normalized.append("Not Compatible")
                        else:
                            raise serializers.ValidationError({f: f"Invalid Wireless Charging value '{p}'."})
                            
                    if "Not Compatible" in normalized and len(normalized) > 1:
                        raise serializers.ValidationError({f: "Not Compatible cannot be selected with any other value."})
                    if "Qi" in normalized and ("MagSafe" in normalized or "Qi2" in normalized):
                        raise serializers.ValidationError({f: "Qi cannot be selected with MagSafe or Qi2."})
                        
                    attrs[f] = "+".join(normalized)
                    
        return attrs

    def create(self, validated_data):
        actor_id = validated_data.pop("actor_id", None)
        if actor_id:
            validated_data["imported_by"] = actor_id
        return super().create(validated_data)

    def update(self, instance, validated_data):
        actor_id = validated_data.pop("actor_id", None)
        if actor_id:
            validated_data["imported_by"] = actor_id
        return super().update(instance, validated_data)

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        if instance.launch_date:
            ret['launch_date'] = instance.launch_date.strftime("%m/%d/%Y")
        return ret


class FeatureGroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = FeatureGroup
        fields = [
            "id", "device_type", "name", "code", "description",
            "lifecycle", "is_required_for_compatibility", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class FeatureValueSerializer(serializers.ModelSerializer):
    class Meta:
        model = FeatureValue
        fields = ["id", "feature_group", "value", "code", "lifecycle", "created_at"]
        read_only_fields = ["id", "created_at"]


class DeviceFeatureAssignmentSerializer(serializers.ModelSerializer):
    feature_group_code = serializers.CharField(source="feature_group.code", read_only=True)
    feature_value_code = serializers.CharField(source="feature_value.code", read_only=True)
    feature_value_label = serializers.CharField(source="feature_value.value", read_only=True)

    class Meta:
        model = DeviceFeatureAssignment
        fields = [
            "id", "device", "feature_group", "feature_group_code",
            "feature_value", "feature_value_code", "feature_value_label",
            "is_active", "is_override", "override_reason", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class DeviceCapabilityEvidenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeviceCapabilityEvidence
        fields = [
            "id", "device", "feature_snapshot",
            "profile_compliance", "non_compliant_groups", "generated_at",
        ]
        read_only_fields = ["id", "generated_at"]


class CompatibilityMarkerSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompatibilityMarker
        fields = [
            "id", "device", "raw_attribute", "raw_value",
            "normalized_feature_group", "normalized_feature_value",
            "normalization_status", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class DataQualityExceptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = DataQualityException
        fields = [
            "id", "device", "exception_type", "description",
            "status", "resolution_note", "created_at", "resolved_at",
        ]
        read_only_fields = ["id", "created_at"]


class BuyerPortfolioReferenceSerializer(serializers.ModelSerializer):
    device_name = serializers.CharField(source="device.name", read_only=True)
    device_manufacturer = serializers.CharField(source="device.manufacturer.name", read_only=True)
    device_manufacturer_id = serializers.UUIDField(source="device.manufacturer.id", read_only=True)
    device_type = serializers.CharField(source="device.device_type.name", read_only=True)
    device_type_id = serializers.UUIDField(source="device.device_type.id", read_only=True)
    device_sku = serializers.CharField(source="device.sku", read_only=True)
    device_model_number = serializers.CharField(source="device.model_number", read_only=True)
    device_status = serializers.CharField(source="device.lifecycle_status", read_only=True)
    device_launch_date = serializers.DateField(source="device.launch_date", read_only=True)
    has_accessories = serializers.SerializerMethodField()

    def get_has_accessories(self, obj):
        from apps.catalog.models import ProductCompatibilityAssertion
        return ProductCompatibilityAssertion.objects.filter(
            device_reference=obj.device.id,
            is_compatible=True,
            is_excluded=False
        ).exists()

    class Meta:
        model = BuyerDevicePortfolioReference
        fields = [
            "id", "device", "device_name", "device_manufacturer",
            "device_manufacturer_id", "device_type", "device_type_id",
            "device_sku", "device_model_number", "device_status", "device_launch_date",
            "has_accessories",
            "active_flag", "change_source", "last_change_timestamp",
            "current_portfolio_snapshot_reference", "created_at",
        ]
        read_only_fields = [
            "id", "buyer_reference", "company_scope_reference", "buyer_entity_reference",
            "last_change_timestamp", "current_portfolio_snapshot_reference", "created_at",
        ]


class BuyerPortfolioSnapshotSerializer(serializers.ModelSerializer):
    class Meta:
        model = BuyerDevicePortfolioSnapshot
        fields = [
            "id", "device_ids", "device_count",
            "snapshot_reason", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class BuyerPortfolioChangeRecordSerializer(serializers.ModelSerializer):
    device_name = serializers.CharField(source="device.name", read_only=True)

    class Meta:
        model = BuyerDevicePortfolioChangeRecord
        fields = [
            "id", "device", "device_name", "change_type", "change_source",
            "actor_is_admin_on_behalf", "resulting_snapshot", "created_at",
        ]
        read_only_fields = ["id", "created_at"]
