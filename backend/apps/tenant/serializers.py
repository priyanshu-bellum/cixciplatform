"""Tenant app serializers."""
from rest_framework import serializers
from .models import Company, CompanyEntity, User, CompanyRelationship, Capability


class CapabilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = Capability
        fields = ["id", "code", "description", "module", "is_active"]


class CompanySerializer(serializers.ModelSerializer):
    capabilities = CapabilitySerializer(many=True, read_only=True)

    class Meta:
        model = Company
        fields = [
            "id", "name", "display_name", "company_type", "status", "parent_company",
            "slug", "country_code", "region_code", "allowed_channels",
            "external_id", "website", "business_email_domain",
            "primary_contact_name", "primary_contact_email", "phone_number", "address_line1", "address_line2",
            "is_parent", "approved_regions", "capabilities", "created_at", "updated_at",
            "allow_personal_email_exception", "buyer_pricing_mode", "commission_percentage",
            "map_pricing_enforced", "return_address", "order_digest_emails",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    allow_personal_email_exception = serializers.BooleanField(default=False, write_only=True, required=False)

    def validate_website(self, value):
        if value:
            if not (value.startswith("http://") or value.startswith("https://")):
                raise serializers.ValidationError("Enter a valid website URL starting with http:// or https://")
        return value

    def validate_business_email_domain(self, value):
        if value:
            personal_domains = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "aol.com"]
            domain = value.strip().lower().replace("@", "")
            if domain in personal_domains:
                request = self.context.get("request")
                if request and request.data.get("allow_personal_email_exception") is True:
                    return domain
                raise serializers.ValidationError("Personal email domains are not allowed without explicit administrator approval.")
            return domain
        return value

    def validate(self, attrs):
        status = attrs.get("status") or (self.instance.status if self.instance else None)
        if status == "active":
            # Check required fields
            fields_to_check = [
                "display_name", "website", "primary_contact_name", 
                "primary_contact_email", "phone_number", "address_line1"
            ]
            for f in fields_to_check:
                val = attrs.get(f) or (getattr(self.instance, f) if self.instance else None)
                if not val:
                    raise serializers.ValidationError(
                        f"Company cannot be activated without a valid {f}."
                    )
            
            # Check capabilities
            if self.instance:
                has_capabilities = self.instance.capabilities.exists()
            else:
                has_capabilities = False
            
            if not has_capabilities:
                raise serializers.ValidationError(
                    "Company cannot be activated without assigned capabilities."
                )

            # Check for active admin
            if self.instance:
                active_user_exists = User.objects.filter(
                    entity__company=self.instance,
                    is_active=True
                ).exists()
                if not active_user_exists:
                    raise serializers.ValidationError(
                        "Company cannot be activated without an active, onboarded administrator."
                    )
            else:
                raise serializers.ValidationError(
                    "Company cannot be activated without an active, onboarded administrator."
                )
        return attrs

    def create(self, validated_data):
        validated_data.pop("allow_personal_email_exception", None)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data.pop("allow_personal_email_exception", None)
        return super().update(instance, validated_data)


class CompanyEntitySerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source="company.name", read_only=True)

    class Meta:
        model = CompanyEntity
        fields = [
            "id", "company", "company_name", "name", "status",
            "allowed_channels_override", "country_code", "region_code",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class UserSerializer(serializers.ModelSerializer):
    company_id = serializers.UUIDField(source="entity.company_id", read_only=True)
    company_name = serializers.CharField(source="entity.company.name", read_only=True)
    company_type = serializers.CharField(source="entity.company.company_type", read_only=True)
    entity_name = serializers.CharField(source="entity.name", read_only=True)
    capabilities = CapabilitySerializer(many=True, read_only=True)

    class Meta:
        model = User
        fields = [
            "id", "email", "first_name", "last_name", "full_name",
            "entity", "entity_name", "company_id", "company_name", "company_type",
            "is_active", "is_cixci_admin", "capabilities",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "full_name"]

    def validate(self, attrs):
        is_active = attrs.get("is_active")
        if is_active is False and self.instance and self.instance.is_active:
            if not self.instance.is_cixci_admin and self.instance.company:
                if self.instance.capabilities.filter(code="tenant.company.update", is_active=True).exists():
                    other_active_admins = User.objects.filter(
                        entity__company=self.instance.company,
                        is_active=True,
                        capabilities__code="tenant.company.update"
                    ).exclude(id=self.instance.id)
                    if not other_active_admins.exists():
                        raise serializers.ValidationError("Cannot deactivate or remove the last active administrator for the company.")
        return attrs


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8, required=False, allow_blank=True)
    is_active = serializers.BooleanField(required=False, default=False)

    class Meta:
        model = User
        fields = ["email", "password", "first_name", "last_name", "entity", "is_active"]

    def create(self, validated_data):
        password = validated_data.pop("password", None)
        is_active = validated_data.pop("is_active", False)

        # If password is provided and is_active was not explicitly specified in input, activate user
        if password and "is_active" not in self.initial_data:
            is_active = True

        if not password:
            from django.contrib.auth.models import BaseUserManager
            password = BaseUserManager().make_random_password(length=16)
        user = User.objects.create_user(password=password, **validated_data)
        user.is_active = is_active
        user.save()

        # Send onboarding invite email only if user is not active
        if not is_active:
            from apps.tenant.services import send_onboarding_invite
            send_onboarding_invite(user)

        return user


class CompanyRelationshipSerializer(serializers.ModelSerializer):
    buyer_company_name = serializers.CharField(source="buyer_company.name", read_only=True)
    vendor_company_name = serializers.CharField(source="vendor_company.name", read_only=True)

    class Meta:
        model = CompanyRelationship
        fields = [
            "id", "buyer_company", "buyer_company_name",
            "vendor_company", "vendor_company_name",
            "status", "eligible_product_types", "eligible_regions",
            "created_at", "updated_at", "approved_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "approved_at"]


from .models import ChildOnboardingRequest, OnboardingRequestStatus

class ChildOnboardingRequestSerializer(serializers.ModelSerializer):
    parent_company_name = serializers.CharField(source="parent_company.name", read_only=True)
    requester_name = serializers.CharField(source="requester.full_name", read_only=True)

    class Meta:
        model = ChildOnboardingRequest
        fields = [
            "id", "parent_company", "parent_company_name", "requester", "requester_name",
            "company_name", "brand_name", "website", "region", "primary_contact",
            "business_email_domain", "commission_percentage", "status", "rejection_reason",
            "created_at", "updated_at", "decision_by", "decision_timestamp"
        ]
        read_only_fields = [
            "id", "parent_company", "requester", "status", "created_at", "updated_at",
            "decision_by", "decision_timestamp"
        ]

    def validate_website(self, value):
        if value:
            if not (value.startswith("http://") or value.startswith("https://")):
                raise serializers.ValidationError("Enter a valid URL starting with http:// or https://")
        return value

    def validate_business_email_domain(self, value):
        if value:
            personal_domains = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "aol.com"]
            domain = value.strip().lower().replace("@", "")
            if domain in personal_domains:
                request = self.context.get("request")
                if request and request.data.get("allow_personal_email_exception") is True:
                    return domain
                raise serializers.ValidationError("Personal email domains are not allowed without explicit administrator approval.")
            return domain
        return value
