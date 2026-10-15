# Microsoft Entra ID Authentication & Authorization Guide

This guide describes how to configure Microsoft Entra ID (formerly Azure Active Directory) for the React frontend Single Page Application (SPA) and FastAPI backend microservices.

---

## 1. Architectural Roles & Claims

The system enforces role-based access control (RBAC) and store-level authorization:

| Role | Permissions | Scope / Restriction |
|---|---|---|
| `CUSTOMER` | Browse stores, view authoritative prices, add to cart, complete purchase, inspect own bills | Can purchase from any store; can **only** query own purchase records (`customerId == sub/oid`). Cannot access store owner dashboards. |
| `STORE_OWNER` | Inspect store inventory, inspect batches, view 7-day demand forecasts, run on-demand predictions, acknowledge alerts, submit replenishment requests | Strictly restricted to their assigned store (`STORE001`, `STORE002`, or `STORE003`). Cross-store queries return HTTP 403 Forbidden. |

---

## 2. Microsoft Entra ID Portal Setup

### Step 1: Register Backend API
1. Navigate to the [Microsoft Entra admin center](https://entra.microsoft.com/) -> **App registrations** -> **New registration**.
2. Name: `SmartRetail-Backend-API`.
3. Supported account types: *Accounts in this organizational directory only (Single tenant)*.
4. Click **Register**. Note the **Application (client) ID** and **Directory (tenant) ID**.
5. **Expose an API:**
   - Go to **Expose an API** -> **Application ID URI** -> Click **Set** (e.g. `api://<BACKEND_CLIENT_ID>`).
   - Click **Add a scope**:
     - Scope name: `access_as_user`
     - Who can consent: *Admins and users*
     - Admin consent display name: *Access Smart Retail API*
     - State: *Enabled*.
6. **Define App Roles:**
   - Go to **App roles** -> **Create app role**:
     - Display name: `Customer Role`
     - Allowed member types: *Users/Groups*
     - Value: `CUSTOMER`
     - Description: `Standard customer purchasing permissions`
   - Create a second app role:
     - Display name: `Store Owner Role`
     - Allowed member types: *Users/Groups*
     - Value: `STORE_OWNER`
     - Description: `Retail store management and forecasting permissions`

### Step 2: Register Frontend SPA
1. Go to **App registrations** -> **New registration**.
2. Name: `SmartRetail-Frontend-SPA`.
3. Redirect URI:
   - Platform: **Single-page application (SPA)**
   - URI: `http://localhost:3000` (and your production domain in deployed environments).
4. Click **Register**. Note the **Application (client) ID**.
5. **API Permissions:**
   - Go to **API permissions** -> **Add a permission** -> **My APIs** -> Select `SmartRetail-Backend-API`.
   - Select Delegated permissions -> Check `access_as_user`.
   - Click **Add permissions**.
   - Click **Grant admin consent for [Tenant]**.

### Step 3: Assign Users and Roles
1. Go to **Enterprise applications** -> Select `SmartRetail-Backend-API`.
2. Go to **Users and groups** -> **Add user/group**.
3. Select your test user:
   - Assign the `CUSTOMER` role to customer test accounts.
   - Assign the `STORE_OWNER` role to store manager accounts.

---

## 3. Environment Configuration

### Backend `.env`:
```env
AUTH_MODE=ENTRA_ID
AZURE_TENANT_ID=<your-tenant-id-guid>
AZURE_API_CLIENT_ID=api://<your-backend-client-id-guid>
AZURE_FRONTEND_CLIENT_ID=<your-frontend-client-id-guid>
AZURE_API_SCOPE=api://<your-backend-client-id-guid>/access_as_user
```

### Frontend `frontend/.env`:
```env
VITE_AUTH_MODE=ENTRA_ID
VITE_AZURE_TENANT_ID=<your-tenant-id-guid>
VITE_AZURE_CLIENT_ID=<your-frontend-client-id-guid>
VITE_AZURE_API_SCOPE=api://<your-backend-client-id-guid>/access_as_user
```

---

## 4. Backend JWT Token Validation Flow

The backend verifies incoming `Authorization: Bearer <token>` headers using cryptographic JSON Web Key Sets (JWKS) provided by Microsoft:

1. **JWKS Discovery:** Retrieves signing keys from:
   `https://login.microsoftonline.com/{tenant_id}/discovery/v2.0/keys` (cached in memory).
2. **Signature & Expiry:** Validates RSA-256 signature and token expiration time.
3. **Issuer & Audience:** Confirms issuer is `https://login.microsoftonline.com/{tenant_id}/v2.0` and audience matches `AZURE_API_CLIENT_ID`.
4. **Roles Claim:** Checks `roles` array in JWT for `CUSTOMER` or `STORE_OWNER`.
5. **Store Assignment Check:** Reads the `store_id` claim from token extensions. If user is `STORE_OWNER`, validates that `store_id == requested_store_id`.

---

## 5. Development-Only Mock Auth Mode

When running locally without Azure credentials, set:
```env
AUTH_MODE=MOCK
VITE_AUTH_MODE=MOCK
```
In mock mode, the system accepts development tokens:
- `Bearer mock-customer-1` -> Logged in as `cust-001` with role `CUSTOMER`.
- `Bearer mock-owner-store001` -> Logged in as `owner-store001` with role `STORE_OWNER` assigned to `STORE001`.
- `Bearer mock-owner-store002` -> Logged in as `owner-store002` with role `STORE_OWNER` assigned to `STORE002`.
- `Bearer mock-owner-store003` -> Logged in as `owner-store003` with role `STORE_OWNER` assigned to `STORE003`.

The UI provides a quick one-click role switcher in the top navigation bar to test all customer and store owner scenarios seamlessly.
