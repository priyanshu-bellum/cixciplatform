"""
Product Catalog — Models

Architecture rules (spec.md):
- Product Catalog owns product records, lifecycle, compatibility assertions, and
  buyer-scoped compatibility projections
- Device Catalog owns device feature truth (DeviceCapabilityEvidence) — Product Catalog
  reads it; NEVER creates or mutates Device Catalog records
- Locked default: Removing a device from My Devices does NOT auto-set
  Selling Status to 'Stop Selling'. Product Catalog does not auto-transition
  commercial state on portfolio changes.
- Buyer-scoped Compatibility Projection is Product Catalog's own entity —
  derived from Device Catalog's BuyerDevicePortfolioSnapshot (read-only reference)
"""
import uuid
from django.db import models
from django.utils import timezone


class ProductStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    PENDING_REVIEW = "pending_review", "Pending Review"
    ACTIVE = "active", "Active"
    INACTIVE = "inactive", "Inactive"
    ARCHIVED = "archived", "Archived"
    EOL = "eol", "EOL"
    OUT_OF_STOCK = "out_of_stock", "Out of Stock"



class SellingStatus(models.TextChoices):
    NOT_FOR_SALE = "not_for_sale", "Not For Sale"
    FOR_SALE = "for_sale", "For Sale"
    STOP_SELLING = "stop_selling", "Stop Selling"
    # NOTE: STOP_SELLING is only set by explicit Product Catalog workflow actions.
    # Removing a device from My Devices does NOT auto-trigger this.


class ProductType(models.TextChoices):
    ACCESSORY = "accessory", "Accessory"
    BRANDED_MERCHANDISE = "branded_merchandise", "Branded Merchandise"
    DEVICE = "device", "Device (reference only)"


class ProductCategory(models.TextChoices):
    CASES = "Cases", "Cases"
    SCREEN_PROTECTION = "Screen Protection", "Screen Protection"
    HEADPHONES = "Headphones", "Headphones"
    SPEAKERS = "Speakers", "Speakers"
    CHARGERS_AND_CABLES = "Chargers and Cables", "Chargers and Cables"
    MEMORY = "Memory", "Memory"
    WEARABLE_TECH = "Wearable Tech", "Wearable Tech"
    PHONE_ATTACHMENTS = "Phone Attachments", "Phone Attachments"



class ProjectionStatus(models.TextChoices):
    ACTIVE = "active", "Active"
    STALE = "stale", "Stale"
    RECALCULATING = "recalculating", "Recalculating"
    REVIEW_REQUIRED = "review_required", "Review Required"
    EMPTY_PORTFOLIO = "empty_portfolio", "Empty Portfolio"


class ExportJobStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    RUNNING = "running", "Running"
    COMPLETED = "completed", "Completed"
    FAILED = "failed", "Failed"
    CANCELLED = "cancelled", "Cancelled"


# ─── Product ──────────────────────────────────────────────────────────────────

