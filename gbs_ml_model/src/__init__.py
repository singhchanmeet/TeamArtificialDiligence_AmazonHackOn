"""
GBS Fraud Detection System
A True Hybrid fraud detection system combining ML and rule-based approaches
"""

from .true_hybrid_detector import TrueHybridFraudDetector
from .ml_fraud_detector import MLFraudDetector
from .rule_based_detector import RuleBasedFraudDetector

__version__ = "2.0.0"
__author__ = "GBS Fraud Detection Team"

__all__ = [
    'TrueHybridFraudDetector',
    'MLFraudDetector', 
    'RuleBasedFraudDetector'
] 