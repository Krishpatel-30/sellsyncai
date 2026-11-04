from typing import Any, Dict, Optional
from fastapi import HTTPException, status


class SellSyncException(HTTPException):
    """Base API Exception for SellSync AI."""
    def __init__(
        self,
        status_code: int,
        detail: str,
        code: str = "ERROR",
        headers: Optional[Dict[str, str]] = None
    ):
        super().__init__(
            status_code=status_code,
            detail={"code": code, "message": detail},
            headers=headers
        )


class UnauthorizedException(SellSyncException):
    def __init__(self, detail: str = "Could not validate credentials"):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            code="UNAUTHORIZED",
            headers={"WWW-Authenticate": "Bearer"}
        )


class ForbiddenException(SellSyncException):
    def __init__(self, detail: str = "You do not have permission to perform this action"):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail,
            code="FORBIDDEN"
        )


class NotFoundException(SellSyncException):
    def __init__(self, resource: str = "Resource", identifier: Optional[Any] = None):
        msg = f"{resource} not found" if identifier is None else f"{resource} '{identifier}' not found"
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=msg,
            code="NOT_FOUND"
        )


class ConflictException(SellSyncException):
    def __init__(self, detail: str = "Resource already exists"):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            detail=detail,
            code="CONFLICT"
        )


class TenantAccessDeniedException(SellSyncException):
    def __init__(self, detail: str = "Access denied to the specified workspace"):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail,
            code="TENANT_ACCESS_DENIED"
        )

