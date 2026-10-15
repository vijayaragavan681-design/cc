import logging
import sys
from botocore.exceptions import ClientError
from common.config import settings
from common.dynamodb import get_dynamodb_resource, get_dynamodb_client

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("init_dynamodb")


def create_table_if_not_exists(dynamodb, table_name: str, key_schema: list, attribute_definitions: list, gsi_list: list = None):
    try:
        existing = dynamodb.Table(table_name)
        existing.load()
        logger.info(f"Table '{table_name}' already exists.")
        return existing
    except ClientError as e:
        error_code = e.response.get("Error", {}).get("Code")
        if error_code != "ResourceNotFoundException":
            logger.error(f"Error checking table {table_name}: {e}")
            raise

    logger.info(f"Creating table '{table_name}'...")
    create_params = {
        "TableName": table_name,
        "KeySchema": key_schema,
        "AttributeDefinitions": attribute_definitions,
        "BillingMode": "PAY_PER_REQUEST",
    }
    if gsi_list:
        create_params["GlobalSecondaryIndexes"] = gsi_list

    table = dynamodb.create_table(**create_params)
    table.wait_until_exists()
    logger.info(f"Table '{table_name}' created successfully.")
    return table


def init_all_tables():
    dynamodb = get_dynamodb_resource()
    logger.info(f"Initializing DynamoDB tables (Region: {settings.aws_region}, Endpoint: {settings.dynamodb_endpoint_url or 'AWS Cloud'})...")

    # 1. RetailInventory Table
    create_table_if_not_exists(
        dynamodb=dynamodb,
        table_name=settings.inventory_table_name,
        key_schema=[
            {"AttributeName": "storeId", "KeyType": "HASH"},
            {"AttributeName": "productId", "KeyType": "RANGE"},
        ],
        attribute_definitions=[
            {"AttributeName": "storeId", "AttributeType": "S"},
            {"AttributeName": "productId", "AttributeType": "S"},
        ],
        gsi_list=[
            {
                "IndexName": "ProductIdIndex",
                "KeySchema": [
                    {"AttributeName": "productId", "KeyType": "HASH"},
                    {"AttributeName": "storeId", "KeyType": "RANGE"},
                ],
                "Projection": {"ProjectionType": "ALL"},
            }
        ],
    )

    # 2. Sales Table
    create_table_if_not_exists(
        dynamodb=dynamodb,
        table_name=settings.sales_table_name,
        key_schema=[
            {"AttributeName": "storeId", "KeyType": "HASH"},
            {"AttributeName": "saleTimestampAndSaleId", "KeyType": "RANGE"},
        ],
        attribute_definitions=[
            {"AttributeName": "storeId", "AttributeType": "S"},
            {"AttributeName": "saleTimestampAndSaleId", "AttributeType": "S"},
            {"AttributeName": "customerId", "AttributeType": "S"},
        ],
        gsi_list=[
            {
                "IndexName": "CustomerIdIndex",
                "KeySchema": [
                    {"AttributeName": "customerId", "KeyType": "HASH"},
                    {"AttributeName": "saleTimestampAndSaleId", "KeyType": "RANGE"},
                ],
                "Projection": {"ProjectionType": "ALL"},
            }
        ],
    )

    # 3. InventoryPredictions Table
    create_table_if_not_exists(
        dynamodb=dynamodb,
        table_name=settings.predictions_table_name,
        key_schema=[
            {"AttributeName": "storeId", "KeyType": "HASH"},
            {"AttributeName": "productId", "KeyType": "RANGE"},
        ],
        attribute_definitions=[
            {"AttributeName": "storeId", "AttributeType": "S"},
            {"AttributeName": "productId", "AttributeType": "S"},
        ],
    )

    # 4. InventoryAlerts Table
    create_table_if_not_exists(
        dynamodb=dynamodb,
        table_name=settings.alerts_table_name,
        key_schema=[
            {"AttributeName": "storeId", "KeyType": "HASH"},
            {"AttributeName": "alertId", "KeyType": "RANGE"},
        ],
        attribute_definitions=[
            {"AttributeName": "storeId", "AttributeType": "S"},
            {"AttributeName": "alertId", "AttributeType": "S"},
        ],
    )

    # 5. WarehouseRequests Table
    create_table_if_not_exists(
        dynamodb=dynamodb,
        table_name=settings.warehouse_requests_table_name,
        key_schema=[
            {"AttributeName": "storeId", "KeyType": "HASH"},
            {"AttributeName": "requestId", "KeyType": "RANGE"},
        ],
        attribute_definitions=[
            {"AttributeName": "storeId", "AttributeType": "S"},
            {"AttributeName": "requestId", "AttributeType": "S"},
        ],
    )

    logger.info("All DynamoDB tables verified/created successfully.")


if __name__ == "__main__":
    init_all_tables()
