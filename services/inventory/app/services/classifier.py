from typing import Dict, Any
from common.config import settings
from common.models import ClassificationEnum


class InventoryClassifier:
    @staticmethod
    def classify(
        current_stock: int,
        predicted_demand_7d: float,
        safety_factor: float = None,
        excess_coverage_days: int = None,
    ) -> Dict[str, Any]:
        """
        Classifies stock level using configurable mathematical policy:
        - LOW: available stock < predicted_demand_7d * safety_factor
        - NORMAL: stock is adequate for forecast demand and buffer
        - EXCESS: stock coverage exceeds excess_coverage_days
        """
        factor = safety_factor if safety_factor is not None else settings.safety_stock_factor
        max_days = excess_coverage_days if excess_coverage_days is not None else settings.excess_stock_coverage_days

        daily_demand = max(0.1, predicted_demand_7d / 7.0)
        safety_stock = round(predicted_demand_7d * factor, 1)
        coverage_days = round(current_stock / daily_demand, 1)

        if current_stock < safety_stock:
            classification = ClassificationEnum.LOW
            explanation = (
                f"Stock ({current_stock} units) is below safety stock threshold of {safety_stock} units "
                f"(7-day forecast {predicted_demand_7d:.1f} × {factor} safety factor). "
                f"Current estimated coverage is only {coverage_days} days. Replenishment recommended."
            )
        elif coverage_days > max_days:
            classification = ClassificationEnum.EXCESS
            explanation = (
                f"Stock ({current_stock} units) provides {coverage_days} days of inventory coverage, "
                f"exceeding the maximum target of {max_days} days. High risk of capital lockup or batch expiry."
            )
        else:
            classification = ClassificationEnum.NORMAL
            explanation = (
                f"Stock ({current_stock} units) is in the optimal range with {coverage_days} days of coverage "
                f"(projected 7-day demand is {predicted_demand_7d:.1f} units)."
            )

        return {
            "classification": classification,
            "safety_stock": safety_stock,
            "coverage_days": coverage_days,
            "explanation": explanation,
        }
