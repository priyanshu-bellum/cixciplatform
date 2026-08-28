"""Custom cursor pagination for CIXCI API."""
from rest_framework.pagination import CursorPagination


class CixciCursorPagination(CursorPagination):
    page_size = 50
    page_size_query_param = "page_size"
    max_page_size = 200
    ordering = "-created_at"

    def paginate_queryset(self, queryset, request, view=None):
        try:
            self.count = queryset.count()
        except Exception:
            self.count = None
        return super().paginate_queryset(queryset, request, view)

    def get_paginated_response(self, data):
        res = super().get_paginated_response(data)
        res.data["count"] = getattr(self, "count", None)
        return res
