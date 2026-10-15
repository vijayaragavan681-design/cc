import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from common.config import settings
from services.retail_store.app.routes import stores, billing, alerts

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("retail_store_service")

app = FastAPI(
    title="Smart Retail Store Service",
    description="Microservice responsible for store catalog, product inventory, atomic customer billing, and store alerts.",
    version="1.0.0",
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict to frontend origin in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(stores.router)
app.include_router(billing.router)
app.include_router(alerts.router)


@app.get("/health", tags=["Health"])
def health_check():
    """Health check endpoint for ECS and container orchestrators."""
    return {
        "status": "healthy",
        "service": "retail-store-service",
        "auth_mode": settings.auth_mode,
        "region": settings.aws_region,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("services.retail_store.app.main:app", host="0.0.0.0", port=settings.retail_store_service_port, reload=True)
