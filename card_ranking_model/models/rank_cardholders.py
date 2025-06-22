"""
Cardholder Ranking Script
Loads trained model and ranks cardholders from real_data.csv
"""

import pandas as pd
import numpy as np
import joblib
import os
import sys

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import PATHS
from models.feature_engineering import FeatureEngineer

def load_model_and_pipeline():
    """Load the trained model and feature engineering pipeline"""
    model = joblib.load(PATHS['trained_model_file'])
    fe = FeatureEngineer()
    fe.load_pipeline()
    return model, fe

def prepare_data(df):
    """Prepare data for ranking (same preprocessing as training)"""
    # Map columns to expected schema
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
    
    # Aggregate per cardholder (take most recent record)
    df['last_active'] = pd.to_datetime(df['last_active'])
    df = df.sort_values('last_active').groupby('cardholder_id').tail(1)
    df = df.reset_index(drop=True)
    
    # Add missing columns with default values
    df['card_type'] = 'Standard_Card'
    df['usage_frequency_last_30_days'] = 10
    df['account_tenure_months'] = 12
    df['cashback_earning_potential'] = 0
    df['geographic_location'] = 'Unknown'
    df['created_at'] = df['last_active'] - pd.to_timedelta(365, unit='d')
    df['is_active'] = True
    
    return df

def rank_cardholders(model, fe, df):
    """Rank cardholders using the trained model"""
    # Transform data using the fitted pipeline
    X = fe.transform(df)
    
    # Get prediction probabilities (health scores)
    health_scores = model.predict_proba(X)[:, 1]  # Probability of being high-performing
    
    # Create results DataFrame
    results = df.copy()
    results['health_score'] = health_scores
    
    # Sort by health score (descending)
    results = results.sort_values('health_score', ascending=False).reset_index(drop=True)
    
    # Add ranking
    results['rank'] = results.index + 1
    
    return results

def main():
    """Main function to rank cardholders"""
    print("🔄 Loading trained model and pipeline...")
    model, fe = load_model_and_pipeline()
    
    print("📊 Loading real data...")
    data_file = os.path.join('data', 'real_data.csv')
    df = pd.read_csv(data_file)
    
    print("🔧 Preparing data...")
    df = prepare_data(df)
    
    print("🏆 Ranking cardholders...")
    ranked_results = rank_cardholders(model, fe, df)
    
    # Save results
    output_file = os.path.join('data', 'ranked_cardholders.csv')
    ranked_results.to_csv(output_file, index=False)
    
    print(f"✅ Rankings saved to {output_file}")
    print(f"📊 Total cardholders ranked: {len(ranked_results)}")
    
    # Display top 10
    print("\n🏅 Top 10 Cardholders:")
    top_10 = ranked_results[['cardholder_id', 'health_score', 'rank', 'credit_limit', 'transaction_success_rate', 'user_rating']].head(10)
    print(top_10.to_string(index=False))
    
    # Display statistics
    print(f"\n📈 Ranking Statistics:")
    print(f"   Highest health score: {ranked_results['health_score'].max():.3f}")
    print(f"   Lowest health score: {ranked_results['health_score'].min():.3f}")
    print(f"   Average health score: {ranked_results['health_score'].mean():.3f}")
    print(f"   Median health score: {ranked_results['health_score'].median():.3f}")

if __name__ == "__main__":
    main() 