"""
Tenant & Company Model — Core Models

Architecture rules enforced here:
- check_access() is the ONLY authority gate across the platform
- Role bundles are composites for documentation only; never used as auth source of truth
- Buyer-scope triad (buyer_reference, company_scope_reference, buyer_entity_reference)
  is defined here and mixed into every buyer-scoped entity downstream
- act-on-behalf uses actor_reference vs service_trigger_reference (never collapsed)
"""
import uuid
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone
from django.core.exceptions import ValidationError


# ──────────────────────────────────────────────────────────────────────────────
# Enumerations
# ──────────────────────────────────────────────────────────────────────────────

class CompanyType(models.TextChoices):
    CIXCI_INTERNAL = "cixci_internal", "CIXCI Internal"
    BUYER = "buyer", "Buyer"
    VENDOR = "vendor", "Vendor (Accessory)"
    MANUFACTURER = "manufacturer", "Device Manufacturer"
    PARTNER = "partner", "Partner"
    DEVICE_DISTRIBUTOR = "device_distributor", "Device Distributor"


class CompanyStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    PENDING_SETUP = "pending_setup", "Pending Setup"
    ACTIVE = "active", "Active"
    SUSPENDED = "suspended", "Suspended"
    ARCHIVED = "archived", "Archived"
    RETIRED = "retired", "Retired"


class EntityStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    ACTIVE = "active", "Active"
    SUSPENDED = "suspended", "Suspended"
    RETIRED = "retired", "Retired"


class ChannelType(models.TextChoices):
    ONLINE_DTC = "online_dtc", "Online / Direct-to-Consumer"
    BULK_PO = "bulk_po", "Bulk Purchase Order"
    OWNED_CHANNEL = "owned_channel", "Owned Channel / Kaseory"
    BUYER_STOREFRONT = "buyer_storefront", "Buyer Storefront"
    MARKETPLACE = "marketplace", "Marketplace (placeholder)"
    RETAIL_POS = "retail_pos", "Retail POS (placeholder)"
    PROMOTIONAL = "promotional", "Promotional Campaign (placeholder)"
    BUYER_CONTRACT = "buyer_contract", "Buyer-Specific Contract (placeholder)"


class BuyerPricingMode(models.TextChoices):
    STANDARD = "standard", "Standard Buyer Commission"
    NO_COMMISSION = "no_commission", "No Buyer Commission"
    CUSTOM = "custom", "Custom Buyer Commission"


# ──────────────────────────────────────────────────────────────────────────────
# Company (Tenant Root)
# ──────────────────────────────────────────────────────────────────────────────

