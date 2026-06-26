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

    def get_queryset(self):
        user = self.request.user
        qs = Device.objects.select_related("manufacturer", "device_type")
        if not (user and user.is_authenticated and user.is_cixci_admin):
            import datetime
            from django.utils import timezone
            today = timezone.localdate()
            from django.db.models import Q
            qs = qs.filter(
                Q(launch_date__isnull=True) | Q(launch_date__lte=today)
            ).exclude(
                lifecycle_status="inactive"
            )
        return qs
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
    filterset_fields = ["lifecycle_status", "device_type", "manufacturer"]
    search_fields = ["name", "sku", "model_number"]
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
        import os
        from django.http import HttpResponse
        from django.conf import settings
        
        file_paths = [
            os.path.join(settings.BASE_DIR, "Device CSV Template test.csv"),
            os.path.join(settings.BASE_DIR, "..", "Device CSV Template test.csv"),
            os.path.abspath("Device CSV Template test.csv"),
            os.path.abspath("../Device CSV Template test.csv"),
        ]
        
        for path in file_paths:
            if os.path.exists(path):
                try:
                    with open(path, 'rb') as f:
                        content = f.read()
                    response = HttpResponse(content, content_type='text/csv')
                    response['Content-Disposition'] = 'attachment; filename="device_import_template.csv"'
                    return response
                except Exception:
                    pass
                    
        import csv
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="device_import_template.csv"'
        writer = csv.writer(response)
        writer.writerow([
            "Device Manufacturer", "Device Name", "Device Type", "Launch Date",
            "Compatible Charging Interface", "Storage Expansion Compatibility", "Maximum Supported Storage",
            "Headphone Jack Compatibility", "Bluetooth Compatibility", "Wireless Charging Compatibility",
            "Compatible Watch Case Size"
        ])
        writer.writerow([
            "Apple", "iPhone 17", "Phone", "09/15/2026",
            "Type-C", "Not Compatible", "",
            "Type-C", "Yes", "MagSafe", "Not Compatible"
        ])
        return response

    @action(detail=False, methods=["post"])
    def bulk_import(self, request):
        from django.db import transaction
        import csv
        import io
        
        import_mode = request.data.get("import_mode", "Create New Only")
        file = request.FILES.get("file")
        if not file:
            return Response({"error": "No file uploaded."}, status=400)
            
        try:
            decoded_file = file.read().decode('utf-8-sig')
            io_string = io.StringIO(decoded_file)
            reader = csv.reader(io_string)
            headers = next(reader)
        except Exception as e:
            return Response({"error": f"Failed to parse CSV file: {str(e)}"}, status=400)
            
        expected_cols = [
            "Device Manufacturer", "Device Name", "Device Type", "Launch Date",
            "Compatible Charging Interface", "Storage Expansion Compatibility", "Maximum Supported Storage",
            "Headphone Jack Compatibility", "Bluetooth Compatibility", "Wireless Charging Compatibility",
            "Compatible Watch Case Size"
        ]
        
        headers = [h.strip() for h in headers if h.strip()]
        if headers != expected_cols:
            return Response({"error": f"CSV columns do not match the expected template. Expected: {', '.join(expected_cols)}"}, status=400)
            
        rows = list(reader)
        if not rows:
            return Response({"error": "No data rows found in the CSV file."}, status=400)
            
        validation_errors = []
        from apps.devices.models import Manufacturer, DeviceType, Device
        
        manufacturers_by_name = {m.name.strip().lower(): m for m in Manufacturer.objects.filter(is_active=True)}
        device_types_by_name = {t.name.strip().lower(): t for t in DeviceType.objects.all()}
        
        for idx, row in enumerate(rows, start=1):
            row = [r.strip() for r in row]
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
                if t_lower not in ['phone', 'tablet', 'smartwatch', 'laptop']:
                    row_errors["Device Type"] = "Device Type must be Phone, Tablet, Smartwatch or Laptop."
                else:
                    t_obj = device_types_by_name.get(t_lower)
                    if not t_obj:
                        row_errors["Device Type"] = f"Device Type '{t_val}' does not exist."
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
                    
            if m_obj and cleaned_name and not row_errors.get("Device Name") and not row_errors.get("Device Manufacturer"):
                existing_device = Device.objects.filter(manufacturer=m_obj, name__iexact=cleaned_name).first()
                if existing_device:
                    if import_mode == "Create New Only" or not import_mode:
                        row_errors["Device Name"] = f"Device with Manufacturer '{m_obj.name}' and Name '{cleaned_name}' already exists."
                else:
                    if import_mode == "Update Existing":
                        row_errors["Device Name"] = f"Device with Manufacturer '{m_obj.name}' and Name '{cleaned_name}' does not exist."
                        
            if m_obj and t_obj and not row_errors.get("Launch Date") and parsed_date and not row_errors.get("Device Type"):
                serializer_data = {
                    "manufacturer": m_obj.id,
                    "name": cleaned_name,
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
                
                existing_device = Device.objects.filter(manufacturer=m_obj, name__iexact=cleaned_name).first()
                serializer = DeviceDetailSerializer(instance=existing_device if (existing_device and import_mode != "Create New Only") else None, data=serializer_data)
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
                        "row": idx,
                        "column": col_name,
                        "submitted_value": row[expected_cols.index(col_name)] if col_name in expected_cols else "",
                        "error_message": err_msg
                    })
                    
        if validation_errors:
            from apps.devices.services import log_device_audit
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
            
        imported_count = 0
        updated_count = 0
        
        with transaction.atomic():
            for row in rows:
                m_val = row[0]
                name_val = row[1]
                t_val = row[2]
                launch_date_val = row[3]
                
                m_obj = manufacturers_by_name.get(m_val.lower())
                t_lookup = t_val.lower()
                if t_lookup == 'smartphone':
                    t_lookup = 'phone'
                t_obj = device_types_by_name.get(t_lookup)
                
                from datetime import datetime
                try:
                    parsed_date = datetime.strptime(launch_date_val, "%m/%d/%Y").date()
                except ValueError:
                    parsed_date = datetime.strptime(launch_date_val, "%Y-%m-%d").date()
                    
                cleaned_name = name_val
                m_name = m_obj.name.strip().lower()
                d_name = name_val.strip()
                if d_name.lower().startswith(m_name):
                    cleaned_name = d_name[len(m_name):].strip().lstrip(" -/\\")
                    
                device = Device.objects.filter(manufacturer=m_obj, name__iexact=cleaned_name).first()
                
                serializer_data = {
                    "manufacturer": m_obj.id,
                    "name": cleaned_name,
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
                
                if device:
                    if import_mode == "Create New Only":
                        continue
                    serializer = DeviceDetailSerializer(instance=device, data=serializer_data)
                    if serializer.is_valid():
                        serializer.save(actor_id=request.user.id)
                        updated_count += 1
                else:
                    if import_mode == "Update Existing":
                        continue
                    serializer_data["lifecycle_status"] = "available"
                    serializer = DeviceDetailSerializer(data=serializer_data)
                    if serializer.is_valid():
                        serializer.save(actor_id=request.user.id)
                        imported_count += 1
                    
        from apps.devices.services import log_device_audit
        log_device_audit(
            event_code="devices.device.imported",
            description=f"CSV import completed successfully. Mode: {import_mode}. Created {imported_count} new devices, updated {updated_count} devices.",
            device_id=None,
            actor_id=request.user.id if request.user else None,
            status="success"
        )
        return Response({
            "status": "success",
            "created_count": imported_count,
            "updated_count": updated_count
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

    All reads/writes are automatically scoped to the requesting buyer.
    Cross-buyer access is architecturally impossible.
    Portfolio mutations go through services.py (non-collapsible state chain enforced there).
    """
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return BuyerDevicePortfolioReference.objects.filter(
            buyer_reference=self.request.user.id,
            company_scope_reference=self.request.user.entity.company_id,
            buyer_entity_reference=self.request.user.entity_id,
        ).select_related("device__manufacturer", "device__device_type")

    @action(detail=False, methods=["get"])
    def my_devices(self, request):
        """List all active devices in the buyer's portfolio."""
        qs = self.get_queryset().filter(active_flag=True)
        return Response(BuyerPortfolioReferenceSerializer(qs, many=True).data)

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
        """Append-only change history for buyer's portfolio."""
        changes = BuyerDevicePortfolioChangeRecord.objects.filter(
            buyer_reference=request.user.id,
            company_scope_reference=request.user.entity.company_id,
        ).select_related("device").order_by("-created_at")[:50]
        return Response(BuyerPortfolioChangeRecordSerializer(changes, many=True).data)

    @action(detail=False, methods=["get"])
    def snapshots(self, request):
        """List portfolio snapshots for the buyer."""
        snaps = BuyerDevicePortfolioSnapshot.objects.filter(
            buyer_reference=request.user.id,
            company_scope_reference=request.user.entity.company_id,
        ).order_by("-created_at")[:20]
        return Response(BuyerPortfolioSnapshotSerializer(snaps, many=True).data)
