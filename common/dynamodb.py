import os
from decimal import Decimal
from typing import Any, Dict, List, Optional
import boto3
from common.config import settings


def get_dynamodb_resource():
    """Returns boto3 DynamoDB resource configured for local dev or AWS."""
    if settings.dynamodb_endpoint_url:
        session = boto3.Session(
            aws_access_key_id=settings.aws_access_key_id or "local_dev_key",
            aws_secret_access_key=settings.aws_secret_access_key or "local_dev_secret",
            region_name=settings.aws_region
        )
        return session.resource("dynamodb", endpoint_url=settings.dynamodb_endpoint_url)
    return boto3.resource("dynamodb", region_name=settings.aws_region)


def get_dynamodb_client():
    """Returns boto3 DynamoDB low-level client."""
    if settings.dynamodb_endpoint_url:
        session = boto3.Session(
            aws_access_key_id=settings.aws_access_key_id or "local_dev_key",
            aws_secret_access_key=settings.aws_secret_access_key or "local_dev_secret",
            region_name=settings.aws_region
        )
        return session.client("dynamodb", endpoint_url=settings.dynamodb_endpoint_url)
    return boto3.client("dynamodb", region_name=settings.aws_region)


def convert_floats_to_decimals(obj: Any) -> Any:
    """Recursively convert float values to Decimal for DynamoDB storage."""
    if isinstance(obj, float):
        return Decimal(str(round(obj, 4)))
    elif isinstance(obj, dict):
        return {k: convert_floats_to_decimals(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_floats_to_decimals(v) for v in obj]
    return obj


def convert_decimals_to_primitives(obj: Any) -> Any:
    """Recursively convert Decimal values back to int/float for JSON serialization."""
    if isinstance(obj, Decimal):
        if obj % 1 == 0:
            return int(obj)
        return float(obj)
    elif isinstance(obj, dict):
        return {k: convert_decimals_to_primitives(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_decimals_to_primitives(v) for v in obj]
    return obj


class DynamoDBManager:
    """Wrapper providing convenient access to DynamoDB tables."""

    def __init__(self, resource=None):
        self._resource = resource
        self._custom_tables = {}

    def get_resource(self):
        if self._resource is None:
            self._resource = get_dynamodb_resource()
        return self._resource

    def set_table(self, name: str, table):
        self._custom_tables[name] = table

    def reset_custom_tables(self):
        self._custom_tables.clear()

    @property
    def inventory_table(self):
        return self._custom_tables.get("inventory") or self.get_resource().Table(settings.inventory_table_name)

    @property
    def sales_table(self):
        return self._custom_tables.get("sales") or self.get_resource().Table(settings.sales_table_name)

    @property
    def predictions_table(self):
        return self._custom_tables.get("predictions") or self.get_resource().Table(settings.predictions_table_name)

    @property
    def alerts_table(self):
        return self._custom_tables.get("alerts") or self.get_resource().Table(settings.alerts_table_name)

    @property
    def warehouse_table(self):
        return self._custom_tables.get("warehouse") or self.get_resource().Table(settings.warehouse_requests_table_name)


db_manager = DynamoDBManager()