class Company(models.Model):
    """
    The tenant root. Everything in the platform is scoped to a Company.
    Parent companies own child entities (CompanyEntity).
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    company_type = models.CharField(max_length=30, choices=CompanyType.choices)
    status = models.CharField(max_length=20, choices=CompanyStatus.choices, default=CompanyStatus.DRAFT)

    # Parent/child hierarchy support
    parent_company = models.ForeignKey(
        "self", null=True, blank=True, on_delete=models.PROTECT,
        related_name="child_companies"
    )

    # Commission settings
    buyer_pricing_mode = models.CharField(
        max_length=30,
        choices=BuyerPricingMode.choices,
        default=BuyerPricingMode.STANDARD,
        help_text="Determines how buyer-side commission is calculated"
    )
    commission_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=14.00,
        help_text="Custom or standard commission rate in percent"
    )

    # Identity
    external_id = models.CharField(max_length=255, blank=True, help_text="External system ID reference")
    slug = models.SlugField(max_length=255, unique=True)
    display_name = models.CharField(max_length=255, blank=True)
    website = models.URLField(max_length=255, blank=True)
    business_email_domain = models.CharField(max_length=255, blank=True)
    primary_contact_name = models.CharField(max_length=255, blank=True)
    primary_contact_email = models.EmailField(max_length=255, blank=True)
    phone_number = models.CharField(max_length=50, blank=True)
    address_line1 = models.CharField(max_length=255, blank=True)
    address_line2 = models.CharField(max_length=255, blank=True)
    is_parent = models.BooleanField(default=False)

    # Geography / region
    country_code = models.CharField(max_length=3, blank=True)
    region_code = models.CharField(max_length=50, blank=True)
    approved_regions = models.JSONField(default=list, blank=True)

    # Channel eligibility (Tenant Company owns this)
    allowed_channels = models.JSONField(default=list, blank=True, help_text="List of ChannelType values this company can access")

    # Capabilities assigned to the Company
    capabilities = models.ManyToManyField("Capability", blank=True, related_name="companies")

    # MAP Pricing
    map_pricing_enforced = models.BooleanField(default=False)

    # Return Address
    return_address = models.TextField(blank=True, help_text="Return Address for items")

    # Order Digest Emails
    order_digest_emails = models.JSONField(default=list, blank=True, help_text="List of email addresses for automated order digests")

    # Audit
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.UUIDField(null=True, blank=True, help_text="Actor reference")

    class Meta:
        db_table = "tenant_company"
        verbose_name = "Company"
        verbose_name_plural = "Companies"
        indexes = [
            models.Index(fields=["company_type", "status"]),
            models.Index(fields=["parent_company"]),
        ]

    def clean(self):
        super().clean()
        if self.map_pricing_enforced and self.company_type != CompanyType.VENDOR:
            raise ValidationError({"map_pricing_enforced": "MAP Pricing Enforced can only be enabled for Vendor companies."})
        if self.parent_company:
            if self.parent_company.parent_company:
                raise ValidationError("Hierarchy cannot exceed 2 levels (parent and child only).")
            if self.is_parent:
                raise ValidationError("A child company cannot be marked as a parent company.")
        if self.is_parent and self.parent_company:
            raise ValidationError("A company cannot be both a parent and a child.")

    def save(self, *args, **kwargs):
        self.full_clean()
        is_new = self._state.adding
        super().save(*args, **kwargs)
        if is_new:
            CompanyEntity.objects.create(
                company=self,
                name="HQ Entity",
                status=EntityStatus.ACTIVE,
                country_code=self.country_code or 'USA',
                region_code=self.region_code or '',
            )

    def __str__(self):
        return f"{self.name} ({self.company_type})"


# ──────────────────────────────────────────────────────────────────────────────
# CompanyEntity (Child Unit / Buyer Entity / Vendor Brand)
# ──────────────────────────────────────────────────────────────────────────────

class CompanyEntity(models.Model):
    """
    A child unit of a Company. Buyers may have multiple entities (stores/regions).
    Vendors may have multiple brand child entities.

    The buyer-scope triad references this as buyer_entity_reference.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.PROTECT, related_name="entities")
    name = models.CharField(max_length=255)
    status = models.CharField(max_length=20, choices=EntityStatus.choices, default=EntityStatus.DRAFT)

    # Entity-level channel eligibility override (inherits from Company by default)
    allowed_channels_override = models.JSONField(
        null=True, blank=True,
        help_text="If set, overrides company-level channel eligibility for this entity"
    )

    # Geography
    country_code = models.CharField(max_length=3, blank=True)
    region_code = models.CharField(max_length=50, blank=True)

    # Audit
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "tenant_company_entity"
        verbose_name = "Company Entity"
        verbose_name_plural = "Company Entities"
        indexes = [
            models.Index(fields=["company", "status"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.company.name})"


# ──────────────────────────────────────────────────────────────────────────────
# Capability (Granular permission atom)
# ──────────────────────────────────────────────────────────────────────────────

class Capability(models.Model):
    """
    Granular permission atom. check_access() resolves to capabilities.
    Role bundles are composites of capabilities for documentation only.

    Naming convention: <module>.<resource>.<action>
    Example: catalog.product.import, devices.feature.assign, pricing.snapshot.read
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=150, unique=True)
    description = models.TextField(blank=True)
    module = models.CharField(max_length=50, help_text="Owning module (e.g. catalog, devices, pricing)")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "tenant_capability"
        verbose_name = "Capability"
        verbose_name_plural = "Capabilities"
        ordering = ["module", "code"]

    def __str__(self):
        return self.code


# ──────────────────────────────────────────────────────────────────────────────
# User Manager
# ──────────────────────────────────────────────────────────────────────────────

class UserManager(BaseUserManager):
    def create_user(self, email, entity, password=None, **extra_fields):
        if not email:
            raise ValueError("Users must have an email address")
        email = self.normalize_email(email)
        user = self.model(email=email, entity=entity, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        """Create a CIXCI System Admin (not scoped to a specific company entity)."""
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_cixci_admin", True)
        user = self.model(email=self.normalize_email(email), **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user


# ──────────────────────────────────────────────────────────────────────────────
# User
# ──────────────────────────────────────────────────────────────────────────────

class User(AbstractBaseUser, PermissionsMixin):
    """
    Platform user. Belongs to a CompanyEntity.
    Authorization is resolved via check_access() — never via role field directly.

    is_cixci_admin = True: CIXCI System Admin (platform-wide access).
    All other users are scoped to their entity/company.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)

    # Company scope (null only for CIXCI System Admins)
    entity = models.ForeignKey(
        CompanyEntity, null=True, blank=True,
        on_delete=models.PROTECT, related_name="users"
    )

    # Identity
    first_name = models.CharField(max_length=100, blank=True)
    last_name = models.CharField(max_length=100, blank=True)

    # Capabilities (source of truth for authorization)
    capabilities = models.ManyToManyField(Capability, blank=True, related_name="users")

    # Flags
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)       # Django admin access
    is_cixci_admin = models.BooleanField(default=False) # CIXCI System Admin

    # Audit
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    last_login_at = models.DateTimeField(null=True, blank=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    objects = UserManager()

    class Meta:
        db_table = "tenant_user"
        verbose_name = "User"
        verbose_name_plural = "Users"
        indexes = [
            models.Index(fields=["entity", "is_active"]),
            models.Index(fields=["is_cixci_admin"]),
        ]

    def __str__(self):
        return self.email

    @property
    def company(self):
        """Convenience accessor — resolves to the user's parent company."""
        return self.entity.company if self.entity else None

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}".strip() or self.email


