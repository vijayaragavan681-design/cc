import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from common.config import settings
from services.warehouse.app.routes import requests

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("warehouse_service")

app = FastAPI(
    title="Smart Retail Warehouse Service",
    description="Microservice responsible for receiving, tracking, and confirming store replenishment requests.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(requests.router)


@app.get("/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "service": "warehouse-service",
        "region": settings.aws_region,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("services.warehouse.app.main:app", host="0.0.0.0", port=settings.warehouse_service_port, reload=True)
