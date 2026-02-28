
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text, union_all
from typing import List, Dict, Any

from backend.app.core.deps import get_db
from backend.app.modules.order_tracking import models

router = APIRouter()


async def get_order_tracking_fields_config(db: Session) -> Dict[str, List[str]]:
    """Helper function to get order tracking fields configuration"""
    try:
        setting = (
            db.query(models.AdminSettings)
            .filter(models.AdminSettings.setting_key == "order-tracking-fields")
            .first()
        )
        if setting and setting.setting_value:
            try:
                config = setting.setting_value

                # Create a normalized mapping between model names and config keys
                normalized_config = {
                    "Cutting": config.get("cutting", []),
                    "Lamination": config.get("lamination", []),
                    "Printing": config.get("printing", []),
                    "WarehouseToDispatch": config.get("warehouse_to_dispatch", []),
                    "DispatchToProduction": config.get("dispatch_to_production", []),
                    "Extruder": config.get("extruder", []),
                    "RawSlitting": config.get("raw_slitting", []),
                    "PVC": config.get("pvc", []),
                    "Slitting": config.get("slitting", []),
                }

                return normalized_config
            except Exception as e:
                print(f"Error parsing order tracking fields: {e}")

        # Default configuration (include all fields)
        return {
            "Cutting": [],
            "Lamination": [],
            "Printing": [],
            "WarehouseToDispatch": [],
            "DispatchToProduction": [],
            "Extruder": [],
            "RawSlitting": [],
            "PVC": [],
            "Slitting": [],
        }
    except Exception as e:
        print(f"Error getting order tracking fields config: {e}")
        return {}


async def fetch_table_data(
    db: Session,
    model: Any,
    order_number: str,
    include_fields: List[str] = [],
) -> List[Dict[str, Any]]:
    """Helper function to fetch order data from a specific table"""
    try:
        # Determine attributes to include
        if include_fields:
            attributes = [
                getattr(model, field)
                for field in include_fields
                if hasattr(model, field)
            ]
        else:
            attributes = [c for c in model.__table__.columns]

        # Ensure order_number is always included
        if "order_number" not in [attr.name for attr in attributes]:
            attributes.append(model.order_number)

        # Fetch data
        data = db.query(*attributes).filter(model.order_number == order_number).all()

        return [dict(row._mapping) for row in data]
    except Exception as e:
        print(f"Error fetching data from {model.__name__}: {e}")
        return []


@router.get("/track/{order_number}", response_model=Dict[str, Any])
async def track_order(order_number: str, db: Session = Depends(get_db)):
    """Track order across all tables"""
    if not order_number:
        raise HTTPException(status_code=400, detail="Order number is required")

    # Get display fields configuration
    fields_config = await get_order_tracking_fields_config(db)

    # Fetch data from all tables related to the order number
    cutting_data = await fetch_table_data(
        db, models.Cutting, order_number, fields_config.get("Cutting", [])
    )
    lamination_data = await fetch_table_data(
        db, models.Lamination, order_number, fields_config.get("Lamination", [])
    )
    printing_data = await fetch_table_data(
        db, models.Printing, order_number, fields_config.get("Printing", [])
    )
    warehouse_to_dispatch_data = await fetch_table_data(
        db,
        models.WarehouseToDispatch,
        order_number,
        fields_config.get("WarehouseToDispatch", []),
    )
    dispatch_to_production_data = await fetch_table_data(
        db,
        models.DispatchToProduction,
        order_number,
        fields_config.get("DispatchToProduction", []),
    )
    extruder_data = await fetch_table_data(
        db, models.Extruder, order_number, fields_config.get("Extruder", [])
    )
    raw_slitting_data = await fetch_table_data(
        db, models.RawSlitting, order_number, fields_config.get("RawSlitting", [])
    )
    pvc_data = await fetch_table_data(
        db, models.PVC, order_number, fields_config.get("PVC", [])
    )
    slitting_data = await fetch_table_data(
        db, models.Slitting, order_number, fields_config.get("Slitting", [])
    )

    # Combine all data
    order_data = {
        "orderNumber": order_number,
        "cutting": cutting_data,
        "lamination": lamination_data,
        "printing": printing_data,
        "warehouseToDispatch": warehouse_to_dispatch_data,
        "dispatchToProduction": dispatch_to_production_data,
        "extruder": extruder_data,
        "rawSlitting": raw_slitting_data,
        "pvc": pvc_data,
        "slitting": slitting_data,
    }

    return {"orderData": order_data}


@router.get("/search", response_model=Dict[str, Any])
async def search_orders(
    query: str, limit: int = 20, db: Session = Depends(get_db)
):
    """Search orders"""
    if not query or len(query) < 2:
        raise HTTPException(
            status_code=400, detail="Search query must be at least 2 characters"
        )

    search_term = f"%%{query}%%"

    # Search for orders across all tables
    queries = [
        db.query(models.Cutting.order_number, text("'cutting' as source")).filter(
            models.Cutting.order_number.like(search_term)
        ),
        db.query(
            models.Lamination.order_number, text("'lamination' as source")
        ).filter(models.Lamination.order_number.like(search_term)),
        db.query(models.Printing.order_number, text("'printing' as source")).filter(
            models.Printing.order_number.like(search_term)
        ),
        db.query(
            models.WarehouseToDispatch.order_number,
            text("'warehouse_to_dispatch' as source"),
        ).filter(models.WarehouseToDispatch.order_number.like(search_term)),
        db.query(
            models.DispatchToProduction.order_number,
            text("'dispatch_to_production' as source"),
        ).filter(models.DispatchToProduction.order_number.like(search_term)),
        db.query(models.Extruder.order_number, text("'extruder' as source")).filter(
            models.Extruder.order_number.like(search_term)
        ),
        db.query(
            models.RawSlitting.order_number, text("'raw_slitting' as source")
        ).filter(models.RawSlitting.order_number.like(search_term)),
        db.query(models.PVC.order_number, text("'pvc' as source")).filter(
            models.PVC.order_number.like(search_term)
        ),
        db.query(models.Slitting.order_number, text("'slitting' as source")).filter(
            models.Slitting.order_number.like(search_term)
        ),
    ]

    # Combine all queries
    combined_query = union_all(*queries)
    results = db.execute(combined_query.limit(limit)).fetchall()

    # Remove duplicates
    unique_results = list(
        {
            result.order_number: {"order_number": result.order_number, "source": result.source}
            for result in results
        }.values()
    )

    return {"results": unique_results}