class Product(models.Model):
    """
    Canonical product record. Owned by Product Catalog.
    Vendor wholesale price inputs are stored here; Pricing does the calculation.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product_type = models.CharField(max_length=30, choices=ProductType.choices)
    product_category = models.CharField(max_length=50, choices=ProductCategory.choices, blank=True, null=True)
    vendor_company_reference = models.UUIDField(db_index=True, help_text="Tenant Company vendor ID")
    company_scope_reference = models.UUIDField(db_index=True)

    # Identity
    name = models.CharField(max_length=300)
    sku = models.CharField(max_length=200, db_index=True)
    brand = models.CharField(max_length=200, blank=True)
    description = models.TextField(blank=True)

    # Lifecycle
    status = models.CharField(max_length=20, choices=ProductStatus.choices, default=ProductStatus.DRAFT)
    selling_status = models.CharField(max_length=20, choices=SellingStatus.choices, default=SellingStatus.NOT_FOR_SALE)

    # Vendor wholesale price inputs (Pricing does the calculation from these)
    vendor_wholesale_price_amount = models.DecimalField(max_digits=12, decimal_places=4, null=True, blank=True)
    vendor_wholesale_price_currency = models.CharField(max_length=3, default="USD")

    # Media references (Media module owns actual assets)
    primary_image_reference = models.UUIDField(null=True, blank=True)
    media_references = models.JSONField(default=list)

    # Extended attributes from XLSX templates
    upc = models.CharField(max_length=100, blank=True, null=True)
    launch_date = models.DateField(null=True, blank=True)
    release_date = models.DateField(null=True, blank=True)
    eol_date = models.DateField(null=True, blank=True)
    color = models.CharField(max_length=100, blank=True, null=True)
    system_color = models.CharField(max_length=100, blank=True, null=True)
    msrp = models.DecimalField(max_digits=12, decimal_places=4, null=True, blank=True)
    map_price = models.DecimalField(max_digits=12, decimal_places=4, null=True, blank=True)
    sale_price = models.DecimalField(max_digits=12, decimal_places=4, null=True, blank=True)
    recommended_accessory = models.BooleanField(default=False)
    inventory_level = models.IntegerField(null=True, blank=True)
    inventory_threshold = models.IntegerField(null=True, blank=True, default=0)
    length = models.DecimalField(max_digits=8, decimal_places=3, null=True, blank=True)
    width = models.DecimalField(max_digits=8, decimal_places=3, null=True, blank=True)
    height = models.DecimalField(max_digits=8, decimal_places=3, null=True, blank=True)
    weight = models.DecimalField(max_digits=8, decimal_places=3, null=True, blank=True)
    warranty = models.CharField(max_length=200, blank=True, null=True)
    short_description = models.TextField(blank=True, null=True)
    promo_information = models.TextField(blank=True, null=True)
    meta_title = models.CharField(max_length=200, blank=True, null=True)
    meta_description = models.TextField(blank=True, null=True)

    # Category-specific compatibility fields
    headphone_jack_compatibility = models.CharField(max_length=50, default="", blank=True)
    bluetooth_compatibility = models.CharField(max_length=50, default="", blank=True)
    compatible_charging_interface = models.CharField(max_length=50, default="", blank=True)
    wireless_charging_compatibility = models.CharField(max_length=100, default="", blank=True)
    storage_expansion_compatibility = models.CharField(max_length=50, default="", blank=True)
    memory_capacity = models.CharField(max_length=50, default="", blank=True)
    compatible_watch_case_size = models.CharField(max_length=50, default="", blank=True)
    compatibility_status = models.CharField(max_length=30, default="incomplete")

    # Audit
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "catalog_product"
        indexes = [
            models.Index(fields=["product_type", "status", "selling_status"]),
            models.Index(fields=["vendor_company_reference", "status"]),
            models.Index(fields=["sku"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.sku})"

    @property
    def is_tied_to_activity(self):
        """
        Check if the product is already referenced in:
        1. PurchaseOrderLine
        2. BuyerProductExportSelectionSnapshot
        3. InvoiceLine
        """
        from apps.procurement.models import PurchaseOrderLine
        from apps.catalog.models import BuyerProductExportSelectionSnapshot
        from apps.invoicing.models import InvoiceLine

        if PurchaseOrderLine.objects.filter(product_reference=self.id).exists():
            return True

        from django.db import connection
        if connection.vendor == 'sqlite':
            for snapshot in BuyerProductExportSelectionSnapshot.objects.all():
                if str(self.id) in snapshot.product_ids:
                    return True
        else:
            if BuyerProductExportSelectionSnapshot.objects.filter(product_ids__contains=str(self.id)).exists():
                return True

        if InvoiceLine.objects.filter(source_product_reference=self.id).exists():
            return True

        return False

    def clean(self):
        super().clean()
        from django.core.exceptions import ValidationError
        from datetime import datetime, date
        import pytz
        
        # Convert string dates to date objects if needed
        def parse_date_str(val):
            for fmt in ("%Y-%m-%d", "%m-%d-%Y", "%m/%d/%Y"):
                try:
                    return datetime.strptime(val, fmt).date()
                except ValueError:
                    continue
            raise ValueError("Invalid date format")

        # Convert string dates to date objects if needed
        if isinstance(self.launch_date, str) and self.launch_date.strip():
            try:
                self.launch_date = parse_date_str(self.launch_date.strip())
            except ValueError:
                pass
        if isinstance(self.release_date, str) and self.release_date.strip():
            try:
                self.release_date = parse_date_str(self.release_date.strip())
            except ValueError:
                pass
        if isinstance(self.eol_date, str) and self.eol_date.strip():
            try:
                self.eol_date = parse_date_str(self.eol_date.strip())
            except ValueError:
                pass

        # Dates should be stored consistently in the system and displayed/compared in Eastern Time
        est = pytz.timezone("US/Eastern")
        today_est = timezone.now().astimezone(est).date()
        
        if not self.launch_date:
            raise ValidationError({"launch_date": "Launch Date is required for all products."})
            
        # If Launch Date is in the future, Release Date is required
        if self.launch_date > today_est:
            # Check for placeholder/infinite launch date 12/31/9999
            if self.launch_date.year != 9999 and not self.release_date:
                raise ValidationError({"release_date": "Release Date is required when the Launch Date is in the future."})
                
            # If Launch Date is in the future, Product Status must be Inactive
            if self.status in [ProductStatus.ACTIVE, ProductStatus.EOL, ProductStatus.OUT_OF_STOCK]:
                raise ValidationError({"status": "Products with a future Launch Date must remain Inactive unless an approved exception exists."})
                
        if self.status == "Select Product Status":
            raise ValidationError({"status": "Select Product Status is a placeholder only and cannot be saved or imported."})

        if self.status == ProductStatus.EOL:
            if not self.eol_date:
                raise ValidationError({"eol_date": "If EOL is selected, the EOL Date field is required."})
                
        if self.eol_date:
            if self.eol_date < self.launch_date:
                raise ValidationError({"eol_date": "EOL Date cannot be earlier than the Launch Date."})
                
            # If EOL Date is in the future, the product should remain Active
            if self.eol_date > today_est and self.status == ProductStatus.EOL:
                raise ValidationError({"status": "If EOL Date is in the future, the product should remain Active."})

        # Validate category-specific accessory fields
        if self.product_category:
            from apps.catalog.models import DynamicDropdownConfig
            cat_cfg = DynamicDropdownConfig.objects.filter(field_name="product_category", value=self.product_category).first()
            if not cat_cfg:
                raise ValidationError({"product_category": "The selected product category is not recognized."})
            if cat_cfg.status != 'active':
                raise ValidationError({"product_category": f"Product Category '{self.product_category}' is '{cat_cfg.status}' and cannot be used for products."})
            
            rules = cat_cfg.compatibility_rules or {}
            compat_fields = [
                "headphone_jack_compatibility",
                "bluetooth_compatibility",
                "compatible_charging_interface",
                "wireless_charging_compatibility",
                "storage_expansion_compatibility",
                "memory_capacity",
                "compatible_watch_case_size"
            ]

            # Validate based on mode and specific values
            for f in compat_fields:
                val = getattr(self, f)
                if isinstance(val, str):
                    val = val.strip()
                    setattr(self, f, val)

                rule = rules.get(f)
                mode = rule.get("mode", "hidden") if rule else "hidden"

                if mode == "required":
                    if not val or val.strip() == "" or val == "Not Compatible":
                        raise ValidationError({f: f"{f.replace('_', ' ').title()} is required."})
                elif mode == "hidden":
                    pass
                elif mode == "conditional":
                    cond_field = rule.get("condition_field")
                    cond_values = rule.get("condition_values", [])
                    cond_val = getattr(self, cond_field, None)
                    if cond_field and cond_val in cond_values:
                        if not val or val.strip() == "" or val == "Not Compatible":
                            raise ValidationError({f: f"{f.replace('_', ' ').title()} is required when {cond_field.replace('_', ' ').title()} is {cond_val}."})

                if val:
                    if f == "compatible_charging_interface" or f == "headphone_jack_compatibility":
                        if val not in ["Not Compatible", "Type-C", "Lightning"]:
                            raise ValidationError({f: f"Invalid value for {f.replace('_', ' ').title()}."})

                    elif f == "bluetooth_compatibility":
                        if val not in ["Yes", "No"]:
                            raise ValidationError({f: f"Invalid value for {f.replace('_', ' ').title()}."})

                    elif f == "wireless_charging_compatibility":
                        w_vals = [w.strip() for w in val.split('+') if w.strip()]
                        if not w_vals:
                            raise ValidationError({f: "Wireless Charging Compatibility is required."})
                        if 'Not Compatible' in w_vals and len(w_vals) > 1:
                            raise ValidationError({f: "Not Compatible cannot be selected with any other value."})
                        for w in w_vals:
                            if w not in ['Not Compatible', 'MagSafe', 'Qi', 'Qi2']:
                                raise ValidationError({f: f"Invalid Wireless Charging value '{w}'."})
                        if 'Qi' in w_vals and ('MagSafe' in w_vals or 'Qi2' in w_vals):
                            raise ValidationError({f: "Qi cannot be selected with MagSafe or Qi2."})

                    elif f == "storage_expansion_compatibility":
                        if val not in ["Not Compatible", "microSDXC", "microSDHC"]:
                            raise ValidationError({f: f"Invalid value for {f.replace('_', ' ').title()}."})

                    elif f == "memory_capacity":
                        storage = getattr(self, "storage_expansion_compatibility", None)
                        if storage in ["microSDXC", "microSDHC"]:
                            if storage == "microSDXC":
                                allowed = ['32GB', '64GB', '128GB', '256GB', '512GB', '1TB', '2TB']
                            else:
                                allowed = ['16GB', '32GB', '64GB', '128GB', '256GB', '512GB', '1TB', '1.5TB']
                            if val not in allowed:
                                raise ValidationError({f: "Memory Capacity must match the allowed list for the selected storage type."})
                        else:
                            if val != "Not Compatible":
                                setattr(self, f, "Not Compatible")

                    elif f == "compatible_watch_case_size":
                        if val not in ["Not Compatible", "40mm", "41mm", "42mm", "44mm", "45mm", "46mm", "49mm"]:
                            raise ValidationError({f: f"Invalid value for {f.replace('_', ' ').title()}."})

            # Extra logical rules
            if self.product_category == "Headphones":
                jack = getattr(self, "headphone_jack_compatibility", None)
                bluetooth = getattr(self, "bluetooth_compatibility", None)
                if jack == "Not Compatible" and bluetooth == "No":
                    raise ValidationError({"headphone_jack_compatibility": "Headphones must support either Bluetooth or a compatible jack (cannot both be Not Compatible/No)."})

        # Resolve vendor
        from apps.tenant.models import Company
        vendor = Company.objects.filter(id=self.vendor_company_reference).first()
        is_map_enforced = vendor.map_pricing_enforced if vendor else False

        if is_map_enforced:
            is_active = (self.status == ProductStatus.ACTIVE or getattr(self, "selling_status", None) == "for_sale")
            if is_active and self.map_price is None:
                raise ValidationError({"map_price": "MAP Price is required when MAP pricing is enforced and the product is active."})

        # Pricing validation rules
        if self.vendor_wholesale_price_amount is not None:
            if self.vendor_wholesale_price_amount <= 0:
                raise ValidationError({"vendor_wholesale_price_amount": "Vendor Wholesale Price must be greater than zero."})

        if self.msrp is not None:
            if self.msrp <= 0:
                raise ValidationError({"msrp": "MSRP must be greater than zero."})

        if self.vendor_wholesale_price_amount is not None and self.msrp is not None:
            if self.vendor_wholesale_price_amount >= self.msrp:
                raise ValidationError({"vendor_wholesale_price_amount": "Vendor Wholesale Price must be lower than MSRP."})

        if self.map_price is not None:
            if self.map_price <= 0:
                raise ValidationError({"map_price": "MAP Price must be greater than zero if provided."})
            if self.msrp is not None and self.map_price > self.msrp:
                raise ValidationError({"map_price": "MAP Price must not be greater than MSRP."})
            if self.vendor_wholesale_price_amount is not None and self.map_price < self.vendor_wholesale_price_amount:
                raise ValidationError({"map_price": "MAP Price must be greater than or equal to Vendor Wholesale Price."})

            # Buyer Wholesale Price must be lower than MAP Price unless an approved pricing exception exists.
            if self.vendor_wholesale_price_amount is not None and self.msrp is not None:
                from decimal import Decimal
                buyer_wholesale_price = self.vendor_wholesale_price_amount + self.msrp * Decimal("0.14")
                from apps.pricing.services import check_pricing_exception_exists
                has_exception = check_pricing_exception_exists(self.vendor_company_reference, self.sku)
                if buyer_wholesale_price >= self.map_price and not has_exception:
                    raise ValidationError({"map_price": "Buyer Wholesale Price must be lower than MAP Price unless an approved pricing exception exists."})

        if self.sale_price is not None:
            if self.sale_price <= 0:
                raise ValidationError({"sale_price": "Sale Price must be greater than zero if provided."})
            if self.msrp is not None and self.sale_price >= self.msrp:
                raise ValidationError({"sale_price": "Sale Price must be less than MSRP."})
            if self.vendor_wholesale_price_amount is not None and self.sale_price < self.vendor_wholesale_price_amount:
                raise ValidationError({"sale_price": "Sale Price must be greater than or equal to Vendor Wholesale Price."})
            
            # Sale Price must not be lower than MAP Price unless an approved MAP exception exists.
            from apps.pricing.services import get_effective_map_price
            eff_map = get_effective_map_price(self.vendor_company_reference, self.sku, self.map_price)
            if eff_map is not None and self.sale_price < eff_map:
                raise ValidationError({"sale_price": "Sale Price must not be lower than MAP Price."})

        # State-based validation constraints for existing products
        if self.pk:
            actor_id = getattr(self, "_actor_id", None)
            is_admin = False
            if actor_id:
                from django.contrib.auth import get_user_model
                User = get_user_model()
                try:
                    user = User.objects.get(id=actor_id)
                    is_admin = getattr(user, "is_cixci_admin", False)
                except User.DoesNotExist:
                    pass
            else:
                # Default to admin to avoid blocking non-api actions (migrations, admin commands, tests without actor_id)
                is_admin = True

            if not is_admin:
                try:
                    orig = Product.objects.get(pk=self.pk)
                except Product.DoesNotExist:
                    orig = None

                if orig:
                    # 1. Identity & Brand cannot be edited by vendors in any state
                    if self.sku != orig.sku:
                        raise ValidationError({"sku": "SKU cannot be updated by vendors."})
                    if self.brand != orig.brand:
                        raise ValidationError({"brand": "Brand cannot be updated by vendors."})

                    # 2. Active & Tied/Sold state restrictions
                    if orig.status == ProductStatus.ACTIVE and orig.is_tied_to_activity:
                        restricted = {
                            "product_category": "Product Category",
                            "upc": "UPC",
                            "name": "Product Name",
                            "vendor_wholesale_price_amount": "Vendor Wholesale Price",
                            "msrp": "MSRP",
                            "map_price": "MAP Price",
                            "sale_price": "Sale Price",
                            "length": "Length",
                            "width": "Width",
                            "height": "Height",
                            "weight": "Weight",
                            "launch_date": "Launch Date",
                        }
                        for field, label in restricted.items():
                            if getattr(self, field) != getattr(orig, field):
                                raise ValidationError({field: f"Field '{label}' cannot be updated for active, sold products without CIXCI Admin approval."})

                        if self.status != orig.status and self.status in [ProductStatus.INACTIVE, ProductStatus.EOL]:
                            raise ValidationError({"status": "Status cannot be changed from Active to Inactive or EOL for sold products without CIXCI Admin approval."})

                        if self.release_date != orig.release_date:
                            if self.release_date and self.release_date > today_est:
                                raise ValidationError({"release_date": "Release Date cannot be changed to a future date for active, sold products without CIXCI Admin approval."})

                    # 3. Active & Not Yet Sold state restrictions
                    elif orig.status == ProductStatus.ACTIVE and not orig.is_tied_to_activity:
                        restricted = {
                            "product_category": "Product Category",
                            "upc": "UPC",
                            "name": "Product Name",
                            "vendor_wholesale_price_amount": "Vendor Wholesale Price",
                            "msrp": "MSRP",
                            "map_price": "MAP Price",
                            "sale_price": "Sale Price",
                        }
                        for field, label in restricted.items():
                            if getattr(self, field) != getattr(orig, field):
                                raise ValidationError({field: f"Field '{label}' cannot be updated for active products without CIXCI Admin approval."})

    def save(self, *args, actor_id=None, **kwargs):
        is_new = not self.pk or not Product.objects.filter(pk=self.pk).exists()
        self._actor_id = actor_id
        
        # Apply AI cleanup and generation rules
        colors_list = ["red", "orange", "yellow", "green", "blue", "purple", "pink", "brown", "black", "white", "silver", "multi-color"]
        if is_new:
            if self.name:
                self.name = " ".join(self.name.split())
            if self.description:
                for c in colors_list:
                    self.description = self.description.replace(f" {c} ", " ")
                    self.description = self.description.replace(f" {c.capitalize()} ", " ")
                    self.description = self.description.replace(f" {c.upper()} ", " ")
            if self.short_description:
                for c in colors_list:
                    self.short_description = self.short_description.replace(f" {c} ", " ")
                    self.short_description = self.short_description.replace(f" {c.capitalize()} ", " ")
                    self.short_description = self.short_description.replace(f" {c.upper()} ", " ")
            else:
                self.short_description = f"Premium {self.brand or ''} {self.product_category or 'accessory'} designed for optimal compatibility."
                for c in colors_list:
                    self.short_description = self.short_description.replace(f" {c} ", " ")
                    self.short_description = self.short_description.replace(f" {c.capitalize()} ", " ")
            
            if not self.meta_title and self.name:
                self.meta_title = f"{self.brand or ''} {self.name} | CIXCI"
                if len(self.meta_title) > 65:
                    self.meta_title = self.meta_title[:62] + "..."
                    
            if not self.meta_description and self.name:
                self.meta_description = f"Purchase the high-quality {self.name} ({self.sku}) in our {self.product_category or 'accessory'} section."
                if len(self.meta_description) > 160:
                    self.meta_description = self.meta_description[:157] + "..."
        else:
            try:
                old_self = Product.objects.get(pk=self.pk)
            except Product.DoesNotExist:
                old_self = None

            if old_self:
                content_fields = ["description", "short_description", "meta_title", "meta_description", "promo_information"]
                content_changed = False
                for f in content_fields:
                    if getattr(self, f) != getattr(old_self, f):
                        content_changed = True
                        break
                
                if content_changed:
                    if self.name:
                        self.name = " ".join(self.name.split())
                    if self.description:
                        for c in colors_list:
                            self.description = self.description.replace(f" {c} ", " ")
                            self.description = self.description.replace(f" {c.capitalize()} ", " ")
                            self.description = self.description.replace(f" {c.upper()} ", " ")
                    if self.short_description:
                        for c in colors_list:
                            self.short_description = self.short_description.replace(f" {c} ", " ")
                            self.short_description = self.short_description.replace(f" {c.capitalize()} ", " ")
                            self.short_description = self.short_description.replace(f" {c.upper()} ", " ")
                    
                    if not self.meta_title and self.name:
                        self.meta_title = f"{self.brand or ''} {self.name} | CIXCI"
                        if len(self.meta_title) > 65:
                            self.meta_title = self.meta_title[:62] + "..."
                            
                    if not self.meta_description and self.name:
                        self.meta_description = f"Purchase the high-quality {self.name} ({self.sku}) in our {self.product_category or 'accessory'} section."
                        if len(self.meta_description) > 160:
                            self.meta_description = self.meta_description[:157] + "..."
                    
                    # Transition to PENDING_REVIEW if status is ACTIVE
                    if self.status == ProductStatus.ACTIVE:
                        self.status = ProductStatus.PENDING_REVIEW

        self.clean()
        
        old_launch = None
        old_release = None
        old_status = None
        old_eol = None
        
        if not is_new:
            try:
                old_self = Product.objects.get(pk=self.pk)
                old_launch = old_self.launch_date
                old_release = old_self.release_date
                old_status = old_self.status
                old_eol = old_self.eol_date
            except Product.DoesNotExist:
                pass
            
        # Automated status transitions based on inventory
        import pytz
        est = pytz.timezone("US/Eastern")
        today_est = timezone.now().astimezone(est).date()
        
        is_auto_reactivation = False
        is_auto_stockout = False
        
        if self.status != ProductStatus.EOL:
            if self.inventory_level is not None and self.inventory_level == 0:
                if self.status != ProductStatus.OUT_OF_STOCK:
                    self.status = ProductStatus.OUT_OF_STOCK
                    is_auto_stockout = True
            elif self.inventory_level is not None and self.inventory_level > 0:
                if self.status == ProductStatus.OUT_OF_STOCK:
                    # Required checks before auto-reactivation:
                    has_price = self.vendor_wholesale_price_amount is not None and self.vendor_wholesale_price_amount >= 0
                    has_image = bool(self.primary_image_reference or (isinstance(self.media_references, list) and len(self.media_references) > 0))
                    
                    has_compat = True
                    if self.pk:
                        has_compat = self.compatibility_assertions.filter(is_compatible=True).exists()
                    
                    if self.launch_date and self.launch_date <= today_est and has_price and has_image and has_compat:
                        self.status = ProductStatus.ACTIVE
                        is_auto_reactivation = True

        from django.core.exceptions import ValidationError
        if not is_new and old_status:
            # EOL products cannot be changed to Out of Stock without CIXCI Admin approval
            if old_status == ProductStatus.EOL and self.status == ProductStatus.OUT_OF_STOCK:
                is_admin = False
                if actor_id:
                    from django.contrib.auth import get_user_model
                    User = get_user_model()
                    try:
                        user = User.objects.get(id=actor_id)
                        if user.is_cixci_admin:
                            is_admin = True
                    except Exception:
                        pass
                if not is_admin:
                    raise ValidationError({"status": "EOL products cannot be changed to Out of Stock without CIXCI Admin approval."})

        super().save(*args, **kwargs)

        # Run compatibility auto-mapping
        try:
            from apps.catalog.compatibility_engine import run_compatibility_automapping
            run_compatibility_automapping(self)
        except Exception:
            pass
        
        # Log changes
        changes = []
        if is_new:
            changes.append(f"Product created with Status={self.status}, Launch Date={self.launch_date}, Release Date={self.release_date}, EOL Date={self.eol_date}")
        else:
            if old_launch != self.launch_date:
                changes.append(f"Launch Date changed from {old_launch} to {self.launch_date}")
            if old_release != self.release_date:
                changes.append(f"Release Date changed from {old_release} to {self.release_date}")
            if old_status != self.status:
                if is_auto_stockout:
                    changes.append(f"Product Status changed from {old_status} to {self.status} due to Inventory Level reaching zero (System Automation)")
                elif is_auto_reactivation:
                    changes.append(f"Product Status changed from {old_status} to {self.status} due to inventory replenishment (System Automation)")
                else:
                    changes.append(f"Product Status changed from {old_status} to {self.status}")
            if old_eol != self.eol_date:
                changes.append(f"EOL Date changed from {old_eol} to {self.eol_date}")
                
        if changes:
            from apps.catalog.services import log_catalog_audit
            log_catalog_audit(
                event_code="catalog.product.updated" if not is_new else "catalog.product.created",
                description=" | ".join(changes),
                product_id=self.id,
                actor_id=actor_id
            )
            
            # Recalculate projections if status changed
            status_changed = any("Product Status changed" in c for c in changes) or is_new
            if status_changed:
                try:
                    from apps.catalog.services import trigger_catalog_recalculation_for_product
                    trigger_catalog_recalculation_for_product(self.id)
                except Exception as e:
                    pass




# ─── Product Compatibility Assertion ──────────────────────────────────────────

class ProductCompatibilityAssertion(models.Model):
    """
    Product Catalog owns compatibility assertions.
    These reference Device Catalog feature evidence (read-only) but are Product Catalog entities.

    Cross-module boundary: Device Catalog owns feature TRUTH;
    Product Catalog owns compatibility ASSERTION derived from that truth.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name="compatibility_assertions")
    # Device Catalog read-only reference
    device_reference = models.UUIDField(db_index=True, help_text="Device ID from Device Catalog")
    capability_evidence_snapshot_reference = models.UUIDField(
        null=True, blank=True,
        help_text="DeviceCapabilityEvidence ID at time of assertion — snapshot reference only"
    )
    is_compatible = models.BooleanField()
    compatibility_basis = models.CharField(
        max_length=30,
        help_text="feature_evidence | manual_assertion | imported | review_required"
    )
    notes = models.TextField(blank=True)
    asserted_at = models.DateTimeField(default=timezone.now)
    asserted_by_reference = models.UUIDField(null=True, blank=True)

    # Tracker/Exclusion/Lock fields
    is_excluded = models.BooleanField(default=False)
    exclusion_type = models.CharField(max_length=30, blank=True, null=True) # "vendor" | "admin"
    is_locked = models.BooleanField(default=False)

    # Recommended Accessory Device Compatibility fields
    vendor_company_reference = models.UUIDField(null=True, blank=True)
    sku = models.CharField(max_length=100, blank=True)
    device_status_at_mapping = models.CharField(max_length=50, blank=True, null=True)
    device_launch_date_at_mapping = models.DateField(null=True, blank=True)
    match_source = models.CharField(max_length=50, default="Auto-Mapped")
    match_reason = models.TextField(blank=True)
    match_status = models.CharField(max_length=50, default="Active")
    exclusion_source = models.CharField(max_length=50, blank=True, null=True)
    exclusion_reason = models.TextField(blank=True, null=True)
    created_by = models.UUIDField(null=True, blank=True)
    updated_by = models.UUIDField(null=True, blank=True)
    reviewed_by = models.UUIDField(null=True, blank=True)
    reviewed_date = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "catalog_product_compatibility"
        unique_together = [("product", "device_reference")]


