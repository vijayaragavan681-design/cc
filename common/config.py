import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class AppSettings(BaseSettings):
    # AWS Settings
    aws_region: str = "us-east-1"
    dynamodb_endpoint_url: str = ""  # Set for DynamoDB local (e.g. http://localhost:8000)
    aws_access_key_id: str = "DUMMYKEY"
    aws_secret_access_key: str = "DUMMYSECRET"

    # DynamoDB Table Names
    inventory_table_name: str = "RetailInventory"
    sales_table_name: str = "Sales"
    predictions_table_name: str = "InventoryPredictions"
    alerts_table_name: str = "InventoryAlerts"
    warehouse_requests_table_name: str = "WarehouseRequests"

    # Amazon SNS
    sns_topic_arn: str = ""
    alert_email_recipient: str = "store-ops@example.com"

    # ML & Inventory Policies
    model_path: str = "ml/artifacts/demand_model.joblib"
    model_metadata_path: str = "ml/artifacts/model_metadata.json"
    model_version: str = "1.0.0"
    store_ids: str = "STORE001,STORE002,STORE003"
    expiry_warning_days: int = 7
    demand_forecast_days: int = 7
    safety_stock_factor: float = 1.2
    excess_stock_coverage_days: int = 21

    # Microsoft Entra ID Authentication
    auth_mode: str = "MOCK"  # "MOCK" for local dev, "ENTRA_ID" for production
    azure_tenant_id: str = ""
    azure_frontend_client_id: str = ""
    azure_api_client_id: str = ""
    azure_api_scope: str = ""

    # Service-to-Service URLs
    retail_store_service_url: str = "http://localhost:8001"
    inventory_service_url: str = "http://localhost:8002"
    warehouse_service_url: str = "http://localhost:8003"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @property
    def valid_store_ids(self) -> List[str]:
        return [s.strip() for s in self.store_ids.split(",") if s.strip()]


# Global shared settings instance
settings = AppSettings()
