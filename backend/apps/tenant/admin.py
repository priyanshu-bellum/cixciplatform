"""Tenant app admin registration."""
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import Company, CompanyEntity, User, CompanyRelationship, Capability


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ["name", "company_type", "status", "country_code", "created_at"]
    list_filter = ["company_type", "status"]
    search_fields = ["name", "slug"]


@admin.register(CompanyEntity)
class CompanyEntityAdmin(admin.ModelAdmin):
    list_display = ["name", "company", "status", "country_code"]
    list_filter = ["status"]
    search_fields = ["name", "company__name"]


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ["email", "full_name", "entity", "is_cixci_admin", "is_active"]
    list_filter = ["is_active", "is_cixci_admin"]
    search_fields = ["email", "first_name", "last_name"]
    ordering = ["email"]
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Personal", {"fields": ("first_name", "last_name")}),
        ("Scope", {"fields": ("entity", "capabilities")}),
        ("Permissions", {"fields": ("is_active", "is_staff", "is_cixci_admin", "is_superuser")}),
    )
    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": ("email", "password1", "password2", "entity"),
        }),
    )
    filter_horizontal = ["capabilities", "groups", "user_permissions"]


@admin.register(Capability)
class CapabilityAdmin(admin.ModelAdmin):
    list_display = ["code", "module", "is_active"]
    list_filter = ["module", "is_active"]
    search_fields = ["code", "description"]


@admin.register(CompanyRelationship)
class CompanyRelationshipAdmin(admin.ModelAdmin):
    list_display = ["buyer_company", "vendor_company", "status", "approved_at"]
    list_filter = ["status"]
    search_fields = ["buyer_company__name", "vendor_company__name"]
