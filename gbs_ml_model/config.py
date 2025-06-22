"""
Configuration settings for GBS model
"""

# Model Configuration
MODEL_CONFIG = {
    'input_size': 8,
    'hidden_size': 64,
    'num_layers': 2,
    'dropout': 0.2,
    'sequence_length': 10
}

# Training Configuration
TRAINING_CONFIG = {
    'batch_size': 32,
    'learning_rate': 0.001,
    'epochs': 30,
    'early_stopping_patience': 10,
    'gradient_clip_norm': 1.0
}

# Data Configuration
DATA_CONFIG = {
    'n_users': 500,
    'days': 90,
    'train_split': 0.8,
    'val_split': 0.2
}

# Fraud Detection Thresholds
FRAUD_THRESHOLDS = {
    'low_risk': 0.2,
    'high_risk': 0.5
}

# Feature Configuration
FEATURES = {
    'numerical': ['amount', 'daily_frequency'],
    'categorical': ['hour', 'day_of_week', 'merchant_category', 'city', 'device_type', 'payment_method'],
    'feature_columns': ['amount', 'hour', 'day_of_week', 'merchant_category', 'city', 'device_type', 'payment_method', 'daily_frequency']
}

# File Paths
PATHS = {
    'data_dir': 'data/',
    'model_dir': 'models/',
    'synthetic_data': 'data/synthetic/transactions.csv',
    'user_profiles': 'data/synthetic/user_profiles.csv',
    'best_model': 'models/saved_models/best_gbs_model.pth'
}