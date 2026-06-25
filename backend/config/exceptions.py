"""Custom DRF exception handler for CIXCI."""
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status


def cixci_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is not None:
        error_payload = {
            "error": True,
            "status_code": response.status_code,
            "detail": response.data,
        }
        response.data = error_payload

    return response
