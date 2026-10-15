from decimal import Decimal
from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict


class RoleEnum(str, Enum):
    CUSTOMER = "CUSTOMER"
    STORE_OWNER = "STORE_OWNER"
    WAREHOUSE_OWNER = "WAREHOUSE_OWNER"


class ClassificationEnum(str, Enum):
    LOW = "LOW"
    NORMAL = "NORMAL"
    EXCESS = "EXCESS"


class AlertTypeEnum(str, Enum):
    LOW_STOCK = "LOW_STOCK"
    EXPIRING_SOON = "EXPIRING_SOON"
    EXPIRED = "EXPIRED"


class AlertSeverityEnum(str, Enum):
    INFO = "INFO"
    WARNING = "WARNING"
    CRITICAL = "CRITICAL"


class NotificationStatusEnum(str, Enum):
    PENDING = "PENDING"
    SENT = "SENT"
    FAILED = "FAILED"
    RESOLVED = "RESOLVED"


class WarehouseRequestStatusEnum(str, Enum):
    PENDING = "PENDING"
    ACKNOWLEDGED = "ACKNOWLEDGED"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class UserContext(BaseModel):
    user_id: str
    email: Optional[str] = None
    role: RoleEnum
    assigned_store_id: Optional[str] = None


class BatchModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    batch_id: str = Field(..., alias="batchId")
    expiry_date: str = Field(..., alias="expiryDate")  # ISO Date YYYY-MM-DD
    quantity: int = Field(ge=0)


class ProductInventoryItem(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    store_id: str = Field(..., alias="storeId")
    product_id: str = Field(..., alias="productId")
    product_name: str = Field(..., alias="productName")
    category: str
    price: float = Field(gt=0)
    total_stock: int = Field(ge=0, alias="totalStock")
    batches: List[BatchModel] = []
    last_updated: Optional[str] = Field(None, alias="lastUpdated")


class StoreInfo(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    store_id: str = Field(..., alias="storeId")
    store_name: str = Field(..., alias="storeName")
    location: str
    manager_name: str = Field(..., alias="managerName")


# --- Billing & Checkout Models ---

class CheckoutItemRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    product_id: str = Field(..., alias="productId")
    quantity: int = Field(gt=0)


class CheckoutRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    store_id: str = Field(..., alias="storeId")
    items: List[CheckoutItemRequest] = Field(..., min_length=1)
    idempotency_key: Optional[str] = Field(None, alias="idempotencyKey")


class BatchDeduction(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    batch_id: str = Field(..., alias="batchId")
    quantity: int
    expiry_date: str = Field(..., alias="expiryDate")


class BillItem(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    product_id: str = Field(..., alias="productId")
    product_name: str = Field(..., alias="productName")
    quantity: int
    unit_price: float = Field(..., alias="unitPrice")
    subtotal: float
    batch_deductions: List[BatchDeduction] = Field([], alias="batchDeductions")


class BillRecord(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    store_id: str = Field(..., alias="storeId")
    sale_id: str = Field(..., alias="saleId")
    sale_timestamp: str = Field(..., alias="saleTimestamp")
    sale_timestamp_and_sale_id: str = Field(..., alias="saleTimestampAndSaleId")
    customer_id: str = Field(..., alias="customerId")
    customer_email: Optional[str] = Field(None, alias="customerEmail")
    items: List[BillItem]
    subtotal: float
    tax: float
    total_amount: float = Field(..., alias="totalAmount")
    idempotency_key: Optional[str] = Field(None, alias="idempotencyKey")


# --- ML & Prediction Models ---

class PredictionItem(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    store_id: str = Field(..., alias="storeId")
    product_id: str = Field(..., alias="productId")
    product_name: str = Field(..., alias="productName")
    category: str
    current_stock: int = Field(..., alias="currentStock")
    predicted_demand_7d: float = Field(..., alias="predictedDemand7d")
    safety_stock: float = Field(..., alias="safetyStock")
    coverage_days: float = Field(..., alias="coverageDays")
    classification: ClassificationEnum
    explanation: str
    model_version: str = Field(..., alias="modelVersion")
    updated_at: str = Field(..., alias="updatedAt")


class ModelMetadata(BaseModel):
    model_version: str
    training_date: str
    dataset_version: str
    feature_names: List[str]
    evaluation_metrics: Dict[str, float]
    training_config: Dict[str, Any]


# --- Alert Models ---

class AlertItem(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    alert_id: str = Field(..., alias="alertId")
    store_id: str = Field(..., alias="storeId")
    product_id: str = Field(..., alias="productId")
    product_name: Optional[str] = Field(None, alias="productName")
    alert_type: AlertTypeEnum = Field(..., alias="alertType")
    severity: AlertSeverityEnum
    description: str
    current_stock: int = Field(..., alias="currentStock")
    predicted_demand: Optional[float] = Field(None, alias="predictedDemand")
    expiry_date: Optional[str] = Field(None, alias="expiryDate")
    batch_id: Optional[str] = Field(None, alias="batchId")
    created_at: str = Field(..., alias="createdAt")
    updated_at: str = Field(..., alias="updatedAt")
    acknowledged: bool = False
    notification_status: NotificationStatusEnum = Field(
        NotificationStatusEnum.PENDING, alias="notificationStatus"
    )
    last_notified_at: Optional[str] = Field(None, alias="lastNotifiedAt")


# --- Warehouse Models ---

class WarehouseRequestCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    store_id: str = Field(..., alias="storeId")
    product_id: str = Field(..., alias="productId")
    requested_quantity: int = Field(..., gt=0, alias="requestedQuantity")
    reason: str = Field(..., min_length=3)


class WarehouseRequestItem(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    request_id: str = Field(..., alias="requestId")
    store_id: str = Field(..., alias="storeId")
    product_id: str = Field(..., alias="productId")
    product_name: Optional[str] = Field(None, alias="productName")
    store_name: Optional[str] = Field(None, alias="storeName")
    manager_name: Optional[str] = Field(None, alias="managerName")
    requested_quantity: int = Field(..., alias="requestedQuantity")
    reason: str
    status: WarehouseRequestStatusEnum = WarehouseRequestStatusEnum.PENDING
    created_by: str = Field(..., alias="createdBy")
    created_at: str = Field(..., alias="createdAt")
    updated_at: str = Field(..., alias="updatedAt")
