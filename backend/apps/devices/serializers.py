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
            if name_lower == "smartphone":
                data["name"] = "Phone"
            else:
                data["name"] = name_stripped
            if not data.get("code") and (not self.instance or not self.instance.code):
                from django.utils.text import slugify
                data["code"] = slugify(data["name"])
            if self.instance and data.get("code", self.instance.code) != self.instance.code:
                raise serializers.ValidationError({"code": "The canonical type code is stable; edit the display label instead."})
            if not self.instance and data.get("code") == "smartphone":
                data["code"] = "phone"
            duplicates = DeviceType.objects.filter(code=data.get("code", self.instance.code if self.instance else ""))
            if self.instance:
                duplicates = duplicates.exclude(pk=self.instance.pk)
            if duplicates.exists():
                raise serializers.ValidationError({"code": "This canonical Device Type code already exists."})
            from apps.catalog.compatibility_contract import CURRENT_DEVICE_TYPE_CODES
            code = data.get("code", self.instance.code if self.instance else "")
            if code not in CURRENT_DEVICE_TYPE_CODES and (self.instance is None or data.get("status", self.instance.status) == "active"):
                raise serializers.ValidationError({"code": "Current eligible types are Phone, Tablet and Smartwatch. Preserve other historical types as inactive."})

        from apps.catalog.compatibility_contract import normalized_rules, COMPATIBILITY_FIELDS, ENTRY_MODES, canonical_field
        from apps.catalog.compatibility_values import normalized_value, normalized_wireless
        from django.core.exceptions import ValidationError as DjangoValidationError
        try:
            rules = normalized_rules(data.get("compatibility_rules", self.instance.compatibility_rules if self.instance else {}) or {})
            for field, rule in rules.items():
                if field not in COMPATIBILITY_FIELDS or not isinstance(rule, dict) or rule.get("mode") not in ENTRY_MODES:
                    raise serializers.ValidationError({"compatibility_rules": f"Configure a valid field and data-entry mode for {field}."})
                if rule["mode"] == "defaulted":
                    value = rule.get("default_value", rule.get("default", ""))
                    if not value:
                        raise serializers.ValidationError({"compatibility_rules": f"Set an approved default for {field}."})
                    rule["default_value"] = normalized_wireless(value) if field == "wireless_charging_compatibility" else normalized_value(field, value)
                if rule["mode"] == "conditional":
                    parent = canonical_field(rule.get("condition_field"))
                    if parent not in rules or parent == field or not isinstance(rule.get("condition_values"), list) or not rule["condition_values"]:
                        raise serializers.ValidationError({"compatibility_rules": f"Configure an applicable condition for {field}."})
                    rule["condition_field"] = parent
                    rule["condition_values"] = [normalized_wireless(value) if parent == "wireless_charging_compatibility" else normalized_value(parent, value) for value in rule["condition_values"]]
            if data.get("status", self.instance.status if self.instance else "setup_required") == "active" and not rules:
                raise serializers.ValidationError({"compatibility_rules": "Configure applicable fields before activating a Device Type."})
            if "compatibility_rules" in data:
                data["compatibility_rules"] = {("maximum_supported_storage" if field == "memory_capacity" else field): rule for field, rule in rules.items()}
        except DjangoValidationError as error:
            raise serializers.ValidationError(error.message_dict) from error
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

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        wc = ret.get("wireless_charging_compatibility")
        if wc:
            import re
            parts = [p.strip() for p in re.split(r'[\+,;]', wc) if p.strip()]
            case_map = {"magsafe": "MagSafe", "qi": "Qi", "qi2": "Qi2", "not compatible": "Not Compatible"}
            norm = [case_map.get(p.lower(), p) for p in parts]
            if norm:
                ret["wireless_charging_compatibility"] = "+".join(norm)
        return ret


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
        if any(char in d_name for char in [",", ";"]):
            raise serializers.ValidationError({"name": "Device Name cannot contain special characters/delimiters like ',' or ';'."})
        if d_name_lower in [
            "lightning", "magsafe", "qi", "qi2", "type-c", "microsd",
            "microsdhc", "microsdxc", "40mm", "41mm", "42mm", "44mm",
            "45mm", "46mm", "49mm"
        ]:
            raise serializers.ValidationError({"name": "Device Name cannot be a generic compatibility feature name."})

        if len(d_name) > 150:
            raise serializers.ValidationError({"name": "Device name cannot exceed 150 characters."})

        # Sanitize HTML/script tags (BUG-DEV-005)
        import re
        if re.search(r'<script.*?>.*?</script>', d_name, flags=re.IGNORECASE | re.DOTALL):
            d_name = re.sub(r'<script.*?>.*?</script>', '', d_name, flags=re.IGNORECASE | re.DOTALL)
        from django.utils.html import escape
        d_name = escape(d_name)

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

        from django.core.exceptions import ValidationError as CompatibilityValidationError
        from apps.catalog.compatibility_contract import CURRENT_DEVICE_TYPE_CODES
        from apps.catalog.compatibility_values import validate_compatibility_values
        if device_type.code not in CURRENT_DEVICE_TYPE_CODES:
            raise serializers.ValidationError({'device_type': 'Select Phone, Tablet or Smartwatch for current device entry.'})
        try:
            validate_compatibility_values(attrs, instance=self.instance, rules=device_type.compatibility_rules, device_type=device_type)
        except CompatibilityValidationError as error:
            raise serializers.ValidationError(error.message_dict) from error

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
        wc = ret.get("wireless_charging_compatibility")
        if wc:
            import re
            parts = [p.strip() for p in re.split(r'[\+,;]', wc) if p.strip()]
            case_map = {"magsafe": "MagSafe", "qi": "Qi", "qi2": "Qi2", "not compatible": "Not Compatible"}
            norm = [case_map.get(p.lower(), p) for p in parts]
            if norm:
                ret["wireless_charging_compatibility"] = "+".join(norm)
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
