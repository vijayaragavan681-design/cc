import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from common.config import settings
from services.inventory.app.routes import inventory, predictions, alerts, ml_info
from services.inventory.app.services.predictor import DemandPredictor

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("inventory_service")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Preload ML model artifact on startup
    logger.info("Initializing Inventory & ML Service: preloading ML model artifact...")
    DemandPredictor.get_instance()
    yield
    logger.info("Shutting down Inventory & ML Service.")


app = FastAPI(
    title="Smart Retail Inventory & ML Prediction Service",
    description="Microservice responsible for inventory state, ML demand forecasting, stock classification, and alert dispatch.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(inventory.router)
app.include_router(predictions.router)
app.include_router(alerts.router)
app.include_router(ml_info.router)


@app.get("/health", tags=["Health"])
def health_check():
    predictor = DemandPredictor.get_instance()
    has_model = predictor._pipeline is not None
    return {
        "status": "healthy",
        "service": "inventory-ml-service",
        "model_loaded": has_model,
        "model_version": settings.model_version,
        "region": settings.aws_region,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("services.inventory.app.main:app", host="0.0.0.0", port=settings.inventory_service_port, reload=True)