# ──────────────────────────────────────────────────────────────────────────────
# CompanyRelationship (Buyer ↔ Vendor relationship eligibility)
# ──────────────────────────────────────────────────────────────────────────────

class RelationshipStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    ACTIVE = "active", "Active"
    SUSPENDED = "suspended", "Suspended"
    TERMINATED = "terminated", "Terminated"


class CompanyRelationship(models.Model):
    """
    Explicit buyer ↔ vendor (or buyer ↔ manufacturer) relationship.
    Tenant Company owns relationship eligibility. Other modules consume this — never re-derive it.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    buyer_company = models.ForeignKey(
        Company, on_delete=models.PROTECT, related_name="buyer_relationships"
    )
    vendor_company = models.ForeignKey(
        Company, on_delete=models.PROTECT, related_name="vendor_relationships"
    )
    status = models.CharField(max_length=20, choices=RelationshipStatus.choices, default=RelationshipStatus.PENDING)

    # Product-type eligibility scope
    eligible_product_types = models.JSONField(default=list)

    # Geography
    eligible_regions = models.JSONField(default=list)

    # Audit
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    approved_by = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.SET_NULL,
        related_name="approved_relationships"
    )

    class Meta:
        db_table = "tenant_company_relationship"
        unique_together = [("buyer_company", "vendor_company")]
        indexes = [
            models.Index(fields=["buyer_company", "status"]),
            models.Index(fields=["vendor_company", "status"]),
        ]

    def __str__(self):
        return f"{self.buyer_company} ↔ {self.vendor_company} ({self.status})"


# ──────────────────────────────────────────────────────────────────────────────
# Child Onboarding Request
# ──────────────────────────────────────────────────────────────────────────────

class OnboardingRequestStatus(models.TextChoices):
    SUBMITTED = "submitted", "Submitted"
    APPROVED = "approved", "Approved"
    REJECTED = "rejected", "Rejected"
    WITHDRAWN = "withdrawn", "Withdrawn"
    EXPIRED = "expired", "Expired"


class ChildOnboardingRequest(models.Model):
    """
    CIXCI-owned lifecycle/state spine for parent-requested child onboarding.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    parent_company = models.ForeignKey(
        Company, on_delete=models.PROTECT, related_name="child_onboarding_requests"
    )
    requester = models.ForeignKey(
        "User", on_delete=models.PROTECT, related_name="submitted_onboarding_requests"
    )
    company_name = models.CharField(max_length=255)
    brand_name = models.CharField(max_length=255)
    website = models.URLField(max_length=255, blank=True)
    region = models.CharField(max_length=50)
    primary_contact = models.CharField(max_length=255)
    business_email_domain = models.CharField(max_length=255)
    commission_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=14.00,
        help_text="Requested/assigned buyer-side commission rate in percent"
    )
    status = models.CharField(
        max_length=20,
        choices=OnboardingRequestStatus.choices,
        default=OnboardingRequestStatus.SUBMITTED
    )
    rejection_reason = models.TextField(blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    decision_by = models.ForeignKey(
        "User", null=True, blank=True, on_delete=models.SET_NULL,
        related_name="decided_onboarding_requests"
    )
    decision_timestamp = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "tenant_child_onboarding_request"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Request for {self.company_name} ({self.status})"
