.PHONY: help install generate-data train-model evaluate-model test init-db seed-db run-retail run-inventory run-warehouse run-frontend docker-build docker-up docker-down clean

PYTHON ?= .venv/Scripts/python
PIP ?= .venv/Scripts/pip
NPM ?= npm

help:
	@echo "Smart Retail Inventory & Demand Forecasting System"
	@echo ""
	@echo "Available commands:"
	@echo "  make install         Install all backend and frontend dependencies"
	@echo "  make generate-data   Generate synthetic sales dataset (30+ products, 180+ days, 3 stores)"
	@echo "  make train-model     Train regression model and save artifact to ml/artifacts/"
	@echo "  make evaluate-model  Evaluate trained model against baselines"
	@echo "  make test            Run automated test suite"
	@echo "  make init-db         Create DynamoDB tables (local or AWS)"
	@echo "  make seed-db         Seed initial inventory and sales data"
	@echo "  make run-retail      Run Retail Store Service (Port 8001)"
	@echo "  make run-inventory   Run Inventory & ML Service (Port 8002)"
	@echo "  make run-warehouse   Run Warehouse Service (Port 8003)"
	@echo "  make run-frontend    Run React Vite dev server (Port 3000)"
	@echo "  make docker-build    Build all Docker images"
	@echo "  make docker-up       Start full stack via Docker Compose"
	@echo "  make docker-down     Stop Docker Compose stack"
	@echo "  make clean           Clean caches and temp files"

install:
	$(PIP) install -r requirements.txt
	cd frontend && $(NPM) install

generate-data:
	$(PYTHON) ml/generate_dataset.py

train-model:
	$(PYTHON) ml/train_model.py

evaluate-model:
	$(PYTHON) ml/evaluate_model.py

test:
	$(PYTHON) -m pytest -v tests/

init-db:
	$(PYTHON) scripts/init_dynamodb_tables.py

seed-db:
	$(PYTHON) scripts/seed_sample_data.py

run-retail:
	$(PYTHON) -m uvicorn services.retail_store.app.main:app --host 0.0.0.0 --port 8001 --reload

run-inventory:
	$(PYTHON) -m uvicorn services.inventory.app.main:app --host 0.0.0.0 --port 8002 --reload

run-warehouse:
	$(PYTHON) -m uvicorn services.warehouse.app.main:app --host 0.0.0.0 --port 8003 --reload

run-frontend:
	cd frontend && $(NPM) run dev

docker-build:
	docker compose build

docker-up:
	docker compose up -d

docker-down:
	docker compose down

clean:
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type d -name ".pytest_cache" -exec rm -rf {} +
