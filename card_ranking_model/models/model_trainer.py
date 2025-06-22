"""
Model Trainer for Cardholder Ranking ML Model
Trains a classifier using real_data.csv and saves the model and feature pipeline
"""

import pandas as pd
import numpy as np
import os
import joblib
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, roc_auc_score
from xgboost import XGBClassifier

from config import PATHS
from models.feature_engineering import FeatureEngineer, create_training_labels

# 1. Load real data
DATA_FILE = os.path.join('data', 'real_data.csv')
df = pd.read_csv(DATA_FILE)

# 2. Map columns to expected schema
COLUMN_MAP = {
    'user_id': 'cardholder_id',
    'credit_limit': 'credit_limit',
    'avg_repayment_time': 'avg_repayment_days',
    'transaction_success_rate': 'transaction_success_rate',
    'response_speed': 'response_time_sec',
    'discount_hit_rate': 'discount_hit_rate',
    'commission_acceptance_rate': 'commission_acceptance',
    'user_rating': 'user_rating',
    'default_count': 'default_count',
    'record_timestamp': 'last_active',
}
df = df.rename(columns=COLUMN_MAP)

# 3. Aggregate per cardholder (take most recent record for each cardholder)
df['last_active'] = pd.to_datetime(df['last_active'])
df = df.sort_values('last_active').groupby('cardholder_id').tail(1)
df = df.reset_index(drop=True)

# 4. Add missing columns with default values
def add_missing_columns(df):
    df['card_type'] = 'Standard_Card'
    df['usage_frequency_last_30_days'] = 10
    df['account_tenure_months'] = 12
    df['cashback_earning_potential'] = 0
    df['geographic_location'] = 'Unknown'
    df['created_at'] = df['last_active'] - pd.to_timedelta(365, unit='d')
    df['is_active'] = True
    return df

df = add_missing_columns(df)

# 5. Feature engineering
fe = FeatureEngineer()
labels = (df['transaction_success_rate'] > df['transaction_success_rate'].median()).astype(int)
X, _ = fe.fit_transform(df, pd.DataFrame(), labels)

# 6. Train/test split
X_train, X_test, y_train, y_test = train_test_split(X, labels, test_size=0.2, random_state=42, stratify=labels)

# 7. Train classifier
clf = XGBClassifier(
    n_estimators=100,
    max_depth=5,
    learning_rate=0.1,
    subsample=0.8,
    colsample_bytree=0.8,
    random_state=42,
    use_label_encoder=False,
    eval_metric='logloss'
)
clf.fit(X_train, y_train)

# 8. Evaluate
y_pred = clf.predict(X_test)
y_proba = clf.predict_proba(X_test)[:, 1]
print("\nClassification Report:")
print(classification_report(y_test, y_pred))
print(f"ROC AUC: {roc_auc_score(y_test, y_proba):.3f}")

# 9. Save model and pipeline
os.makedirs(PATHS['models_dir'], exist_ok=True)
model_path = PATHS['trained_model_file']
joblib.dump(clf, model_path)
fe.save_pipeline()
print(f"✅ Model saved to {model_path}") 