# ─── Buyer-Scoped Compatibility Projection (PR #104 surface) ─────────────────

class BuyerScopedCompatibilityProjection(models.Model):
    """
    Buyer-specific view of which products are compatible with their My Devices portfolio.

    Product Catalog owns this projection.
    Device Catalog owns the source portfolio data (BuyerDevicePortfolioSnapshot).

    Boundary (verbatim from spec.md):
      "Device Catalog owns the buyer's My Devices portfolio source records and portfolio
       change history; Product Catalog owns the buyer-scoped compatibility projection
       derived from that portfolio and the resulting accessory visibility, eligibility,
       and impact decisions."

    Workflow 4: recalculated on device-catalog.my-devices.portfolio-changed event.
    Workflow 11: empty portfolio is valid — produces projection with empty compatible set.
    Workflow 14: notification intent on projection change.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Buyer-scope triad (required)
    buyer_reference = models.UUIDField(db_index=True)
    company_scope_reference = models.UUIDField(db_index=True)
    buyer_entity_reference = models.UUIDField(db_index=True)

    # Source reference (Device Catalog snapshot — read-only)
    portfolio_snapshot_reference = models.UUIDField(
        help_text="BuyerDevicePortfolioSnapshot ID from Device Catalog (read-only reference)"
    )

    # Projection content
    status = models.CharField(max_length=20, choices=ProjectionStatus.choices, default=ProjectionStatus.RECALCULATING)
    compatible_product_ids = models.JSONField(default=list)
    compatible_product_count = models.PositiveIntegerField(default=0)
    incompatible_product_ids = models.JSONField(default=list)

    # Recalculation metadata
    last_recalculated_at = models.DateTimeField(null=True, blank=True)
    recalculation_trigger = models.CharField(
        max_length=100, blank=True,
        help_text="e.g. portfolio_changed, manual_refresh, initial_creation"
    )
    recalculation_duration_ms = models.PositiveIntegerField(null=True, blank=True)

    # Review state
    review_required_reason = models.TextField(blank=True)

    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "catalog_buyer_compatibility_projection"
        unique_together = [("buyer_reference", "company_scope_reference", "buyer_entity_reference")]
        indexes = [
            models.Index(fields=["buyer_reference", "status"]),
        ]

    def __str__(self):
        return f"Projection(buyer={self.buyer_reference}, status={self.status}, count={self.compatible_product_count})"


# ─── Buyer Product Export Job (PR #104) ───────────────────────────────────────

class BuyerProductExportJob(models.Model):
    """
    PR #104: Buyer-scoped export session.
    References a BuyerDevicePortfolioSnapshot from Device Catalog.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Buyer-scope triad
    buyer_reference = models.UUIDField(db_index=True)
    company_scope_reference = models.UUIDField(db_index=True)
    buyer_entity_reference = models.UUIDField(db_index=True)

    status = models.CharField(max_length=20, choices=ExportJobStatus.choices, default=ExportJobStatus.PENDING)
    # Device Catalog snapshot reference (read-only)
    portfolio_snapshot_reference = models.UUIDField(
        null=True, blank=True,
        help_text="BuyerDevicePortfolioSnapshot ID used as basis for this export"
    )
    # Projection reference
    compatibility_projection_reference = models.UUIDField(null=True, blank=True)

    # Job configuration
    include_incompatible = models.BooleanField(default=False)
    format = models.CharField(max_length=20, default="csv", help_text="csv | json | xlsx")

    # Output
    output_file_reference = models.UUIDField(null=True, blank=True)
    product_count = models.PositiveIntegerField(null=True, blank=True)

    # Audit
    requested_by = models.UUIDField()
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "catalog_buyer_export_job"
        indexes = [
            models.Index(fields=["buyer_reference", "status", "created_at"]),
        ]


