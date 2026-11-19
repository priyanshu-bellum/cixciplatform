"""Read-only source/model/URL inventory for repository memory. Emits JSON to stdout.

Run with the existing backend Python environment, working directory backend/:
    python ../scripts/ai-context-inventory.py
Or pipe this file to `docker exec -i <local-backend> python -` from the repo root.
Never reads application records, evaluates querysets, calls field defaults, renders
serializers, executes handlers or dumps settings/environment/credential values.
"""
import ast
import hashlib
import inspect
import json
import os
from pathlib import Path
import sys


def location(obj, root):
    try:
        path = Path(inspect.getsourcefile(obj)).resolve()
        return "backend/" + path.relative_to(root).as_posix()
    except (TypeError, ValueError):
        return None


def symbol(obj):
    return getattr(obj, "__module__", "") + "." + getattr(obj, "__qualname__", type(obj).__name__)


def value(item):
    if callable(item):
        return symbol(item) + " (callable; not evaluated)"
    if isinstance(item, (str, int, float, bool, type(None))):
        return item
    if isinstance(item, (list, tuple)):
        return [value(v) for v in item]
    if isinstance(item, dict):
        return {str(k): value(v) for k, v in item.items()}
    return str(item)


def source_inventory(root):
    result = []
    for base in (root / "apps", root / "config", root / "tests"):
        for path in sorted(base.rglob("*.py")):
            if "__pycache__" in path.parts:
                continue
            tree = ast.parse(path.read_text(encoding="utf-8-sig"))
            row = {"path": "backend/" + path.relative_to(root).as_posix(),
                   "sha256": hashlib.sha256(path.read_bytes()).hexdigest(), "symbols": []}
            for node in tree.body:
                if isinstance(node, (ast.ClassDef, ast.FunctionDef, ast.AsyncFunctionDef)):
                    row["symbols"].append({"name": node.name, "line": node.lineno,
                        "methods": [n.name for n in getattr(node, "body", []) if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef))],
                        "bases": [ast.unparse(b) for b in getattr(node, "bases", [])]})
            result.append(row)
    return result


def handler_details(handler, root):
    import re
    import textwrap
    details = {"source": location(handler, root), "symbol": symbol(handler)}
    try:
        code = inspect.getsource(handler)
        tree = ast.parse(textwrap.dedent(code))
        details["request_keys"] = sorted(set(re.findall(r'(?:request\.data(?:\.get\(|\[)|request\.query_params\.get\()[\"\x27]([^\"\x27]+)', code)))
        details["dependencies"] = sorted({n.module + "." + a.name for n in ast.walk(tree)
            if isinstance(n, ast.ImportFrom) and n.module and n.module.startswith(("apps.", "config.")) for a in n.names})
        details["response_keys"] = sorted({k.value for n in ast.walk(tree) if isinstance(n, ast.Call)
            and ast.unparse(n.func) == "Response" and n.args and isinstance(n.args[0], ast.Dict)
            for k in n.args[0].keys if isinstance(k, ast.Constant) and isinstance(k.value, str)})
    except (OSError, TypeError, SyntaxError):
        pass
    return details


def serializer_details(cls, root):
    if cls is None:
        return None
    import textwrap
    data = {"symbol": symbol(cls), "source": location(cls, root)}
    meta = getattr(cls, "Meta", None)
    if meta:
        for key in ("fields", "exclude", "read_only_fields"):
            if hasattr(meta, key):
                data[key] = value(getattr(meta, key))
    try:
        tree = ast.parse(textwrap.dedent(inspect.getsource(cls)))
        data["validation_methods"] = [n.name for n in tree.body[0].body if isinstance(n, ast.FunctionDef) and n.name.startswith("validate")]
    except (OSError, TypeError, SyntaxError):
        pass
    return data


