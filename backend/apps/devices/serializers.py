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
            # Auto-configure default compatibility rules
            name_lower = name.strip().lower()
            if name_lower == "phone":
                compatibility_rules = {
                    "compatible_charging_interface": {"mode": "required"},
                    "storage_expansion_compatibility": {"mode": "required"},
                    "maximum_supported_storage": {"mode": "conditional", "condition_field": "storage_expansion_compatibility", "condition_values": ["microSDXC", "microSDHC"]},
                    "headphone_jack_compatibility": {"mode": "required"},
                    "bluetooth_compatibility": {"mode": "required", "default_value": "Yes"},
                    "wireless_charging_compatibility": {"mode": "required"}
                }
            elif name_lower == "tablet":
                compatibility_rules = {
                    "compatible_charging_interface": {"mode": "required"},
                    "storage_expansion_compatibility": {"mode": "required"},
                    "maximum_supported_storage": {"mode": "conditional", "condition_field": "storage_expansion_compatibility", "condition_values": ["microSDXC", "microSDHC"]},
                    "headphone_jack_compatibility": {"mode": "required"},
                    "bluetooth_compatibility": {"mode": "required", "default_value": "Yes"}
                }
            elif name_lower == "smartwatch":
                compatibility_rules = {
                    "bluetooth_compatibility": {"mode": "required", "default_value": "Yes"},
                    "wireless_charging_compatibility": {"mode": "required"},
                    "compatible_watch_case_size": {"mode": "required"}
                }
            elif name_lower == "laptop":
                compatibility_rules = {
                    "compatible_charging_interface": {"mode": "required"},
                    "headphone_jack_compatibility": {"mode": "required"},
                    "bluetooth_compatibility": {"mode": "required", "default_value": "Yes"}
                }
            data["compatibility_rules"] = compatibility_rules

        # Set status to active if rules are present
        if compatibility_rules and (not self.instance or self.instance.status == "setup_required"):
            data["status"] = "active"

        status = data.get("status", self.instance.status if self.instance else "setup_required")
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
            
        attrs['name'] = d_name
        name = d_name

        # Check unique constraint (Device Manufacturer + Device Name must be unique)
        from .models import Device
        qs = Device.objects.filter(manufacturer=manufacturer, name__iexact=name)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError({"name": "Device Manufacturer + Device Name must be unique."})

        # 2. Check Device Type
        device_type = attrs.get('device_type') or (self.instance.device_type if self.instance else None)
        if not device_type:
            raise serializers.ValidationError({"device_type": "Device Type is required."})
            
        t_name = device_type.name.strip().lower()
        if t_name == "smartphone":
            t_name = "phone"
        if t_name not in ['phone', 'tablet', 'smartwatch', 'laptop']:
            raise serializers.ValidationError({"device_type": "Device Type must be Phone, Tablet, Smartwatch or Laptop."})
            
        if not self.instance:
            if not device_type.is_active or device_type.status != 'active':
                raise serializers.ValidationError({"device_type": f"Device Type '{device_type.name}' is inactive."})

        # 3. Clean and Validate Compatibility Fields by Device Type
        compat_fields = [
            "compatible_charging_interface",
            "storage_expansion_compatibility",
            "maximum_supported_storage",
            "headphone_jack_compatibility",
            "bluetooth_compatibility",
            "wireless_charging_compatibility",
            "compatible_watch_case_size"
        ]
        
        raw_vals = {}
        for f in compat_fields:
            raw_vals[f] = attrs.get(f)
            if raw_vals[f] is None:
                if self.instance and hasattr(self.instance, f):
                    raw_vals[f] = getattr(self.instance, f)
                else:
                    raw_vals[f] = ""
            raw_vals[f] = str(raw_vals[f]).strip()

        # Enforce defaults & requirements per type
        bt_val = raw_vals["bluetooth_compatibility"]
        if not bt_val or bt_val == "" or bt_val.lower() == "yes":
            bt_val = "Yes"
        elif bt_val.lower() == "no":
            bt_val = "No"
        else:
            raise serializers.ValidationError({"bluetooth_compatibility": "Bluetooth Compatibility must be Yes or No."})
        attrs["bluetooth_compatibility"] = bt_val

        if t_name == "phone":
            # charging
            chg = raw_vals["compatible_charging_interface"]
            if not chg or chg == "":
                raise serializers.ValidationError({"compatible_charging_interface": "Compatible Charging Interface is required."})
            chg_lower = chg.lower()
            if chg_lower == "type-c":
                chg = "Type-C"
            elif chg_lower == "lightning":
                chg = "Lightning"
            elif chg_lower == "not compatible":
                chg = "Not Compatible"
            else:
                raise serializers.ValidationError({"compatible_charging_interface": "Compatible Charging Interface must be Type-C, Lightning, or Not Compatible."})
            attrs["compatible_charging_interface"] = chg

            # storage expansion
            se = raw_vals["storage_expansion_compatibility"]
            if not se or se == "":
                raise serializers.ValidationError({"storage_expansion_compatibility": "Storage Expansion Compatibility is required."})
            se_lower = se.lower()
            if se_lower == "microsdxc":
                se = "microSDXC"
            elif se_lower == "microsdhc":
                se = "microSDHC"
            elif se_lower == "not compatible":
                se = "Not Compatible"
            else:
                raise serializers.ValidationError({"storage_expansion_compatibility": "Storage Expansion Compatibility must be microSDXC, microSDHC, or Not Compatible."})
            attrs["storage_expansion_compatibility"] = se

            # max storage
            ms = raw_vals["maximum_supported_storage"]
            if se in ["microSDXC", "microSDHC"]:
                if not ms or ms == "":
                    raise serializers.ValidationError({"maximum_supported_storage": "Maximum Supported Storage is required."})
                ms_upper = ms.upper()
                if se == "microSDXC":
                    allowed_ms = ['32GB', '64GB', '128GB', '256GB', '512GB', '1TB', '2TB']
                else:
                    allowed_ms = ['16GB', '32GB', '64GB', '128GB', '256GB', '512GB', '1TB', '1.5TB']
                if ms_upper not in allowed_ms:
                    raise serializers.ValidationError({"maximum_supported_storage": "Maximum Supported Storage must match the allowed list for the selected storage type."})
                attrs["maximum_supported_storage"] = ms_upper
            else:
                attrs["maximum_supported_storage"] = "Not Compatible"

            # headphone jack
            hj = raw_vals["headphone_jack_compatibility"]
            if not hj or hj == "":
                raise serializers.ValidationError({"headphone_jack_compatibility": "Headphone Jack Compatibility is required."})
            hj_lower = hj.lower()
            if hj_lower == "type-c":
                hj = "Type-C"
            elif hj_lower == "lightning":
                hj = "Lightning"
            elif hj_lower == "not compatible":
                hj = "Not Compatible"
            else:
                raise serializers.ValidationError({"headphone_jack_compatibility": "Headphone Jack Compatibility must be Type-C, Lightning, or Not Compatible."})
            attrs["headphone_jack_compatibility"] = hj

            # wireless charging
            wc = raw_vals["wireless_charging_compatibility"]
            if not wc or wc == "":
                raise serializers.ValidationError({"wireless_charging_compatibility": "Wireless Charging Compatibility is required."})
            wc_vals = [w.strip() for w in wc.split('+') if w.strip()]
            if not wc_vals:
                raise serializers.ValidationError({"wireless_charging_compatibility": "Wireless Charging Compatibility is required."})
            
            normalized_wc_vals = []
            for w in wc_vals:
                wl = w.lower()
                if wl == "magsafe":
                    normalized_wc_vals.append("MagSafe")
                elif wl == "qi":
                    normalized_wc_vals.append("Qi")
                elif wl == "qi2":
                    normalized_wc_vals.append("Qi2")
                elif wl == "not compatible":
                    normalized_wc_vals.append("Not Compatible")
                else:
                    raise serializers.ValidationError({"wireless_charging_compatibility": f"Invalid Wireless Charging value '{w}'."})
            
            if "Not Compatible" in normalized_wc_vals and len(normalized_wc_vals) > 1:
                raise serializers.ValidationError({"wireless_charging_compatibility": "Not Compatible cannot be selected with any other value."})
            if "Qi" in normalized_wc_vals and ("MagSafe" in normalized_wc_vals or "Qi2" in normalized_wc_vals):
                raise serializers.ValidationError({"wireless_charging_compatibility": "Qi cannot be selected with MagSafe or Qi2."})
            
            attrs["wireless_charging_compatibility"] = "+".join(normalized_wc_vals)
            attrs["compatible_watch_case_size"] = "Not Compatible"

        elif t_name == "tablet":
            # charging
            chg = raw_vals["compatible_charging_interface"]
            if not chg or chg == "":
                raise serializers.ValidationError({"compatible_charging_interface": "Compatible Charging Interface is required."})
            chg_lower = chg.lower()
            if chg_lower == "type-c":
                chg = "Type-C"
            elif chg_lower == "lightning":
                chg = "Lightning"
            elif chg_lower == "not compatible":
                chg = "Not Compatible"
            else:
                raise serializers.ValidationError({"compatible_charging_interface": "Compatible Charging Interface must be Type-C, Lightning, or Not Compatible."})
            attrs["compatible_charging_interface"] = chg

            # storage expansion
            se = raw_vals["storage_expansion_compatibility"]
            if not se or se == "":
                raise serializers.ValidationError({"storage_expansion_compatibility": "Storage Expansion Compatibility is required."})
            se_lower = se.lower()
            if se_lower == "microsdxc":
                se = "microSDXC"
            elif se_lower == "microsdhc":
                se = "microSDHC"
            elif se_lower == "not compatible":
                se = "Not Compatible"
            else:
                raise serializers.ValidationError({"storage_expansion_compatibility": "Storage Expansion Compatibility must be microSDXC, microSDHC, or Not Compatible."})
            attrs["storage_expansion_compatibility"] = se

            # max storage
            ms = raw_vals["maximum_supported_storage"]
            if se in ["microSDXC", "microSDHC"]:
                if not ms or ms == "":
                    raise serializers.ValidationError({"maximum_supported_storage": "Maximum Supported Storage is required."})
                ms_upper = ms.upper()
                if se == "microSDXC":
                    allowed_ms = ['32GB', '64GB', '128GB', '256GB', '512GB', '1TB', '2TB']
                else:
                    allowed_ms = ['16GB', '32GB', '64GB', '128GB', '256GB', '512GB', '1TB', '1.5TB']
                if ms_upper not in allowed_ms:
                    raise serializers.ValidationError({"maximum_supported_storage": "Maximum Supported Storage must match the allowed list for the selected storage type."})
                attrs["maximum_supported_storage"] = ms_upper
            else:
                attrs["maximum_supported_storage"] = "Not Compatible"

            # headphone jack
            hj = raw_vals["headphone_jack_compatibility"]
            if not hj or hj == "":
                raise serializers.ValidationError({"headphone_jack_compatibility": "Headphone Jack Compatibility is required."})
            hj_lower = hj.lower()
            if hj_lower == "type-c":
                hj = "Type-C"
            elif hj_lower == "lightning":
                hj = "Lightning"
            elif hj_lower == "not compatible":
                hj = "Not Compatible"
            else:
                raise serializers.ValidationError({"headphone_jack_compatibility": "Headphone Jack Compatibility must be Type-C, Lightning, or Not Compatible."})
            attrs["headphone_jack_compatibility"] = hj

            # force others
            attrs["wireless_charging_compatibility"] = "Not Compatible"
            attrs["compatible_watch_case_size"] = "Not Compatible"

        elif t_name == "smartwatch":
            # wireless charging
            wc = raw_vals["wireless_charging_compatibility"]
            if not wc or wc == "":
                raise serializers.ValidationError({"wireless_charging_compatibility": "Wireless Charging Compatibility is required."})
            wc_vals = [w.strip() for w in wc.split('+') if w.strip()]
            if not wc_vals:
                raise serializers.ValidationError({"wireless_charging_compatibility": "Wireless Charging Compatibility is required."})
            
            normalized_wc_vals = []
            for w in wc_vals:
                wl = w.lower()
                if wl == "magsafe":
                    normalized_wc_vals.append("MagSafe")
                elif wl == "qi":
                    normalized_wc_vals.append("Qi")
                elif wl == "qi2":
                    normalized_wc_vals.append("Qi2")
                elif wl == "not compatible":
                    normalized_wc_vals.append("Not Compatible")
                else:
                    raise serializers.ValidationError({"wireless_charging_compatibility": f"Invalid Wireless Charging value '{w}'."})
            
            if "Not Compatible" in normalized_wc_vals and len(normalized_wc_vals) > 1:
                raise serializers.ValidationError({"wireless_charging_compatibility": "Not Compatible cannot be selected with any other value."})
            if "Qi" in normalized_wc_vals and ("MagSafe" in normalized_wc_vals or "Qi2" in normalized_wc_vals):
                raise serializers.ValidationError({"wireless_charging_compatibility": "Qi cannot be selected with MagSafe or Qi2."})
            
            attrs["wireless_charging_compatibility"] = "+".join(normalized_wc_vals)

            # watch case size
            wcs = raw_vals["compatible_watch_case_size"]
            if not wcs or wcs == "":
                raise serializers.ValidationError({"compatible_watch_case_size": "Compatible Watch Case Size is required."})
            wcs_lower = wcs.lower()
            allowed_wcs = ["not compatible", "40mm", "41mm", "42mm", "44mm", "45mm", "46mm", "49mm"]
            if wcs_lower not in allowed_wcs:
                raise serializers.ValidationError({"compatible_watch_case_size": "Compatible Watch Case Size must be 40mm, 41mm, 42mm, 44mm, 45mm, 46mm, 49mm, or Not Compatible."})
            
            if wcs_lower == "not compatible":
                wcs = "Not Compatible"
            else:
                wcs = wcs_lower
            attrs["compatible_watch_case_size"] = wcs

            # force others
            attrs["compatible_charging_interface"] = "Not Compatible"
            attrs["storage_expansion_compatibility"] = "Not Compatible"
            attrs["maximum_supported_storage"] = "Not Compatible"
            attrs["headphone_jack_compatibility"] = "Not Compatible"

        elif t_name == "laptop":
            # charging
            chg = raw_vals["compatible_charging_interface"]
            if not chg or chg == "":
                raise serializers.ValidationError({"compatible_charging_interface": "Compatible Charging Interface is required."})
            chg_lower = chg.lower()
            if chg_lower == "type-c":
                chg = "Type-C"
            elif chg_lower == "lightning":
                chg = "Lightning"
            elif chg_lower == "not compatible":
                chg = "Not Compatible"
            else:
                raise serializers.ValidationError({"compatible_charging_interface": "Compatible Charging Interface must be Type-C, Lightning, or Not Compatible."})
            attrs["compatible_charging_interface"] = chg

            # headphone jack
            hj = raw_vals["headphone_jack_compatibility"]
            if not hj or hj == "":
                raise serializers.ValidationError({"headphone_jack_compatibility": "Headphone Jack Compatibility is required."})
            hj_lower = hj.lower()
            if hj_lower == "type-c":
                hj = "Type-C"
            elif hj_lower == "lightning":
                hj = "Lightning"
            elif hj_lower == "not compatible":
                hj = "Not Compatible"
            else:
                raise serializers.ValidationError({"headphone_jack_compatibility": "Headphone Jack Compatibility must be Type-C, Lightning, or Not Compatible."})
            attrs["headphone_jack_compatibility"] = hj

            # force others
            attrs["storage_expansion_compatibility"] = "Not Compatible"
            attrs["maximum_supported_storage"] = "Not Compatible"
            attrs["wireless_charging_compatibility"] = "Not Compatible"
            attrs["compatible_watch_case_size"] = "Not Compatible"

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
