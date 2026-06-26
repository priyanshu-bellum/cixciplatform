import os
import sys
import django

sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.apps import apps
from apps.tenant.models import User, Capability

# Collect all capabilities
capabilities = set()

# Seed standard capabilities from tests/conftest.py
standard_caps = [
    "devices.device.list", "devices.device.read", "devices.device.import",
    "devices.device.manage",
    "devices.type.list", "devices.type.read", "devices.type.manage",
    "devices.manufacturer.list", "devices.manufacturer.read", "devices.manufacturer.manage",
    "devices.feature.list", "devices.feature.read", "devices.feature.manage",
    "devices.dqe.list", "devices.dqe.read", "devices.dqe.create", "devices.dqe.resolve",
    "devices.portfolio.self_modify",
    "catalog.product.list", "catalog.product.read", "catalog.product.create",
    "catalog.product.update", "catalog.product.delete",
    "catalog.product.manage_selling",
    "tenant.company.list", "tenant.company.read",
    "tenant.entity.list", "tenant.entity.read",
    "tenant.user.list", "tenant.user.read",
    "tenant.relationship.list", "tenant.relationship.read", "tenant.relationship.create",
    "tenant.relationship.update", "tenant.relationship.approve",
    "media.asset.list", "media.asset.read", "media.asset.upload", "media.asset.manage",
    "analytics.metrics.list", "analytics.metrics.read",
    "analytics.summary.read",
    "integration.connection.list", "integration.connection.read", "integration.connection.manage",
    "integration.action.list", "integration.action.read",
    "procurement.po.list", "procurement.po.read", "procurement.po.create",
    "procurement.po.update", "procurement.po.approve", "procurement.po.manage",
    "launch.event.list", "launch.event.read", "launch.event.create",
    "launch.event.update", "launch.event.manage",
]
capabilities.update(standard_caps)

# Walk importable viewsets in apps
import importlib
import pkgutil
import apps as apps_pkg
from rest_framework.viewsets import ViewSetMixin

for _, name, ispkg in pkgutil.walk_packages(apps_pkg.__path__, apps_pkg.__name__ + '.'):
    try:
        mod = importlib.import_module(name)
        for obj_name in dir(mod):
            obj = getattr(mod, obj_name)
            if isinstance(obj, type) and issubclass(obj, ViewSetMixin) and obj != ViewSetMixin:
                cmap = getattr(obj, 'action_capability_map', {})
                if cmap:
                    for cap in cmap.values():
                        if cap:
                            capabilities.add(cap)
                rcap = getattr(obj, 'required_capability', None)
                if rcap:
                    capabilities.add(rcap)
    except Exception as e:
        pass

# Filter out None values just in case
capabilities = {c for c in capabilities if c is not None}

print("Total capabilities found:", len(capabilities))

# Create them in the database
for cap_code in sorted(capabilities):
    module_name = cap_code.split('.')[0]
    cap, created = Capability.objects.get_or_create(
        code=cap_code,
        defaults={'module': module_name, 'is_active': True}
    )
    if created:
        print(f"Created capability: {cap_code}")

# Assign capabilities to all users based on company type
buyer_modules = ['devices', 'catalog', 'pricing', 'invoicing', 'procurement', 'tenant', 'media', 'analytics', 'integration', 'notifications', 'launch']
buyer_caps = [c for c in capabilities if c.split('.')[0] in buyer_modules]

vendor_modules = ['catalog', 'routing', 'fulfillment', 'invoicing', 'tenant', 'media', 'notifications']
vendor_caps = [c for c in capabilities if c.split('.')[0] in vendor_modules]
# Explicitly add read-only device capabilities for mapping compatibility
for c in capabilities:
    if c in ["devices.device.list", "devices.device.read"]:
        vendor_caps.append(c)

for user in User.objects.all():
    if not user.entity or not user.entity.company:
        continue
        
    company_type = user.entity.company.company_type
    if company_type == 'buyer':
        user.capabilities.clear()
        for cap_code in buyer_caps:
            cap = Capability.objects.get(code=cap_code)
            user.capabilities.add(cap)
            user.entity.company.capabilities.add(cap)
        print(f"Assigned {len(buyer_caps)} capabilities to buyer user: {user.email}")
    elif company_type == 'vendor':
        user.capabilities.clear()
        for cap_code in vendor_caps:
            cap = Capability.objects.get(code=cap_code)
            user.capabilities.add(cap)
            user.entity.company.capabilities.add(cap)
        print(f"Assigned {len(vendor_caps)} capabilities to vendor user: {user.email}")
