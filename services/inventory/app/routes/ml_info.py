from fastapi import APIRouter
from common.models import ModelMetadata
from services.inventory.app.services.predictor import DemandPredictor

router = APIRouter(prefix="/api/ml", tags=["ML Model Info"])


@router.get("/model-info", response_model=ModelMetadata)
def get_model_information():
    """Retrieve metadata, version, feature list, and evaluation metrics of the trained ML model."""
    predictor = DemandPredictor.get_instance()
    return predictor.get_model_info()