class BuyerProductExportSelectionSnapshot(models.Model):
    """
    Frozen snapshot of the product selection for an export job.
    Immutable after creation.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    export_job = models.OneToOneField(
        BuyerProductExportJob, on_delete=models.PROTECT, related_name="selection_snapshot"
    )
    product_ids = models.JSONField(help_text="Frozen list of Product IDs at export time")
    portfolio_snapshot_reference = models.UUIDField()
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "catalog_export_selection_snapshot"

    def save(self, *args, **kwargs):
        if self.pk and BuyerProductExportSelectionSnapshot.objects.filter(pk=self.pk).exists():
            raise ValueError("BuyerProductExportSelectionSnapshot is immutable after creation.")
        super().save(*args, **kwargs)


class DynamicDropdownConfig(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    field_name = models.CharField(
        max_length=100, db_index=True,
        help_text="e.g. 'color', 'product_type', 'product_category', 'company_status', 'company_type'"
    )
    value = models.CharField(max_length=255)
    display_name = models.CharField(max_length=255)
    created_at = models.DateTimeField(default=timezone.now)
    status = models.CharField(max_length=20, default="setup_required")
    compatibility_mode = models.CharField(max_length=20, default="feature_based")
    eligible_device_types = models.JSONField(default=list, blank=True)
    match_logic = models.CharField(max_length=50, default="OR")
    accessory_fields = models.JSONField(default=list, blank=True)
    compatibility_rules = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = "catalog_dynamic_dropdown_config"
        unique_together = [("field_name", "value")]

    def __str__(self):
        return f"Dropdown({self.field_name}: {self.display_name})"

