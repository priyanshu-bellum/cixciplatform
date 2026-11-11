"""Isolated PostgreSQL verification using local connection credentials only.

pytest-django creates/drops the dedicated test database. The restored database
is never the test target. Use only with the local-copy Docker Compose stack.
"""
from copy import deepcopy
from .test_settings import *  # noqa: F401,F403
from .settings import DATABASES as LOCAL_DATABASES

DATABASES = deepcopy(LOCAL_DATABASES)
DATABASES["default"]["TEST"] = {"NAME": "test_cixci_compatibility"}
