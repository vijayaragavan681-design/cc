# AWS Setup & Deployment Guide

This guide details the setup and provisioning of AWS resources for the Smart Retail System using AWS CloudFormation and the AWS CLI.

---

## 1. Prerequisites

1. **AWS CLI v2** installed and configured:
   ```bash
   aws --version
   aws configure
   ```
   Provide your AWS Access Key, Secret Access Key, default region (e.g., `us-east-1`), and output format (`json`).
2. **Docker Desktop / Docker Engine** running locally for building container images.
3. Appropriate IAM permissions to provision DynamoDB, ECS, ECR, IAM, CloudWatch, SNS, and EventBridge resources.

---

## 2. CloudFormation Infrastructure Stacks

The project includes modular CloudFormation templates in `infrastructure/cloudformation/`:

| Template | File | Purpose |
|---|---|---|
| 01 | `01-dynamodb.yaml` | Creates 5 DynamoDB tables (`RetailInventory`, `Sales`, `InventoryPredictions`, `InventoryAlerts`, `WarehouseRequests`) and GSIs |
| 02 | `02-sns-alerting.yaml` | Provisions `smart-retail-inventory-alerts` SNS Topic and email subscription |
| 03 | `03-iam-roles.yaml` | Deploys least-privilege Task Roles for each service, Execution Role, and Scheduler Role |
| 04 | `04-ecs-cluster-ecr.yaml` | Creates 3 ECR repositories, CloudWatch log groups, and ECS Fargate Cluster |
| 05 | `05-ecs-services.yaml` | Deploys Fargate Task Definitions and 3 ECS Services (Store, Inventory, Warehouse) |
| 06 | `06-eventbridge-scheduler.yaml` | Schedules the daily ECS RunTask prediction and alerting job |

---

## 3. Step-by-Step Deployment

### Step 1: Deploy DynamoDB Tables
```bash
aws cloudformation deploy \
  --template-file infrastructure/cloudformation/01-dynamodb.yaml \
  --stack-name smart-retail-dynamodb-prod \
  --parameter-overrides Environment=prod \
  --region us-east-1
```

### Step 2: Deploy Amazon SNS Topic
```bash
aws cloudformation deploy \
  --template-file infrastructure/cloudformation/02-sns-alerting.yaml \
  --stack-name smart-retail-sns-prod \
  --parameter-overrides Environment=prod AlertEmailRecipient=your-email@example.com \
  --region us-east-1
```

> **IMPORTANT: Confirm SNS Email Subscription**
> Amazon SNS sends a confirmation email to the recipient address. You **must click the "Confirm subscription" link** in the email before AWS will deliver alerts.

### Step 3: Deploy IAM Roles
```bash
aws cloudformation deploy \
  --template-file infrastructure/cloudformation/03-iam-roles.yaml \
  --stack-name smart-retail-iam-prod \
  --parameter-overrides Environment=prod \
  --capabilities CAPABILITY_NAMED_IAM \
  --region us-east-1
```

### Step 4: Deploy ECS Cluster & ECR Repositories
```bash
aws cloudformation deploy \
  --template-file infrastructure/cloudformation/04-ecs-cluster-ecr.yaml \
  --stack-name smart-retail-ecs-cluster-prod \
  --parameter-overrides Environment=prod \
  --region us-east-1
```

### Step 5: Build and Push Docker Images to Amazon ECR
Log in to Amazon ECR:
```bash
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION="us-east-1"

aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com
```

Build and tag each service:
```bash
# Retail Store Service
docker build -t $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/smart-retail/store-service-prod:latest -f services/retail-store/Dockerfile .
docker push $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/smart-retail/store-service-prod:latest

# Inventory & ML Prediction Service (packages trained model artifact)
docker build -t $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/smart-retail/inventory-service-prod:latest -f services/inventory/Dockerfile .
docker push $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/smart-retail/inventory-service-prod:latest

# Warehouse Service
docker build -t $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/smart-retail/warehouse-service-prod:latest -f services/warehouse/Dockerfile .
docker push $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/smart-retail/warehouse-service-prod:latest
```

### Step 6: Deploy ECS Services
Retrieve your default VPC and Subnet IDs:
```bash
VPC_ID=$(aws ec2 describe-vpcs --filters "Name=isDefault,Values=true" --query "Vpcs[0].VpcId" --output text)
SUBNETS=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VPC_ID" --query "Subnets[*].SubnetId" --output text | tr '\t' ',')
SG_ID=$(aws ec2 describe-security-groups --filters "Name=vpc-id,Values=$VPC_ID" "Name=group-name,Values=default" --query "SecurityGroups[0].GroupId" --output text)
```

Deploy the services:
```bash
aws cloudformation deploy \
  --template-file infrastructure/cloudformation/05-ecs-services.yaml \
  --stack-name smart-retail-services-prod \
  --parameter-overrides \
    Environment=prod \
    VpcId=$VPC_ID \
    SubnetIds=$SUBNETS \
    SecurityGroupId=$SG_ID \
    ECRStoreImageUri=$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/smart-retail/store-service-prod:latest \
    ECRInventoryImageUri=$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/smart-retail/inventory-service-prod:latest \
    ECRWarehouseImageUri=$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/smart-retail/warehouse-service-prod:latest \
    AzureTenantId=your-azure-tenant-id \
    AzureApiClientId=api://your-azure-api-id \
  --region us-east-1
```

### Step 7: Deploy EventBridge Scheduler
```bash
aws cloudformation deploy \
  --template-file infrastructure/cloudformation/06-eventbridge-scheduler.yaml \
  --stack-name smart-retail-scheduler-prod \
  --parameter-overrides \
    Environment=prod \
    SubnetIds=$SUBNETS \
    SecurityGroupId=$SG_ID \
  --region us-east-1
```

---

## 4. Manual Execution & Inspection

To manually trigger the scheduled prediction task without waiting for the cron trigger:
```bash
aws ecs run-task \
  --cluster smart-retail-cluster-prod \
  --task-definition smart-retail-inventory-prod \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_ID],securityGroups=[$SG_ID],assignPublicIp=ENABLED}" \
  --overrides '{"containerOverrides":[{"name":"inventory-service","command":["python","-m","services.inventory.app.jobs.run_predictions"]}]}' \
  --region us-east-1
```

To view CloudWatch logs for the scheduled job:
```bash
aws logs tail /ecs/smart-retail-scheduled-job-prod --follow
```
