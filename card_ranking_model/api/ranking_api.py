"""
FastAPI Application for Real-time Cardholder Ranking
Provides REST API endpoints for instant cardholder ranking
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from contextlib import asynccontextmanager
import pandas as pd
import numpy as np
import joblib
import os
import sys
import time
import uuid
from datetime import datetime

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import PATHS
from models.feature_engineering import FeatureEngineer

# Global variables for model and pipeline
model = None
feature_engineer = None

def load_model_and_pipeline():
    """Load the trained model and feature engineering pipeline"""
    global model, feature_engineer
    
    try:
        # Load model
        model = joblib.load(PATHS['trained_model_file'])
        
        # Load feature engineering pipeline
        feature_engineer = FeatureEngineer()
        feature_engineer.load_pipeline()
        
        print("✅ Model and pipeline loaded successfully")
        return True
    except Exception as e:
        print(f"❌ Failed to load model/pipeline: {e}")
        return False

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown events"""
    # Startup
    print("🚀 Starting Cardholder Ranking API...")
    success = load_model_and_pipeline()
    if not success:
        print("⚠️ Warning: Model loading failed. API may not work correctly.")
    
    yield
    
    # Shutdown
    print("🛑 Shutting down Cardholder Ranking API...")

# Initialize FastAPI app with lifespan
app = FastAPI(
    title="Cardholder Ranking API",
    description="Real-time API for ranking credit card holders based on ML model",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models for API requests/responses
class CardholderRequest(BaseModel):
    """Single cardholder data for ranking"""
    user_id: str = Field(..., description="Unique cardholder identifier")
    credit_limit: float = Field(..., ge=0, description="Credit limit in INR")
    avg_repayment_time: float = Field(..., ge=1, le=60, description="Average repayment time in days")
    transaction_success_rate: float = Field(..., ge=0, le=1, description="Transaction success rate (0-1)")
    response_speed: float = Field(..., ge=0, description="Response speed in seconds")
    discount_hit_rate: float = Field(..., ge=0, le=1, description="Discount success rate (0-1)")
    commission_acceptance_rate: float = Field(..., ge=0, le=1, description="Commission acceptance rate (0-1)")
    user_rating: int = Field(..., ge=1, le=5, description="User rating (1-5)")
    default_count: int = Field(..., ge=0, le=10, description="Number of defaults")
    record_timestamp: Optional[str] = Field(None, description="Timestamp of record")

class BatchRankingRequest(BaseModel):
    """Batch ranking request"""
    cardholders: List[CardholderRequest] = Field(..., description="List of cardholders to rank")
    merchant_category: Optional[str] = Field(None, description="Merchant category for context")

class RankingResponse(BaseModel):
    """Response for ranking requests"""
    request_id: str = Field(..., description="Unique request identifier")
    timestamp: str = Field(..., description="Request timestamp")
    processing_time_ms: float = Field(..., description="Processing time in milliseconds")
    total_cardholders: int = Field(..., description="Total cardholders processed")
    ranked_cardholders: List[Dict[str, Any]] = Field(..., description="Ranked cardholders with scores")

class HealthResponse(BaseModel):
    """Health check response"""
    status: str = Field(..., description="Service status")
    model_loaded: bool = Field(..., description="Whether model is loaded")
    feature_pipeline_loaded: bool = Field(..., description="Whether feature pipeline is loaded")
    timestamp: str = Field(..., description="Current timestamp")

def prepare_cardholder_data(cardholder: CardholderRequest) -> Dict[str, Any]:
    """Prepare single cardholder data for processing"""
    return {
        'cardholder_id': cardholder.user_id,
        'credit_limit': cardholder.credit_limit,
        'avg_repayment_days': cardholder.avg_repayment_time,
        'transaction_success_rate': cardholder.transaction_success_rate,
        'response_time_sec': cardholder.response_speed,
        'discount_hit_rate': cardholder.discount_hit_rate,
        'commission_acceptance': cardholder.commission_acceptance_rate,
        'user_rating': cardholder.user_rating,
        'default_count': cardholder.default_count,
        'last_active': cardholder.record_timestamp or datetime.now().isoformat(),
        'card_type': 'Standard_Card',
        'usage_frequency_last_30_days': 10,
        'account_tenure_months': 12,
        'cashback_earning_potential': 0,
        'geographic_location': 'Unknown',
        'created_at': datetime.now().isoformat(),
        'is_active': True
    }

def rank_cardholders(cardholders_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Rank cardholders using the trained model"""
    if not model or not feature_engineer:
        raise HTTPException(status_code=500, detail="Model not loaded")
    
    try:
        # Convert to DataFrame
        df = pd.DataFrame(cardholders_data)
        
        # Transform features
        X = feature_engineer.transform(df)
        
        # Get predictions
        health_scores = model.predict_proba(X)[:, 1]
        
        # Create results
        results = []
        for i, (_, row) in enumerate(df.iterrows()):
            result = {
                'cardholder_id': row['cardholder_id'],
                'health_score': float(health_scores[i]),
                'rank': 0,  # Will be set after sorting
                'credit_limit': float(row['credit_limit']),
                'transaction_success_rate': float(row['transaction_success_rate']),
                'avg_repayment_days': float(row['avg_repayment_days']),
                'response_time_sec': float(row['response_time_sec']),
                'discount_hit_rate': float(row['discount_hit_rate']),
                'commission_acceptance': float(row['commission_acceptance']),
                'user_rating': int(row['user_rating']),
                'default_count': int(row['default_count'])
            }
            results.append(result)
        
        # Sort by health score and assign ranks
        results.sort(key=lambda x: x['health_score'], reverse=True)
        for i, result in enumerate(results):
            result['rank'] = i + 1
        
        return results
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ranking failed: {str(e)}")

@app.get("/", response_model=Dict[str, str])
async def root():
    """Root endpoint"""
    return {
        "message": "Cardholder Ranking API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health"
    }

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy" if model and feature_engineer else "unhealthy",
        model_loaded=model is not None,
        feature_pipeline_loaded=feature_engineer is not None,
        timestamp=datetime.now().isoformat()
    )

@app.post("/rank-single", response_model=Dict[str, Any])
async def rank_single_cardholder(cardholder: CardholderRequest):
    """Rank a single cardholder"""
    start_time = time.time()
    
    try:
        # Prepare data
        cardholder_data = prepare_cardholder_data(cardholder)
        
        # Rank cardholder
        ranked_results = rank_cardholders([cardholder_data])
        
        processing_time = (time.time() - start_time) * 1000
        
        return {
            "request_id": str(uuid.uuid4()),
            "timestamp": datetime.now().isoformat(),
            "processing_time_ms": round(processing_time, 2),
            "cardholder": ranked_results[0]
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/rank-batch", response_model=RankingResponse)
async def rank_batch_cardholders(request: BatchRankingRequest):
    """Rank multiple cardholders in batch"""
    start_time = time.time()
    
    try:
        # Prepare data
        cardholders_data = [prepare_cardholder_data(ch) for ch in request.cardholders]
        
        # Rank cardholders
        ranked_results = rank_cardholders(cardholders_data)
        
        processing_time = (time.time() - start_time) * 1000
        
        return RankingResponse(
            request_id=str(uuid.uuid4()),
            timestamp=datetime.now().isoformat(),
            processing_time_ms=round(processing_time, 2),
            total_cardholders=len(ranked_results),
            ranked_cardholders=ranked_results
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/rank-top", response_model=Dict[str, Any])
async def get_top_cardholders(request: BatchRankingRequest, top_k: int = 10):
    """Get top K cardholders from a batch"""
    if top_k < 1 or top_k > 100:
        raise HTTPException(status_code=400, detail="top_k must be between 1 and 100")
    
    start_time = time.time()
    
    try:
        # Prepare data
        cardholders_data = [prepare_cardholder_data(ch) for ch in request.cardholders]
        
        # Rank cardholders
        ranked_results = rank_cardholders(cardholders_data)
        
        # Get top K
        top_results = ranked_results[:top_k]
        
        processing_time = (time.time() - start_time) * 1000
        
        return {
            "request_id": str(uuid.uuid4()),
            "timestamp": datetime.now().isoformat(),
            "processing_time_ms": round(processing_time, 2),
            "total_cardholders": len(ranked_results),
            "top_k": top_k,
            "top_cardholders": top_results
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/model-info", response_model=Dict[str, Any])
async def get_model_info():
    """Get information about the loaded model"""
    if not model:
        raise HTTPException(status_code=500, detail="Model not loaded")
    
    return {
        "model_type": type(model).__name__,
        "model_params": model.get_params(),
        "feature_count": len(feature_engineer.feature_names) if feature_engineer else 0,
        "feature_names": feature_engineer.feature_names[:10] if feature_engineer else [],
        "model_size_mb": round(os.path.getsize(PATHS['trained_model_file']) / (1024 * 1024), 2)
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True) 