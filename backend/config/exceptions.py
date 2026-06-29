"""Custom DRF exception handler for CIXCI."""
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status


def cixci_exception_handler(exc, context):
    # Convert Django ValidationError (raised by model.clean()) to a DRF-style
    # 400 response so that field-level errors propagate to the frontend instead
    # of becoming an opaque 500 Internal Server Error.
    if isinstance(exc, DjangoValidationError):
        if hasattr(exc, "message_dict"):
            detail = exc.message_dict
        elif hasattr(exc, "messages"):
            detail = exc.messages
        else:
            detail = [str(exc)]
        return Response(
            {
                "error": True,
                "status_code": 400,
                "detail": detail,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    response = exception_handler(exc, context)

    if response is not None:
        error_payload = {
            "error": True,
            "status_code": response.status_code,
            "detail": response.data,
        }
        response.data = error_payload

    return response
