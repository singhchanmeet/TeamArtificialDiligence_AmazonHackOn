"""
Configuration file for Cardholder Ranking ML Model
"""

import os
from typing import Dict, List

# Feature Weights for Health Score Calculation
HEALTH_SCORE_WEIGHTS = {
    'credit_limit': 0.20,
    'avg_repayment_days': 0.20,
    'transaction_success_rate': 0.20,
    'response_time_sec': 0.10,
    'discount_hit_rate': 0.10,
    'commission_acceptance': 0.05,
    'user_rating': 0.10,
    'default_count': 0.05
}

# Feature Ranges for Normalization
FEATURE_RANGES = {
    'credit_limit': (10000, 200000),
    'avg_repayment_days': (1, 30),
    'transaction_success_rate': (0.0, 1.0),
    'response_time_sec': (30, 1800),  # 30 seconds to 30 minutes
    'discount_hit_rate': (0.0, 1.0),
    'commission_acceptance': (0.0, 1.0),
    'user_rating': (1.0, 5.0),
    'default_count': (0, 10),
    'usage_frequency_last_30_days': (0, 50),
    'account_tenure_months': (1, 120),
    'cashback_earning_potential': (0, 5000)
}

# Card Types and their discount multipliers
CARD_TYPES = {
    'Amazon_ICICI': 1.2,
    'Axis_Flipkart': 1.15,
    'HDFC_Regalia': 1.1,
    'SBI_Cashback': 1.05,
    'Standard_Card': 1.0
}

# Merchant Categories and their card preferences
MERCHANT_CATEGORIES = {
    'ecommerce': ['Amazon_ICICI', 'Axis_Flipkart'],
    'travel': ['HDFC_Regalia', 'Standard_Card'],
    'dining': ['SBI_Cashback', 'Standard_Card'],
    'fuel': ['Standard_Card'],
    'grocery': ['Standard_Card']
}

# Model Hyperparameters
XGBOOST_PARAMS = {
    'objective': 'binary:logistic',
    'eval_metric': 'logloss',
    'max_depth': 6,
    'learning_rate': 0.1,
    'n_estimators': 100,
    'subsample': 0.8,
    'colsample_bytree': 0.8,
    'random_state': 42
}

LIGHTGBM_RANKER_PARAMS = {
    'objective': 'lambdarank',
    'metric': 'ndcg',
    'boosting_type': 'gbdt',
    'num_leaves': 31,
    'learning_rate': 0.05,
    'feature_fraction': 0.9,
    'bagging_fraction': 0.8,
    'bagging_freq': 5,
    'verbose': -1,
    'random_state': 42
}

# Data Generation Parameters
MOCK_DATA_CONFIG = {
    'num_cardholders': 1000,
    'num_transactions': 5000,
    'date_range_days': 365,
    'success_rate_range': (0.7, 0.98),
    'response_time_range': (60, 900),  # 1-15 minutes
    'credit_limit_range': (20000, 150000)
}

# API Configuration
API_CONFIG = {
    'host': '0.0.0.0',
    'port': 8000,
    'debug': True,
    'reload': True
}

# File Paths
PATHS = {
    'data_dir': 'data',
    'models_dir': 'models/saved',
    'logs_dir': 'logs',
    'mock_data_file': 'data/mock_cardholders.csv',
    'mock_transactions_file': 'data/mock_transactions.csv',
    'trained_model_file': 'models/saved/ranking_model.pkl',
    'feature_scaler_file': 'models/saved/feature_scaler.pkl'
}

# Create directories if they don't exist
for path in PATHS.values():
    if path.endswith(('.csv', '.pkl')):
        os.makedirs(os.path.dirname(path), exist_ok=True)
    else:
        os.makedirs(path, exist_ok=True)

# Evaluation Metrics
EVALUATION_METRICS = [
    'accuracy',
    'precision',
    'recall',
    'f1_score',
    'ndcg',
    'map'
]

# Logging Configuration
LOGGING_CONFIG = {
    'level': 'INFO',
    'format': '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    'file': 'logs/model.log'
} 