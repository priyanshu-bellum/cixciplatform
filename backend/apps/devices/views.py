"""
Device Catalog — ViewSets

Architecture rules enforced:
- Buyer-scope triad auto-injected into all portfolio reads/writes
- Cross-buyer reads architecturally impossible (BuyerScopedQuerysetMixin)
- DeviceCapabilityEvidence is read-only for all consumers
- Portfolio mutations go through services.py (state chain enforced there)
"""
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend

from apps.tenant.mixins import CheckAccessMixin, BuyerScopedQuerysetMixin
from apps.tenant.services import check_access

from .models import (
    Device, DeviceType, Manufacturer,
    FeatureGroup, FeatureValue, DeviceFeatureAssignment, DeviceCapabilityEvidence,
    CompatibilityMarker, DataQualityException,
    BuyerDevicePortfolioReference, BuyerDevicePortfolioSnapshot, BuyerDevicePortfolioChangeRecord,
)
from .serializers import (
    DeviceTypeSerializer, ManufacturerSerializer,
    DeviceListSerializer, DeviceDetailSerializer,
    FeatureGroupSerializer, FeatureValueSerializer,
    DeviceFeatureAssignmentSerializer, DeviceCapabilityEvidenceSerializer,
    CompatibilityMarkerSerializer, DataQualityExceptionSerializer,
    BuyerPortfolioReferenceSerializer, BuyerPortfolioSnapshotSerializer,
    BuyerPortfolioChangeRecordSerializer,
)
from .services import add_device_to_portfolio, remove_device_from_portfolio


class DeviceTypeViewSet(CheckAccessMixin, viewsets.ModelViewSet):
    queryset = DeviceType.objects.all()
    serializer_class = DeviceTypeSerializer
    action_capability_map = {
        "list": "devices.type.list",
        "retrieve": "devices.type.read",
        "create": "devices.type.manage",
        "update": "devices.type.manage",
        "partial_update": "devices.type.manage",
        "destroy": "devices.type.manage",
        "recalculate_compatibility": "devices.type.manage",
    }
    filter_backends = [filters.SearchFilter]
    search_fields = ["name", "code"]

    def _save_configuration(self, serializer):
        from rest_framework.exceptions import PermissionDenied
        decision = check_access(self.request.user, "devices.type.manage")
        if not decision.granted or decision.reason != "cixci_admin":
            raise PermissionDenied("Device Type configuration requires CIXCI System Admin authority.")
        import json
        import uuid
        from django.db import transaction
        from apps.audit.models import AuditRecord
        from apps.catalog.compatibility_engine import run_device_remapping
        fields = ("name", "code", "status", "is_active", "auto_mapping_eligible", "compatibility_rules", "supported_accessory_categories")
        with transaction.atomic():
            before = {field: getattr(serializer.instance, field) for field in fields} if serializer.instance else None
            instance = serializer.save()
            after = {field: getattr(instance, field) for field in fields}
            AuditRecord.objects.create(event_code="devices.type.configuration_changed", status="success",
                event_description=json.dumps({"before": before, "after": after}, default=str),
                actor_reference=self.request.user.id, company_scope_reference=uuid.UUID(int=0),
                source_module="devices", source_record_type="DeviceType", source_record_id=instance.id)
            if before and any(before[field] != after[field] for field in fields if field not in ("name", "code")):
                for device in instance.devices.select_related("device_type", "manufacturer").iterator():
                    run_device_remapping(device, actor_id=self.request.user.id, change_source="Device Type Configuration")

    def perform_create(self, serializer):
        self._save_configuration(serializer)

    def perform_update(self, serializer):
        self._save_configuration(serializer)

    @action(detail=True, methods=["post"], url_path="recalculate-compatibility")
    def recalculate_compatibility(self, request, pk=None):
        """Trigger remapping for all devices belonging to this Device Type."""
        is_cixci_admin = getattr(request.user, "is_cixci_admin", False)
        if not is_cixci_admin:
            return Response({"error": "Only CIXCI Admins can trigger compatibility recalculation."}, status=403)
        device_type = self.get_object()
        try:
            from apps.catalog.compatibility_engine import run_device_remapping
            from django.db import transaction
            devices = device_type.devices.all()
            count = 0
            with transaction.atomic():
                for dev in devices:
                    run_device_remapping(dev, actor_id=request.user.id, change_source="Device Type Recalculation")
                    count += 1
            return Response({"status": "success", "recalculated_count": count})
        except Exception as e:
            return Response({"error": str(e)}, status=500)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        from apps.catalog.models import DynamicDropdownConfig
        from apps.catalog.compatibility_contract import configured_type_ids
        if any(str(instance.id) in configured_type_ids(config) for config in DynamicDropdownConfig.objects.filter(field_name="product_category")):
            return Response({"error": "This type is referenced by category configuration. Deactivate it to preserve history."}, status=400)
        if instance.devices.exists():
            return Response(
                {"error": "Cannot delete Device Type. It is already tied to existing devices. You may deactivate it instead."},
                status=status.HTTP_400_BAD_REQUEST
            )
        from django.db.models.deletion import ProtectedError
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response(
                {"error": "Cannot delete. It is already in use. You may deactivate or archive it instead."},
                status=status.HTTP_400_BAD_REQUEST
            )


