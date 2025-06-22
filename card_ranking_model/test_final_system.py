"""
Final System Test
Comprehensive test of the entire cardholder ranking system
"""

import pandas as pd
import numpy as np
import joblib
import os
import sys
import time

# Add current directory to path
sys.path.append('.')

from config import PATHS
from models.feature_engineering import FeatureEngineer

def test_model_loading():
    """Test if the trained model loads correctly"""
    print("🧪 Testing Model Loading...")
    try:
        model = joblib.load(PATHS['trained_model_file'])
        print("✅ Model loaded successfully")
        print(f"   Model type: {type(model).__name__}")
        print(f"   Model parameters: {model.get_params()}")
        return True
    except Exception as e:
        print(f"❌ Model loading failed: {e}")
        return False

def test_feature_pipeline():
    """Test if the feature engineering pipeline loads correctly"""
    print("\n🧪 Testing Feature Pipeline...")
    try:
        fe = FeatureEngineer()
        fe.load_pipeline()
        print("✅ Feature pipeline loaded successfully")
        print(f"   Number of features: {len(fe.feature_names)}")
        print(f"   Feature names: {fe.feature_names[:5]}...")
        return True
    except Exception as e:
        print(f"❌ Feature pipeline loading failed: {e}")
        return False

def test_end_to_end_ranking():
    """Test complete ranking pipeline"""
    print("\n🧪 Testing End-to-End Ranking...")
    try:
        # Load model and pipeline
        model = joblib.load(PATHS['trained_model_file'])
        fe = FeatureEngineer()
        fe.load_pipeline()
        
        # Load test data
        test_file = os.path.join('data', 'testing_user_credit_behavior_data_one_per_user.csv')
        df = pd.read_csv(test_file)
        
        # Prepare data
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
        
        # Add missing columns
        df['card_type'] = 'Standard_Card'
        df['usage_frequency_last_30_days'] = 10
        df['account_tenure_months'] = 12
        df['cashback_earning_potential'] = 0
        df['geographic_location'] = 'Unknown'
        df['created_at'] = pd.to_datetime(df['last_active']) - pd.to_timedelta(365, unit='d')
        df['is_active'] = True
        
        # Transform features
        X = fe.transform(df)
        
        # Get predictions
        health_scores = model.predict_proba(X)[:, 1]
        
        # Create results
        results = df.copy()
        results['health_score'] = health_scores
        results = results.sort_values('health_score', ascending=False).reset_index(drop=True)
        results['rank'] = results.index + 1
        
        print("✅ End-to-end ranking completed successfully")
        print(f"   Processed {len(results)} cardholders")
        print(f"   Health score range: {results['health_score'].min():.3f} - {results['health_score'].max():.3f}")
        print(f"   Top performer: {results.iloc[0]['cardholder_id']} (Score: {results.iloc[0]['health_score']:.3f})")
        
        return True
    except Exception as e:
        print(f"❌ End-to-end ranking failed: {e}")
        return False

def test_performance():
    """Test system performance"""
    print("\n🧪 Testing Performance...")
    try:
        start_time = time.time()
        
        # Load model and pipeline
        model = joblib.load(PATHS['trained_model_file'])
        fe = FeatureEngineer()
        fe.load_pipeline()
        
        # Load test data
        test_file = os.path.join('data', 'testing_user_credit_behavior_data_one_per_user.csv')
        df = pd.read_csv(test_file)
        
        # Prepare data
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
        
        # Add missing columns
        df['card_type'] = 'Standard_Card'
        df['usage_frequency_last_30_days'] = 10
        df['account_tenure_months'] = 12
        df['cashback_earning_potential'] = 0
        df['geographic_location'] = 'Unknown'
        df['created_at'] = pd.to_datetime(df['last_active']) - pd.to_timedelta(365, unit='d')
        df['is_active'] = True
        
        # Transform and predict
        X = fe.transform(df)
        health_scores = model.predict_proba(X)[:, 1]
        
        end_time = time.time()
        processing_time = end_time - start_time
        
        print(f"✅ Performance test completed")
        print(f"   Processing time: {processing_time:.3f} seconds")
        print(f"   Time per cardholder: {processing_time/len(df)*1000:.2f} ms")
        
        return True
    except Exception as e:
        print(f"❌ Performance test failed: {e}")
        return False

def main():
    """Run all tests"""
    print("🚀 FINAL SYSTEM TEST")
    print("=" * 60)
    
    tests = [
        test_model_loading,
        test_feature_pipeline,
        test_end_to_end_ranking,
        test_performance
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        if test():
            passed += 1
    
    print("\n" + "=" * 60)
    print(f"📊 TEST RESULTS: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! System is ready for production.")
    else:
        print("⚠️ Some tests failed. Please check the issues above.")
    
    return passed == total

if __name__ == "__main__":
    main() 