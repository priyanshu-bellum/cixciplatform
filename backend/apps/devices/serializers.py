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
    class Meta:
        model = DeviceType
        fields = [
            "id", "name", "code", "description", "is_active", "created_at",
            "status", "auto_mapping_eligible", "supported_accessory_categories", "compatibility_rules"
        ]
        read_only_fields = ["id", "created_at"]

    def validate(self, data):
        status = data.get("status", self.instance.status if self.instance else "setup_required")
        compatibility_rules = data.get("compatibility_rules", self.instance.compatibility_rules if self.instance else {})
        
        name = data.get("name", self.instance.name if self.instance else "")
        if name and not data.get("code"):
            from django.utils.text import slugify
            data["code"] = slugify(name)

        if status == "active":
            if not compatibility_rules:
                raise serializers.ValidationError({"compatibility_rules": "Compatibility rules must be configured before a Device Type can be active."})
            
            valid_fields = [
                "compatible_charging_interface",
                "storage_expansion_compatibility",
                "maximum_supported_storage",
                "headphone_jack_compatibility",
                "bluetooth_compatibility",
                "wireless_charging_compatibility",
                "compatible_watch_case_size"
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

    class Meta:
        model = Device
        fields = [
            "id", "name", "sku", "model_number",
            "manufacturer", "manufacturer_name",
            "device_type", "device_type_name",
            "lifecycle_status", "release_date", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class DeviceDetailSerializer(serializers.ModelSerializer):
    manufacturer_name = serializers.CharField(source="manufacturer.name", read_only=True)
    device_type_name = serializers.CharField(source="device_type.name", read_only=True)
    launch_date = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    class Meta:
        model = Device
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_launch_date(self, value):
        if not value:
            return None
        from datetime import datetime
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
        manufacturer = attrs.get('manufacturer') or (self.instance.manufacturer if self.instance else None)
        name = attrs.get('name') or (self.instance.name if self.instance else None)
        if name and manufacturer:
            m_name = manufacturer.name.strip().lower()
            d_name = name.strip()
            if d_name.lower().startswith(m_name):
                d_name = d_name[len(m_name):].strip().lstrip(" -/\\")
            attrs['name'] = d_name
            name = d_name

            # Check unique constraint
            from .models import Device
            qs = Device.objects.filter(manufacturer=manufacturer, name__iexact=name)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError({"name": "Device Manufacturer + Device Name must be unique."})

        # Next check Device Type and validate compatibility fields based on type
        device_type = attrs.get('device_type') or (self.instance.device_type if self.instance else None)
        if not device_type:
            return attrs

        # Device Type Status validation
        if device_type.status != 'active':
            raise serializers.ValidationError({"device_type": f"Device Type '{device_type.name}' is '{device_type.status}' and cannot be used to manage devices."})

        rules = device_type.compatibility_rules or {}

        # 1. Determine active/required/conditional status for each compatibility field
        compat_fields = [
            "compatible_charging_interface",
            "storage_expansion_compatibility",
            "maximum_supported_storage",
            "headphone_jack_compatibility",
            "bluetooth_compatibility",
            "wireless_charging_compatibility",
            "compatible_watch_case_size"
        ]

        def get_default_value(f, r):
            if r and "default_value" in r:
                return r["default_value"]
            if f == "bluetooth_compatibility":
                return "Yes"
            return "Not Compatible"

        # Initialize defaults or values
        for f in compat_fields:
            val = attrs.get(f)
            # If value is missing/blank, check rule
            rule = rules.get(f)
            mode = rule.get("mode", "hidden") if rule else "hidden"
            
            if val is None or (isinstance(val, str) and val.strip() == ""):
                # If editing, fallback to current instance value
                if self.instance and hasattr(self.instance, f):
                    attrs[f] = getattr(self.instance, f)
                else:
                    attrs[f] = get_default_value(f, rule)

        # 2. Run validations based on field rule mode
        for f in compat_fields:
            val = attrs.get(f)
            rule = rules.get(f)
            mode = rule.get("mode", "hidden") if rule else "hidden"
            
            # Check conditional requirement
            if mode == "conditional":
                cond_field = rule.get("condition_field")
                cond_values = rule.get("condition_values", [])
                cond_val = attrs.get(cond_field)
                if cond_field and cond_val in cond_values:
                    # Field becomes required!
                    if not val or val.strip() == "" or val == "Not Compatible":
                        raise serializers.ValidationError({f: f"{f.replace('_', ' ').title()} is required when {cond_field.replace('_', ' ').title()} is {cond_val}."})
            
            elif mode == "required":
                if not val or val.strip() == "":
                    raise serializers.ValidationError({f: f"{f.replace('_', ' ').title()} is required."})

            elif mode == "hidden":
                # Force to default/Not Compatible
                attrs[f] = get_default_value(f, rule)

            # 3. Controlled value set validations
            val = attrs.get(f)
            if val:
                val = val.strip()
                attrs[f] = val

            if f == "compatible_charging_interface" or f == "headphone_jack_compatibility":
                if val not in ["Not Compatible", "Type-C", "Lightning"]:
                    raise serializers.ValidationError({f: f"Invalid value for {f.replace('_', ' ').title()}."})

            elif f == "bluetooth_compatibility":
                if val not in ["Yes", "No"]:
                    raise serializers.ValidationError({f: f"Invalid value for {f.replace('_', ' ').title()}."})

            elif f == "wireless_charging_compatibility":
                w_vals = [w.strip() for w in val.split('+') if w.strip()]
                if not w_vals:
                    raise serializers.ValidationError({f: "Wireless Charging Compatibility is required."})
                if 'Not Compatible' in w_vals and len(w_vals) > 1:
                    raise serializers.ValidationError({f: "Not Compatible cannot be selected with any other value."})
                for w in w_vals:
                    if w not in ['Not Compatible', 'MagSafe', 'Qi', 'Qi2']:
                        raise serializers.ValidationError({f: f"Invalid Wireless Charging value '{w}'."})
                if 'Qi' in w_vals and ('MagSafe' in w_vals or 'Qi2' in w_vals):
                    raise serializers.ValidationError({f: "Qi cannot be selected with MagSafe or Qi2."})

            elif f == "storage_expansion_compatibility":
                if val not in ["Not Compatible", "microSDXC", "microSDHC"]:
                    raise serializers.ValidationError({f: f"Invalid value for {f.replace('_', ' ').title()}."})

            elif f == "maximum_supported_storage":
                storage = attrs.get("storage_expansion_compatibility")
                if storage in ["microSDXC", "microSDHC"]:
                    if storage == "microSDXC":
                        allowed = ['32GB', '64GB', '128GB', '256GB', '512GB', '1TB', '2TB']
                    else:
                        allowed = ['16GB', '32GB', '64GB', '128GB', '256GB', '512GB', '1TB', '1.5TB']
                    if val not in allowed:
                        raise serializers.ValidationError({f: f"Maximum Supported Storage must match the allowed list for the selected storage type."})
                else:
                    attrs[f] = "Not Compatible"

            elif f == "compatible_watch_case_size":
                if val not in ["Not Compatible", "40mm", "41mm", "42mm", "44mm", "45mm", "46mm", "49mm"]:
                    raise serializers.ValidationError({f: f"Invalid value for {f.replace('_', ' ').title()}."})

        return attrs

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

    class Meta:
        model = BuyerDevicePortfolioReference
        fields = [
            "id", "device", "device_name", "device_manufacturer",
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
