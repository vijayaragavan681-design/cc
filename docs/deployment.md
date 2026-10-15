# Production Deployment Guide

This guide covers production deployment of the Smart Retail System across AWS and Microsoft Entra ID.

---

## 1. Production Architecture Overview

- **Compute:** Three independently running AWS ECS Fargate services (`retail-store`, `inventory`, `warehouse`).
- **Database:** Amazon DynamoDB (On-Demand Capacity, Multi-AZ).
- **Messaging:** Amazon SNS (`smart-retail-inventory-alerts`).
- **Scheduling:** Amazon EventBridge Scheduler with ECS RunTask target.
- **Identity:** Microsoft Entra ID with OAuth 2.0 / OpenID Connect access tokens.
- **Frontend:** Built via Vite (`npm run build`) and served via AWS CloudFront/S3 or containerized Nginx.

---

## 2. Pre-Deployment Checklist

- [ ] All 30 automated tests pass (`python -m pytest -v tests/`).
- [ ] Synthetic sales dataset generated (`ml/data/synthetic_sales.csv`).
- [ ] Machine learning model trained and artifact saved (`ml/artifacts/demand_model.joblib`).
- [ ] Microsoft Entra ID App Registrations completed with `CUSTOMER` and `STORE_OWNER` roles.
- [ ] AWS credentials configured with appropriate IAM deployment permissions.

---

## 3. Automated Stack Deployment via CloudFormation

Execute the deployment script:
```bash
./infrastructure/deploy.sh prod
```

Or deploy individual stacks in order:
1. `01-dynamodb.yaml` -> DynamoDB Tables & GSIs
2. `02-sns-alerting.yaml` -> SNS Alerting Topic
3. `03-iam-roles.yaml` -> Least-Privilege IAM Roles
4. `04-ecs-cluster-ecr.yaml` -> ECS Cluster & ECR Repositories
5. Docker Build & Push -> ECR image uploads
6. `05-ecs-services.yaml` -> ECS Fargate Services
7. `06-eventbridge-scheduler.yaml` -> Daily Prediction Scheduler

---

## 4. Building and Pushing Production Images

Tag your images with the git commit hash and `latest`:

```bash
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION="us-east-1"
REGISTRY="$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com"

aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $REGISTRY

# 1. Retail Store Service
docker build -t $REGISTRY/smart-retail/store-service-prod:latest -f services/retail-store/Dockerfile .
docker push $REGISTRY/smart-retail/store-service-prod:latest

# 2. Inventory & ML Service (packages model artifact)
docker build -t $REGISTRY/smart-retail/inventory-service-prod:latest -f services/inventory/Dockerfile .
docker push $REGISTRY/smart-retail/inventory-service-prod:latest

# 3. Warehouse Service
docker build -t $REGISTRY/smart-retail/warehouse-service-prod:latest -f services/warehouse/Dockerfile .
docker push $REGISTRY/smart-retail/warehouse-service-prod:latest
```

---

## 5. Frontend Deployment

To build the optimized static production bundle:
```bash
cd frontend
npm install
npm run build
```
The output is generated in `frontend/dist/`.
This folder can be deployed directly to:
- **AWS S3 + CloudFront CDN** for low latency and HTTPS termination.
- **Azure Static Web Apps**
- Or containerized with the provided `frontend/Dockerfile` using Nginx.
