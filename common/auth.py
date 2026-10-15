import base64
import json
import logging
from typing import List, Optional
import requests
from fastapi import Depends, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import jwt, JWTError

from common.config import settings
from common.models import RoleEnum, UserContext

logger = logging.getLogger("auth")

security_bearer = HTTPBearer(auto_error=False)

# Cache for Microsoft Entra ID OpenID JWKS keys
_JWKS_CACHE = {}


def get_entra_jwks(tenant_id: str):
    """Retrieve and cache Microsoft Entra ID public JWKS keys."""
    if tenant_id in _JWKS_CACHE:
        return _JWKS_CACHE[tenant_id]

    discovery_url = f"https://login.microsoftonline.com/{tenant_id}/discovery/v2.0/keys"
    try:
        response = requests.get(discovery_url, timeout=5)
        response.raise_for_status()
        jwks = response.json()
        _JWKS_CACHE[tenant_id] = jwks
        return jwks
    except Exception as e:
        logger.error(f"Failed to fetch Entra ID JWKS from {discovery_url}: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to verify token signature due to key discovery failure.",
        )


def verify_mock_token(token: str) -> UserContext:
    """
    Decodes development-only mock tokens.
    Enabled ONLY when AUTH_MODE=MOCK.
    Examples of supported mock tokens:
      - 'mock-customer-1' -> CUSTOMER
      - 'mock-owner-STORE001' -> STORE_OWNER for STORE001
      - 'mock-owner-STORE002' -> STORE_OWNER for STORE002
      - 'mock-owner-STORE003' -> STORE_OWNER for STORE003
      - base64 JSON payload: 'mock-payload.<base64>'
    """
    if token.startswith("mock-payload."):
        try:
            payload_b64 = token.split(".")[1]
            padded = payload_b64 + "=" * (-len(payload_b64) % 4)
            data = json.loads(base64.b64decode(padded).decode("utf-8"))
            return UserContext(
                user_id=data.get("sub", data.get("user_id", "mock-user")),
                email=data.get("email", "mock@example.com"),
                role=RoleEnum(data.get("role", RoleEnum.CUSTOMER)),
                assigned_store_id=data.get("store_id") or data.get("assigned_store_id"),
            )
        except Exception as e:
            logger.warning(f"Failed to parse base64 mock payload: {e}")

    # Standard preset dev tokens
    clean = token.lower().strip()
    if "warehouse" in clean:
        return UserContext(
            user_id="warehouse-manager-1",
            email="warehouse_manager@retail-smart.com",
            role=RoleEnum.WAREHOUSE_OWNER,
            assigned_store_id=None,
        )

    if "owner" in clean or "store_owner" in clean:
        assigned = "STORE001"
        if "store002" in clean:
            assigned = "STORE002"
        elif "store003" in clean:
            assigned = "STORE003"
        return UserContext(
            user_id=f"owner-{assigned.lower()}",
            email=f"owner_{assigned.lower()}@retail-smart.com",
            role=RoleEnum.STORE_OWNER,
            assigned_store_id=assigned,
        )

    # Default mock is customer
    return UserContext(
        user_id="cust-001",
        email="customer001@example.com",
        role=RoleEnum.CUSTOMER,
        assigned_store_id=None,
    )


def verify_entra_token(token: str) -> UserContext:
    """
    Validates Microsoft Entra ID JWT:
    - Signature using Microsoft JWKS
    - Issuer: https://login.microsoftonline.com/{tenant_id}/v2.0
    - Audience: Backend API Client ID / URI
    - Roles claim: CUSTOMER or STORE_OWNER
    - Store assignment claim: store_id or extension_storeId
    """
    tenant_id = settings.azure_tenant_id
    audience = settings.azure_api_client_id

    if not tenant_id or not audience:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Azure Entra ID configuration missing on server (AZURE_TENANT_ID or AZURE_API_CLIENT_ID).",
        )

    jwks = get_entra_jwks(tenant_id)
    try:
        # Get token header to find key ID (kid)
        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header.get("kid")
        key = None
        for k in jwks.get("keys", []):
            if k.get("kid") == kid:
                key = k
                break

        if not key:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Signing key not found in Entra ID JWKS.",
            )

        issuer = f"https://login.microsoftonline.com/{tenant_id}/v2.0"
        payload = jwt.decode(
            token,
            key,
            algorithms=["RS256"],
            audience=audience,
            issuer=issuer,
        )

        user_id = payload.get("oid") or payload.get("sub")
        email = payload.get("preferred_username") or payload.get("upn") or payload.get("email")
        roles = payload.get("roles", [])

        # Map Entra App Roles to RoleEnum
        role = RoleEnum.CUSTOMER
        if "STORE_OWNER" in roles or "StoreOwner" in roles:
            role = RoleEnum.STORE_OWNER
        elif "CUSTOMER" in roles or "Customer" in roles:
            role = RoleEnum.CUSTOMER

        # Store assignment from claims or directory extensions
        assigned_store_id = (
            payload.get("store_id")
            or payload.get("extension_storeId")
            or payload.get("assignedStore")
        )

        return UserContext(
            user_id=user_id,
            email=email,
            role=role,
            assigned_store_id=assigned_store_id,
        )

    except JWTError as e:
        logger.warning(f"Entra ID JWT verification failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired access token: {str(e)}",
        )


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security_bearer),
) -> UserContext:
    """FastAPI dependency to extract and authenticate current user."""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization token required. Use 'Bearer <token>' header.",
        )

    token = credentials.credentials

    # Development-only mock check
    if settings.auth_mode == "MOCK":
        return verify_mock_token(token)

    return verify_entra_token(token)


def require_role(*allowed_roles: RoleEnum):
    """Dependency factory ensuring user has one of the allowed application roles."""
    def role_checker(user: UserContext = Depends(get_current_user)) -> UserContext:
        if user.role not in allowed_roles:
            if len(allowed_roles) == 1:
                req_str = f"Requires role '{allowed_roles[0].value}'"
            else:
                req_str = f"Requires one of roles ({', '.join(r.value for r in allowed_roles)})"
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. {req_str}. User has '{user.role.value}'.",
            )
        return user
    return role_checker


def enforce_store_access(store_id: str, user: UserContext):
    """
    Enforces that store owners can ONLY access their assigned store.
    Warehouse managers have cross-store authority.
    Customers can access store catalog/inventory for purchasing.
    """
    if user.role == RoleEnum.WAREHOUSE_OWNER:
        return

    if user.role == RoleEnum.STORE_OWNER:
        if user.assigned_store_id and user.assigned_store_id != store_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Store isolation violation: You are assigned to {user.assigned_store_id} and cannot access {store_id}.",
            )
