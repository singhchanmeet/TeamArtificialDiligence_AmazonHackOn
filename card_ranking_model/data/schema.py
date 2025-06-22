"""
Data schema definitions for Cardholder Ranking ML Model
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

class CardType(str, Enum):
    AMAZON_ICICI = "Amazon_ICICI"
    AXIS_FLIPKART = "Axis_Flipkart"
    HDFC_REGALIA = "HDFC_Regalia"
    SBI_CASHBACK = "SBI_Cashback"
    STANDARD_CARD = "Standard_Card"

class MerchantCategory(str, Enum):
    ECOMMERCE = "ecommerce"
    TRAVEL = "travel"
    DINING = "dining"
    FUEL = "fuel"
    GROCERY = "grocery"
    UTILITIES = "utilities"
    ENTERTAINMENT = "entertainment"

class TransactionStatus(str, Enum):
    SUCCESS = "success"
    FAILED = "failed"
    PENDING = "pending"
    CANCELLED = "cancelled"

class Cardholder(BaseModel):
    """Cardholder profile with all relevant features"""
    cardholder_id: str = Field(..., description="Unique identifier for cardholder")
    
    # Core Features
    credit_limit: float = Field(..., ge=0, description="Credit limit in INR")
    avg_repayment_days: float = Field(..., ge=1, le=30, description="Average days to repay")
    transaction_success_rate: float = Field(..., ge=0, le=1, description="Success rate of past transactions")
    response_time_sec: float = Field(..., ge=30, le=1800, description="Average response time in seconds")
    discount_hit_rate: float = Field(..., ge=0, le=1, description="Rate of successful discount applications")
    commission_acceptance: float = Field(..., ge=0, le=1, description="Willingness to accept commission")
    user_rating: float = Field(..., ge=1, le=5, description="Average user rating (1-5)")
    default_count: int = Field(..., ge=0, le=10, description="Number of payment defaults")
    
    # Advanced Features
    card_type: CardType = Field(..., description="Type of credit card")
    usage_frequency_last_30_days: int = Field(..., ge=0, le=50, description="Number of transactions in last 30 days")
    account_tenure_months: int = Field(..., ge=1, le=120, description="Account age in months")
    cashback_earning_potential: float = Field(..., ge=0, description="Potential cashback earnings")
    geographic_location: Optional[str] = Field(None, description="Geographic location for proximity matching")
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.now)
    last_active: datetime = Field(default_factory=datetime.now)
    is_active: bool = Field(default=True, description="Whether cardholder is currently active")

class Transaction(BaseModel):
    """Transaction record for training data"""
    transaction_id: str = Field(..., description="Unique transaction identifier")
    cardholder_id: str = Field(..., description="Cardholder involved in transaction")
    
    # Transaction Details
    amount: float = Field(..., ge=0, description="Transaction amount in INR")
    merchant_category: MerchantCategory = Field(..., description="Category of merchant")
    merchant_name: str = Field(..., description="Name of the merchant")
    
    # Transaction Outcome
    status: TransactionStatus = Field(..., description="Transaction status")
    discount_applied: bool = Field(..., description="Whether discount was successfully applied")
    commission_charged: float = Field(..., ge=0, description="Commission amount charged")
    response_time_sec: float = Field(..., ge=0, description="Time taken to respond")
    
    # Timestamps
    requested_at: datetime = Field(..., description="When transaction was requested")
    completed_at: Optional[datetime] = Field(None, description="When transaction was completed")
    
    # User Feedback
    user_rating: Optional[float] = Field(None, ge=1, le=5, description="User rating for this transaction")
    user_feedback: Optional[str] = Field(None, description="User feedback text")

class RankingRequest(BaseModel):
    """Request model for cardholder ranking API"""
    transaction_amount: float = Field(..., ge=0, description="Amount of transaction")
    merchant_category: MerchantCategory = Field(..., description="Category of merchant")
    merchant_name: Optional[str] = Field(None, description="Specific merchant name")
    user_location: Optional[str] = Field(None, description="User's geographic location")
    preferred_card_types: Optional[List[CardType]] = Field(None, description="Preferred card types")
    max_commission: Optional[float] = Field(None, ge=0, description="Maximum acceptable commission")
    urgency_level: Optional[str] = Field("normal", description="Urgency level: low, normal, high")

class RankingResponse(BaseModel):
    """Response model for cardholder ranking API"""
    request_id: str = Field(..., description="Unique request identifier")
    ranked_cardholders: List[Dict[str, Any]] = Field(..., description="Ranked list of cardholders")
    total_candidates: int = Field(..., description="Total number of available cardholders")
    processing_time_ms: float = Field(..., description="Time taken to process request")
    model_version: str = Field(..., description="Version of the ranking model used")
    class Config:
        protected_namespaces = ()

class HealthScore(BaseModel):
    """Health score calculation result"""
    cardholder_id: str = Field(..., description="Cardholder identifier")
    overall_score: float = Field(..., ge=0, le=1, description="Overall health score (0-1)")
    component_scores: Dict[str, float] = Field(..., description="Individual component scores")
    rank: int = Field(..., ge=1, description="Rank among available cardholders")
    confidence: float = Field(..., ge=0, le=1, description="Model confidence in this ranking")

class ModelMetrics(BaseModel):
    """Model performance metrics"""
    accuracy: float = Field(..., ge=0, le=1)
    precision: float = Field(..., ge=0, le=1)
    recall: float = Field(..., ge=0, le=1)
    f1_score: float = Field(..., ge=0, le=1)
    ndcg: float = Field(..., ge=0, le=1)
    map_score: float = Field(..., ge=0, le=1)
    training_date: datetime = Field(..., description="When model was last trained")
    model_version: str = Field(..., description="Model version identifier")
    class Config:
        protected_namespaces = () 