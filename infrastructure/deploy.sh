#!/usr/bin/env bash
# ==============================================================================
# SMART RETAIL INVENTORY & DEMAND FORECASTING SYSTEM - AWS DEPLOYMENT SCRIPT
# ==============================================================================
set -euo pipefail

ENV=${1:-prod}
AWS_REGION=${AWS_REGION:-us-east-1}

echo "=== Deploying Smart Retail Infrastructure to AWS [Environment: $ENV, Region: $AWS_REGION] ==="

# Step 1: Deploy DynamoDB Tables
echo "-> [1/6] Deploying DynamoDB tables..."
aws cloudformation deploy \
  --template-file infrastructure/cloudformation/01-dynamodb.yaml \
  --stack-name "smart-retail-dynamodb-${ENV}" \
  --parameter-overrides Environment="${ENV}" \
  --region "${AWS_REGION}"

# Step 2: Deploy SNS Alerting Topic
echo "-> [2/6] Deploying Amazon SNS alerting topic..."
aws cloudformation deploy \
  --template-file infrastructure/cloudformation/02-sns-alerting.yaml \
  --stack-name "smart-retail-sns-${ENV}" \
  --parameter-overrides Environment="${ENV}" \
  --region "${AWS_REGION}"

# Step 3: Deploy Least-Privilege IAM Roles
echo "-> [3/6] Deploying IAM task & execution roles..."
aws cloudformation deploy \
  --template-file infrastructure/cloudformation/03-iam-roles.yaml \
  --stack-name "smart-retail-iam-${ENV}" \
  --parameter-overrides Environment="${ENV}" \
  --capabilities CAPABILITY_NAMED_IAM \
  --region "${AWS_REGION}"

# Step 4: Deploy ECS Cluster and ECR Repositories
echo "-> [4/6] Deploying ECS Cluster and ECR Repositories..."
aws cloudformation deploy \
  --template-file infrastructure/cloudformation/04-ecs-cluster-ecr.yaml \
  --stack-name "smart-retail-ecs-cluster-${ENV}" \
  --parameter-overrides Environment="${ENV}" \
  --region "${AWS_REGION}"

echo "=== Infrastructure foundation deployed successfully. ==="
echo "Next steps:"
echo "1. Build and push Docker images to the created ECR repositories."
echo "2. Deploy 05-ecs-services.yaml with VPC/Subnet IDs and ECR image tags."
echo "3. Deploy 06-eventbridge-scheduler.yaml to enable the automated daily prediction job."