class ManufacturerViewSet(CheckAccessMixin, viewsets.ModelViewSet):
    queryset = Manufacturer.objects.all()
    serializer_class = ManufacturerSerializer
    action_capability_map = {
        "list": "devices.manufacturer.list",
        "retrieve": "devices.manufacturer.read",
        "create": "devices.manufacturer.manage",
        "update": "devices.manufacturer.manage",
        "partial_update": "devices.manufacturer.manage",
        "destroy": "devices.manufacturer.manage",
    }
    filter_backends = [filters.SearchFilter]
    search_fields = ["name"]

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.devices.exists():
            return Response(
                {"error": "Cannot delete manufacturer. It is already tied to existing devices. You may deactivate it instead."},
                status=status.HTTP_400_BAD_REQUEST
            )
        from django.db.models.deletion import ProtectedError
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response(
                {"error": "Cannot delete. It is already in use. You may deactivate or archive it instead."},
                status=status.HTTP_400_BAD_REQUEST
            )


class DeviceViewSet(CheckAccessMixin, viewsets.ModelViewSet):
    queryset = Device.objects.select_related("manufacturer", "device_type")

    @property
    def pagination_class(self):
        if hasattr(self, "request") and self.request and hasattr(self.request, "query_params") and self.request.query_params.get("paginate") == "false":
            return None
        from config.pagination import CixciCursorPagination
        return CixciCursorPagination

    def get_queryset(self):
        user = self.request.user
        qs = Device.objects.select_related("manufacturer", "device_type")
        status_param = self.request.query_params.get("lifecycle_status")
        
        import datetime
        from django.utils import timezone
        today = timezone.localdate()
        from django.db.models import Q
        
        is_buyer = False
        if user and user.is_authenticated and hasattr(user, "entity") and user.entity and user.entity.company and user.entity.company.company_type == "buyer":
            is_buyer = True
            
        if is_buyer:
            if status_param == "available":
                qs = qs.filter(lifecycle_status="available")
            elif status_param == "launching":
                qs = qs.filter(Q(lifecycle_status="launching") | (Q(lifecycle_status="inactive") & Q(launch_date__gt=today)))
            elif status_param:
                qs = qs.none()
            else:
                qs = qs.filter(
                    Q(lifecycle_status="available") |
                    Q(lifecycle_status="launching") |
                    (Q(lifecycle_status="inactive") & Q(launch_date__isnull=False) & Q(launch_date__gt=today))
                )
        else:
            if not (user and user.is_authenticated and user.is_cixci_admin):
                qs = qs.filter(
                    Q(launch_date__isnull=True) | Q(launch_date__lte=today)
                )
                if status_param:
                    if status_param == "launching":
                        qs = qs.filter(Q(lifecycle_status="launching") | (Q(lifecycle_status="inactive") & Q(launch_date__gt=today)))
                    else:
                        qs = qs.filter(lifecycle_status=status_param)
                else:
                    qs = qs.exclude(
                        Q(lifecycle_status="inactive") & (Q(launch_date__isnull=True) | Q(launch_date__gt=today))
                    )
            else:
                if status_param:
                    if status_param == "launching":
                        qs = qs.filter(Q(lifecycle_status="launching") | (Q(lifecycle_status="inactive") & Q(launch_date__gt=today)))
                    else:
                        qs = qs.filter(lifecycle_status=status_param)
        return qs

    def perform_create(self, serializer):
        user = self.request.user
        if not (user and user.is_authenticated and getattr(user, "is_cixci_admin", False)):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only CIXCI Admins can create device records.")
        serializer.save(actor_id=user.id)

    def perform_update(self, serializer):
        user = self.request.user
        if not (user and user.is_authenticated and getattr(user, "is_cixci_admin", False)):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only CIXCI Admins can edit device records.")
        serializer.save(actor_id=user.id)

    def perform_destroy(self, instance):
        user = self.request.user
        if not (user and user.is_authenticated and getattr(user, "is_cixci_admin", False)):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only CIXCI Admins can delete device records.")
        instance.delete()
    action_capability_map = {
        "list": "devices.device.list",
        "retrieve": "devices.device.read",
        "create": "devices.device.import",
        "update": "devices.device.manage",
        "partial_update": "devices.device.manage",
        "destroy": "devices.device.manage",
        "capability_evidence": "devices.device.read",
        "feature_assignments": "devices.device.read",
        "bulk_import": "devices.device.import",
        "audit_history": "devices.device.read",
        "recalculate_compatibility": "devices.device.manage",
        "recalculate_bulk_compatibility": "devices.device.manage",
    }
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["device_type", "manufacturer"]
    search_fields = ["name", "sku", "model_number", "manufacturer__name", "device_type__name", "lifecycle_status"]
    ordering_fields = ["name", "release_date", "created_at"]
    ordering = ["-created_at"]

    def initialize_request(self, request, *args, **kwargs):
        if "import_template" in request.path:
            self.action = "import_template"
        return super().initialize_request(request, *args, **kwargs)

    def get_permissions(self):
        action = getattr(self, "action", None)
        if action == "import_template":
            return []
        return super().get_permissions()

    def get_authenticators(self):
        action = getattr(self, "action", None)
        if action == "import_template":
            return []
        return super().get_authenticators()

    def get_serializer_class(self):
        if self.action == "list":
            return DeviceListSerializer
        return DeviceDetailSerializer

    @action(detail=True, methods=["get"])
    def capability_evidence(self, request, pk=None):
        """
        Read-only DeviceCapabilityEvidence for this device.
        Architecture rule: consuming modules read this; they never create or mutate it.
        """
        device = self.get_object()
        try:
            evidence = device.capability_evidence
            return Response(DeviceCapabilityEvidenceSerializer(evidence).data)
        except DeviceCapabilityEvidence.DoesNotExist:
            return Response({"detail": "No capability evidence generated yet."}, status=404)

    @action(detail=True, methods=["get"])
    def feature_assignments(self, request, pk=None):
        """Active feature assignments for a device."""
        device = self.get_object()
        assignments = device.feature_assignments.filter(is_active=True).select_related(
            "feature_group", "feature_value"
        )
        return Response(DeviceFeatureAssignmentSerializer(assignments, many=True).data)

    @action(detail=True, methods=["get"])
    def audit_history(self, request, pk=None):
        """Retrieves audit logs for a device."""
        device = self.get_object()
        from apps.audit.models import AuditRecord
        
        records = AuditRecord.objects.filter(
            source_module="devices",
            source_record_type="Device",
            source_record_id=str(device.id)
        ).order_by("-created_at")
        
        history = []
        for r in records:
            history.append({
                "id": str(r.id),
                "created_at": r.created_at,
                "event_code": r.event_code,
                "description": r.event_description,
                "status": r.status,
                "actor_id": str(r.actor_reference) if r.actor_reference else None,
            })
        return Response(history)

    @action(detail=False, methods=["get"])
    def import_template(self, request):
        import io
        from django.http import HttpResponse
        from openpyxl import Workbook
        from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
        from openpyxl.utils import get_column_letter
        from openpyxl.worksheet.datavalidation import DataValidation
        from apps.devices.models import Manufacturer, DeviceType, Device

        wb = Workbook()

        # --- Reference sheet (hidden, holds dropdown source lists) ---
        ref = wb.create_sheet("_Dropdowns")

        manufacturers = list(
            Manufacturer.objects.filter(is_active=True)
            .order_by("name")
            .values_list("name", flat=True)
        )
        device_types = list(
            DeviceType.objects.filter(is_active=True, status="active")
            .order_by("name")
            .values_list("name", flat=True)
        )

        def _distinct_vals(field_name, baseline):
            """Merge baseline values with distinct non-empty DB values."""
            db_vals = set(
                Device.objects.exclude(**{field_name: ""})
                .values_list(field_name, flat=True)
                .distinct()
            )
            merged = list(dict.fromkeys(baseline + sorted(db_vals - set(baseline))))
            return merged

        lifecycle_choices = [label for _, label in Device._meta.get_field("lifecycle_status").choices] if Device._meta.get_field("lifecycle_status").choices else [
            "Available", "Launching", "Inactive", "EOL", "Announced",
            "Current", "Legacy", "Retired", "Archived",
        ]

        dropdown_lists = {
            "A": ("Manufacturer", manufacturers),
            "B": ("Device Type", device_types),
            "C": ("Charging Interface", _distinct_vals("compatible_charging_interface", ["Type-C", "Lightning", "Not Compatible"])),
            "D": ("Storage Expansion", _distinct_vals("storage_expansion_compatibility", ["microSDXC", "microSDHC", "Not Compatible"])),
            "E": ("Max Storage", _distinct_vals("maximum_supported_storage", [
                "16GB", "32GB", "64GB", "128GB", "256GB", "512GB",
                "1TB", "1.5TB", "2TB", "Not Compatible",
            ])),
            "F": ("Headphone Jack", _distinct_vals("headphone_jack_compatibility", ["Lightning", "Type-C", "3.5mm", "Not Compatible"])),
            "G": ("Bluetooth", _distinct_vals("bluetooth_compatibility", ["Yes", "No"])),
            "H": ("Wireless Charging", _distinct_vals("wireless_charging_compatibility", [
                "MagSafe", "MagSafe+Qi2", "Qi", "Qi2", "Not Compatible",
            ])),
            "I": ("Watch Case Size", _distinct_vals("compatible_watch_case_size", [
                "40mm", "41mm", "42mm", "44mm", "45mm", "46mm", "49mm",
                "Not Compatible",
            ])),
            "J": ("Lifecycle Status", lifecycle_choices),
        }

        for col_letter, (header, values) in dropdown_lists.items():
            ref[f"{col_letter}1"] = header
            ref[f"{col_letter}1"].font = Font(bold=True, size=9, color="666666")
            for i, val in enumerate(values, start=2):
                ref[f"{col_letter}{i}"] = val

        ref.sheet_state = "hidden"

        # --- Main template sheet ---
        ws = wb.active
        ws.title = "Device Import Template"

        headers = [
            "Device Manufacturer", "Device Name", "Device Type", "Launch Date",
            "Compatible Charging Interface", "Storage Expansion Compatibility",
            "Maximum Supported Storage", "Headphone Jack Compatibility",
            "Bluetooth Compatibility", "Wireless Charging Compatibility",
            "Compatible Watch Case Size",
        ]

        header_fill = PatternFill(start_color="1F4E79", end_color="1F4E79", fill_type="solid")
        header_font = Font(name="Calibri", bold=True, color="FFFFFF", size=11)
        header_align = Alignment(horizontal="center", vertical="center", wrap_text=True)
        thin_border = Border(
            left=Side(style="thin", color="B0B0B0"),
            right=Side(style="thin", color="B0B0B0"),
            top=Side(style="thin", color="B0B0B0"),
            bottom=Side(style="thin", color="B0B0B0"),
        )

        for col_idx, header in enumerate(headers, start=1):
            cell = ws.cell(row=1, column=col_idx, value=header)
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = header_align
            cell.border = thin_border

        col_widths = [22, 30, 16, 14, 30, 30, 26, 30, 22, 32, 28]
        for i, w in enumerate(col_widths, start=1):
            ws.column_dimensions[get_column_letter(i)].width = w

        ws.row_dimensions[1].height = 30
        ws.freeze_panes = "A2"

        # Map template columns → reference sheet columns for DataValidation
        # (column index in template → reference column letter)
        dv_map = {
            1: "A",   # Device Manufacturer
            3: "B",   # Device Type
            5: "C",   # Compatible Charging Interface
            6: "D",   # Storage Expansion Compatibility
            7: "E",   # Maximum Supported Storage
            8: "F",   # Headphone Jack Compatibility
            9: "G",   # Bluetooth Compatibility
            10: "H",  # Wireless Charging Compatibility
            11: "I",  # Compatible Watch Case Size
        }

        max_data_rows = 500
        for tmpl_col, ref_col in dv_map.items():
            _, values = dropdown_lists[ref_col]
            end_row = len(values) + 1
            formula = f"'_Dropdowns'!${ref_col}$2:${ref_col}${end_row}"
            dv = DataValidation(
                type="list",
                formula1=formula,
                allow_blank=True,
                showErrorMessage=True,
                errorTitle="Invalid value",
                error=f"Select a value from the dropdown list.",
                showInputMessage=True,
                promptTitle=headers[tmpl_col - 1],
                prompt=f"Choose from the list or leave blank.",
            )
            col_letter = get_column_letter(tmpl_col)
            dv.sqref = f"{col_letter}2:{col_letter}{max_data_rows + 1}"
            ws.add_data_validation(dv)

        # Date validation for Launch Date (column D)
        date_dv = DataValidation(
            type="custom",
            formula1='AND(ISNUMBER(D2),D2>0)',
            allow_blank=True,
            showErrorMessage=True,
            errorTitle="Invalid date",
            error="Enter a date in MM/DD/YYYY format.",
            showInputMessage=True,
            promptTitle="Launch Date",
            prompt="Enter date as MM/DD/YYYY (e.g. 09/15/2026).",
        )
        date_dv.sqref = f"D2:D{max_data_rows + 1}"
        ws.add_data_validation(date_dv)

        # Format Launch Date column as date
        for row_idx in range(2, max_data_rows + 2):
            ws.cell(row=row_idx, column=4).number_format = "MM/DD/YYYY"

        # Example row
        example_data = [
            "Apple", "iPhone 17", "Phone", "09/15/2026",
            "Type-C", "Not Compatible", "Not Compatible",
            "Not Compatible", "Yes", "MagSafe+Qi2", "Not Compatible",
        ]
        example_font = Font(color="888888", italic=True, size=10)
        for col_idx, val in enumerate(example_data, start=1):
            cell = ws.cell(row=2, column=col_idx, value=val)
            cell.font = example_font
            cell.border = thin_border

        # Serialize to bytes
        buf = io.BytesIO()
        wb.save(buf)
        buf.seek(0)

        response = HttpResponse(
            buf.getvalue(),
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        response["Content-Disposition"] = 'attachment; filename="device_import_template.xlsx"'
        return response

    @action(detail=False, methods=["post"])
    def bulk_import(self, request):
        user = request.user
        if not (user and user.is_authenticated and getattr(user, "is_cixci_admin", False)):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only CIXCI Admins can import devices.")

        from django.db import transaction
        import csv
        import io

        raw_mode = str(request.data.get("import_mode", "Create New Only")).strip().lower()
        if raw_mode in ["update", "update_existing", "update existing", "mode_update"]:
            import_mode = "Update Existing"
        elif raw_mode in ["upsert", "mode_upsert"]:
            import_mode = "Upsert"
        else:
            import_mode = "Create New Only"

        file = request.FILES.get("file")
        if not file:
            return Response({"error": "No file uploaded."}, status=400)

        fname = getattr(file, "name", "").lower()
        is_xlsx = fname.endswith(".xlsx") or fname.endswith(".xls")

        try:
            if is_xlsx:
                import openpyxl
                wb = openpyxl.load_workbook(file, data_only=True)
                ws = wb.active
                raw = list(ws.iter_rows(values_only=True))
                headers = [str(c or "").strip() for c in raw[0]] if raw else []
                rows = []
                for r in raw[1:]:
                    vals = [str(c) if c is not None else "" for c in r]
                    if any(v.strip() for v in vals):
                        rows.append(vals)
            else:
                decoded_file = file.read().decode('utf-8-sig')
                io_string = io.StringIO(decoded_file)
                reader = csv.reader(io_string)
                headers = next(reader)
                rows = list(reader)
        except Exception as e:
            return Response({"error": f"Failed to parse file: {str(e)}"}, status=400)

        expected_cols = [
            "Device Manufacturer", "Device Name", "Device Type", "Launch Date",
            "Compatible Charging Interface", "Storage Expansion Compatibility", "Maximum Supported Storage",
            "Headphone Jack Compatibility", "Bluetooth Compatibility", "Wireless Charging Compatibility",
            "Compatible Watch Case Size"
        ]

        headers = [h.strip() for h in headers if h.strip()]
        if headers != expected_cols:
            return Response({"error": f"Columns do not match the expected template. Expected: {', '.join(expected_cols)}"}, status=400)

        if not rows:
            return Response({"error": "No data rows found in the file."}, status=400)

        validation_errors = []
        imported_count = 0
        updated_count = 0
        from apps.devices.models import Manufacturer, DeviceType, Device

        manufacturers_by_name = {m.name.strip().lower(): m for m in Manufacturer.objects.filter(is_active=True)}
        device_types_by_name = {t.name.strip().lower(): t for t in DeviceType.objects.all()}

        for idx, row in enumerate(rows, start=1):
            row = [r.strip() for r in row]
            if not any(row):
                continue
            if len(row) > len(expected_cols):
                row = row[:len(expected_cols)]
            elif len(row) < len(expected_cols):
                row = row + [""] * (len(expected_cols) - len(row))

            row_errors = {}
            m_val = row[0]
            name_val = row[1]
            t_val = row[2]
            launch_date_val = row[3]

            m_obj = None
            if not m_val:
                row_errors["Device Manufacturer"] = "Device Manufacturer is required."
            else:
                m_obj = manufacturers_by_name.get(m_val.lower())
                if not m_obj:
                    row_errors["Device Manufacturer"] = f"Device Manufacturer '{m_val}' does not exist or is inactive."

            t_obj = None
            if not t_val:
                row_errors["Device Type"] = "Device Type is required."
            else:
                t_lower = t_val.lower()
                if t_lower == 'smartphone':
                    t_lower = 'phone'
                t_obj = device_types_by_name.get(t_lower)
                if not t_obj:
                    row_errors["Device Type"] = f"Device Type '{t_val}' does not exist. Create it first in Device Types management."
                elif not t_obj.is_active or t_obj.status != 'active':
                    row_errors["Device Type"] = f"Device Type '{t_val}' is in {t_obj.status} status and must be configured/Active before it can be used."

            if not name_val:
                row_errors["Device Name"] = "Device Name is required."

            parsed_date = None
            if not launch_date_val:
                row_errors["Launch Date"] = "Launch Date is required."
            else:
                from datetime import datetime
                try:
                    parsed_date = datetime.strptime(launch_date_val, "%m/%d/%Y").date()
                except ValueError:
                    try:
                        parsed_date = datetime.strptime(launch_date_val, "%Y-%m-%d").date()
                    except ValueError:
                        row_errors["Launch Date"] = "Launch Date must be in MM/DD/YYYY format."

            cleaned_name = name_val
            if m_obj and name_val:
                m_name = m_obj.name.strip().lower()
                d_name = name_val.strip()
                if d_name.lower().startswith(m_name):
                    cleaned_name = d_name[len(m_name):].strip().lstrip(" -/\\")

            if cleaned_name and not row_errors.get("Device Name"):
                cleaned_name_stripped = cleaned_name.strip()
                if any(char in cleaned_name_stripped for char in [",", ";"]):
                    row_errors["Device Name"] = "Device Name cannot contain special characters/delimiters like ',' or ';'."
                elif cleaned_name_stripped.lower() in [
                    "lightning", "magsafe", "qi", "qi2", "type-c", "microsd",
                    "microsdhc", "microsdxc", "40mm", "41mm", "42mm", "44mm",
                    "45mm", "46mm", "49mm"
                ]:
                    row_errors["Device Name"] = "Device Name cannot be a generic compatibility feature name."

            existing_device = None
            if m_obj and cleaned_name and not row_errors.get("Device Name") and not row_errors.get("Device Manufacturer"):
                existing_device = Device.objects.filter(manufacturer=m_obj, name__iexact=cleaned_name).first()
                if not existing_device:
                    norm_cleaned = cleaned_name.replace(" ", "").lower()
                    for dev in Device.objects.filter(manufacturer=m_obj):
                        if dev.name.replace(" ", "").lower() == norm_cleaned:
                            existing_device = dev
                            break

                if existing_device:
                    if import_mode == "Create New Only":
                        row_errors["Device Name"] = f"The Device Already Exists"
                else:
                    if import_mode == "Update Existing":
                        row_errors["Device Name"] = f"Device with Manufacturer '{m_obj.name}' and Name '{cleaned_name}' does not exist."

            serializer_data = None
            if m_obj and t_obj and not row_errors.get("Launch Date") and parsed_date and not row_errors.get("Device Type"):
                serializer_data = {
                    "manufacturer": m_obj.id,
                    "name": existing_device.name if (existing_device and import_mode != "Create New Only") else cleaned_name,
                    "device_type": t_obj.id,
                    "launch_date": launch_date_val,
                    "compatible_charging_interface": row[4],
                    "storage_expansion_compatibility": row[5],
                    "maximum_supported_storage": row[6],
                    "headphone_jack_compatibility": row[7],
                    "bluetooth_compatibility": row[8],
                    "wireless_charging_compatibility": row[9],
                    "compatible_watch_case_size": row[10],
                }

                serializer = DeviceDetailSerializer(instance=existing_device if (existing_device and import_mode != "Create New Only") else None, data=serializer_data, partial=True)
                if not serializer.is_valid():
                    field_to_col = {
                        "compatible_charging_interface": "Compatible Charging Interface",
                        "storage_expansion_compatibility": "Storage Expansion Compatibility",
                        "maximum_supported_storage": "Maximum Supported Storage",
                        "headphone_jack_compatibility": "Headphone Jack Compatibility",
                        "bluetooth_compatibility": "Bluetooth Compatibility",
                        "wireless_charging_compatibility": "Wireless Charging Compatibility",
                        "compatible_watch_case_size": "Compatible Watch Case Size",
                        "device_type": "Device Type",
                        "launch_date": "Launch Date",
                        "name": "Device Name"
                    }
                    for field, err_list in serializer.errors.items():
                        col_name = field_to_col.get(field, field)
                        row_errors[col_name] = err_list[0] if isinstance(err_list, list) else str(err_list)

            if row_errors:
                for col_name, err_msg in row_errors.items():
                    validation_errors.append({
                        "row": idx + 1,
                        "column": col_name,
                        "submitted_value": row[expected_cols.index(col_name)] if col_name in expected_cols else "",
                        "error_message": err_msg
                    })
            elif serializer_data:
                try:
                    with transaction.atomic():
                        if existing_device and import_mode != "Create New Only":
                            serializer = DeviceDetailSerializer(instance=existing_device, data=serializer_data, partial=True)
                            if serializer.is_valid():
                                serializer.save(actor_id=request.user.id)
                                updated_count += 1
                        else:
                            serializer_data["lifecycle_status"] = "available"
                            serializer = DeviceDetailSerializer(data=serializer_data)
                            if serializer.is_valid():
                                serializer.save(actor_id=request.user.id)
                                imported_count += 1
                except Exception as ex:
                    validation_errors.append({
                        "row": idx + 1,
                        "column": "General",
                        "submitted_value": "",
                        "error_message": str(ex)
                    })

        from apps.devices.services import log_device_audit
        if validation_errors and imported_count == 0 and updated_count == 0:
            log_device_audit(
                event_code="devices.device.import_failed",
                description=f"CSV import failed validation. Mode: {import_mode}. File contained {len(rows)} rows. Found {len(validation_errors)} validation errors.",
                device_id=None,
                actor_id=request.user.id if request.user else None,
                status="failed"
            )
            return Response({
                "status": "validation_failed",
                "errors": validation_errors
            }, status=400)

        log_device_audit(
            event_code="devices.device.imported",
            description=f"CSV import completed. Mode: {import_mode}. Created: {imported_count}, Updated: {updated_count}. Errors: {len(validation_errors)}.",
            device_id=None,
            actor_id=request.user.id if request.user else None,
            status="success"
        )
        return Response({
            "status": "success" if not validation_errors else "partial_success",
            "created_count": imported_count,
            "updated_count": updated_count,
            "errors": validation_errors
        })

    @action(detail=True, methods=["post"], url_path="recalculate-compatibility")
    def recalculate_compatibility(self, request, pk=None):
        """Trigger compatibility remapping for a single device."""
        is_cixci_admin = getattr(request.user, "is_cixci_admin", False)
        if not is_cixci_admin:
            return Response({"error": "Only CIXCI Admins can trigger compatibility recalculation."}, status=403)
        device = self.get_object()
        try:
            from apps.catalog.compatibility_engine import run_device_remapping
            from django.db import transaction
            with transaction.atomic():
                run_device_remapping(device, actor_id=request.user.id, change_source="Manual Recalculation")
            return Response({"status": "success", "device_name": device.name})
        except Exception as e:
            return Response({"error": str(e)}, status=500)

    @action(detail=False, methods=["post"], url_path="recalculate-compatibility")
    def recalculate_bulk_compatibility(self, request):
        """Trigger bulk compatibility remapping at device type, manufacturer, or all active devices level."""
        is_cixci_admin = getattr(request.user, "is_cixci_admin", False)
        if not is_cixci_admin:
            return Response({"error": "Only CIXCI Admins can trigger compatibility recalculation."}, status=403)
            
        device_type_id = request.data.get("device_type_id")
        manufacturer_id = request.data.get("manufacturer_id")
        recalculate_all = request.data.get("all")
        
        if not device_type_id and not manufacturer_id and not recalculate_all:
            return Response({"error": "Please provide 'device_type_id', 'manufacturer_id', or 'all' to recalculate compatibility."}, status=400)
            
        from apps.catalog.compatibility_engine import run_device_remapping
        from django.db import transaction
        
        devices = Device.objects.all()
        if device_type_id:
            devices = devices.filter(device_type_id=device_type_id)
        if manufacturer_id:
            devices = devices.filter(manufacturer_id=manufacturer_id)
            
        count = 0
        try:
            with transaction.atomic():
                for dev in devices:
                    run_device_remapping(dev, actor_id=request.user.id, change_source="Bulk Recalculation")
                    count += 1
            return Response({"status": "success", "recalculated_count": count})
        except Exception as e:
            return Response({"error": str(e)}, status=500)


class FeatureGroupViewSet(CheckAccessMixin, viewsets.ModelViewSet):
    queryset = FeatureGroup.objects.select_related("device_type")
    serializer_class = FeatureGroupSerializer
    action_capability_map = {
        "list": "devices.feature.list",
        "retrieve": "devices.feature.read",
        "create": "devices.feature.manage",
        "update": "devices.feature.manage",
        "partial_update": "devices.feature.manage",
        "destroy": "devices.feature.manage",
    }
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["device_type", "lifecycle"]


class FeatureValueViewSet(CheckAccessMixin, viewsets.ModelViewSet):
    queryset = FeatureValue.objects.select_related("feature_group")
    serializer_class = FeatureValueSerializer
    action_capability_map = {
        "list": "devices.feature.list",
        "retrieve": "devices.feature.read",
        "create": "devices.feature.manage",
        "update": "devices.feature.manage",
        "partial_update": "devices.feature.manage",
        "destroy": "devices.feature.manage",
    }
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["feature_group", "lifecycle"]


class DataQualityExceptionViewSet(CheckAccessMixin, viewsets.ModelViewSet):
    queryset = DataQualityException.objects.select_related("device")
    serializer_class = DataQualityExceptionSerializer
    action_capability_map = {
        "list": "devices.dqe.list",
        "retrieve": "devices.dqe.read",
        "create": "devices.dqe.create",
        "update": "devices.dqe.resolve",
        "partial_update": "devices.dqe.resolve",
        "destroy": "devices.dqe.manage",
    }
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["status", "device"]


class BuyerPortfolioViewSet(BuyerScopedQuerysetMixin, viewsets.GenericViewSet):
    """
    My Devices — buyer portfolio management.

    The portfolio is company-scoped (per buyer entity), so every user of the
    same buyer company sees and manages the same device list. Reads/writes are
    still scoped to the caller's company + entity: cross-buyer access is
    architecturally impossible.
    Portfolio mutations go through services.py (non-collapsible state chain enforced there).
    """
    permission_classes = [IsAuthenticated]
    serializer_class = BuyerPortfolioReferenceSerializer

    def get_queryset(self):
        user = self.request.user
        if not user or not hasattr(user, "entity") or user.entity is None:
            return BuyerDevicePortfolioReference.objects.none()

        return BuyerDevicePortfolioReference.objects.filter(
            company_scope_reference=user.entity.company_id,
            buyer_entity_reference=user.entity_id,
        ).select_related("device__manufacturer", "device__device_type")

    @action(detail=False, methods=["get"])
    def my_devices(self, request):
        """List all active devices in the buyer's (company-scoped) portfolio."""
        qs = self.get_queryset().filter(active_flag=True).order_by("created_at", "id")
        seen = set()
        unique_refs = []
        for ref in qs:
            if ref.device_id in seen:
                continue
            seen.add(ref.device_id)
            unique_refs.append(ref)
        return Response(BuyerPortfolioReferenceSerializer(unique_refs, many=True).data)

    @action(detail=False, methods=["post"])
    def add(self, request):
        """Add a device to My Devices portfolio."""
        device_id = request.data.get("device_id")
        if not device_id:
            return Response({"error": "device_id required"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            result = add_device_to_portfolio(request.user, device_id)
            return Response(result, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=["post"])
    def remove(self, request):
        """Remove a device from My Devices portfolio."""
        device_id = request.data.get("device_id")
        if not device_id:
            return Response({"error": "device_id required"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            result = remove_device_from_portfolio(request.user, device_id)
            return Response(result)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=["get"])
    def history(self, request):
        """Append-only change history for the buyer's (company-scoped) portfolio."""
        changes = BuyerDevicePortfolioChangeRecord.objects.filter(
            company_scope_reference=request.user.entity.company_id,
            buyer_entity_reference=request.user.entity_id,
        ).select_related("device").order_by("-created_at")[:50]
        return Response(BuyerPortfolioChangeRecordSerializer(changes, many=True).data)

    @action(detail=False, methods=["get"])
    def snapshots(self, request):
        """List portfolio snapshots for the buyer's company portfolio."""
        snaps = BuyerDevicePortfolioSnapshot.objects.filter(
            company_scope_reference=request.user.entity.company_id,
            buyer_entity_reference=request.user.entity_id,
        ).order_by("-created_at")[:20]
        return Response(BuyerPortfolioSnapshotSerializer(snaps, many=True).data)