def main():
    root = Path.cwd().resolve()
    if not (root / "manage.py").exists():
        raise SystemExit("Run from backend/ (the directory containing manage.py).")
    sys.path.insert(0, str(root))
    # Isolated settings: no external DB/cache/task dependencies.
    os.environ["DJANGO_SETTINGS_MODULE"] = "config.test_settings"
    import django
    from django.db import connections

    def no_sql(execute, sql, params, many, context):
        raise RuntimeError("Memory inventory must not query a database")

    for connection in connections.all():
        connection.execute_wrappers.append(no_sql)
    django.setup()
    from django.apps import apps
    from django.db import models
    from django.urls import URLResolver, get_resolver
    output = {"format_version": 1, "settings": "config.test_settings", "database_queried": False,
              "source": source_inventory(root), "models": [], "routes": []}
    for model in sorted(apps.get_models(include_auto_created=True), key=lambda m: m._meta.label):
        if not model._meta.app_config.name.startswith("apps."):
            continue
        meta = model._meta
        row = {"model": meta.label, "table": meta.db_table, "source": location(model, root),
               "auto_created": bool(meta.auto_created), "fields": [],
               "indexes": [i.deconstruct() for i in meta.indexes],
               "constraints": [c.deconstruct() for c in meta.constraints],
               "unique_together": meta.unique_together, "ordering": meta.ordering}
        for field in list(meta.local_fields) + list(meta.local_many_to_many):
            remote = getattr(field, "remote_field", None)
            default = field.default
            sensitive = any(k in field.name.lower() for k in ("password", "secret", "token", "credential"))
            details = {"name": field.name, "column": field.column, "type": field.get_internal_type(),
                       "primary_key": field.primary_key, "null": field.null, "blank": field.blank,
                       "unique": field.unique, "db_index": field.db_index,
                       "default": "<not set>" if default is models.NOT_PROVIDED else ("<redacted>" if sensitive else value(default)),
                       "max_length": field.max_length,
                       "auto_now": getattr(field, "auto_now", False), "auto_now_add": getattr(field, "auto_now_add", False)}
            for key in ("max_digits", "decimal_places"):
                if hasattr(field, key):
                    details[key] = getattr(field, key)
            if field.choices and not sensitive:
                details["choices"] = list(field.flatchoices)
            if remote:
                details["relation"] = remote.model._meta.label
                details["related_name"] = remote.related_name
                details["on_delete"] = getattr(getattr(remote, "on_delete", None), "__name__", None)
                if getattr(remote, "through", None):
                    details["through"] = remote.through._meta.label
            row["fields"].append(details)
        output["models"].append(row)

    def walk(patterns, prefix=""):
        for pattern in patterns:
            path = prefix + str(pattern.pattern)
            if isinstance(pattern, URLResolver):
                # Django admin is framework surface, not an owned API.
                if not path.startswith("admin/"):
                    walk(pattern.url_patterns, path)
                continue
            if not path.startswith("api/") or "(?P<format>" in path or "<drf_format_suffix:" in path:
                continue
            callback = pattern.callback
            cls = getattr(callback, "cls", None) or getattr(callback, "view_class", None)
            if cls is None:
                continue
            if cls.__module__.startswith("rest_framework.routers"):
                continue
            actions = getattr(callback, "actions", None)
            if actions:
                methods = {k.upper(): v for k, v in actions.items() if k != "head"}
            else:
                methods = {k.upper(): k for k in getattr(cls, "http_method_names", []) if k not in ("head", "options") and hasattr(cls, k)}
            initkwargs = getattr(callback, "initkwargs", {})
            policies = {}
            for key in ("permission_classes", "authentication_classes", "throttle_classes"):
                policies[key] = [symbol(p) for p in initkwargs.get(key, getattr(cls, key, []))]
            queryset = getattr(cls, "queryset", None)
            serializer = getattr(cls, "serializer_class", None)
            handlers = {}
            for method, action in methods.items():
                handler = getattr(cls, action, None)
                if handler:
                    handlers[method] = handler_details(handler, root)
            output["routes"].append({"path": "/" + path, "name": pattern.name,
                "view": symbol(cls), "source": location(cls, root), "methods": methods,
                "serializer": symbol(serializer) if serializer else None,
                "serializer_source": location(serializer, root) if serializer else None,
                "serializer_definition": serializer_details(serializer, root),
                "model": queryset.model._meta.label if queryset is not None else None,
                "required_capability": getattr(cls, "required_capability", None),
                "action_capability_map": getattr(cls, "action_capability_map", {}),
                "handlers": handlers, **policies})
    walk(get_resolver().url_patterns)
    print(json.dumps(output, indent=2, default=value))


if __name__ == "__main__":
    main()
