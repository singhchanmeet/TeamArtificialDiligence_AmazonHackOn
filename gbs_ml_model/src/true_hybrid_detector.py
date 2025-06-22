#!/usr/bin/env python3
"""
True Hybrid Fraud Detection System
Combines ML models (Gradient Boosting, XGBoost, LightGBM) with rule-based logic
"""

import pandas as pd
import numpy as np
import pickle
import joblib
import json
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from rule_based_detector import RuleBasedFraudDetector
from ml_fraud_detector import MLFraudDetector
from config import FRAUD_THRESHOLDS

class TrueHybridFraudDetector:
    """True hybrid fraud detection system combining ML and rule-based approaches"""
    
    def __init__(self):
        print("🚀 Initializing True Hybrid Fraud Detector...")
        
        # Initialize rule-based detector
        self.rule_detector = RuleBasedFraudDetector()
        print("✅ Rule-based detector initialized")
        
        # Initialize ML detector
        self.ml_detector = MLFraudDetector()
        print("✅ ML detector initialized")
        
        # Always initialize these attributes to avoid attribute errors
        self.feature_names = None
        self.label_encoders = {}
        self.scaler = None
        self.ml_model = None
        
        # Load trained ML models
        self._load_ml_models()
        
        # Hybrid weights (can be tuned)
        self.ml_weight = 0.7  # 70% weight to ML predictions
        self.rule_weight = 0.3  # 30% weight to rule-based predictions
        
        print("🎯 True hybrid system ready: ML + Rule-based")
    
    def _load_ml_models(self):
        """Load trained ML models and preprocessing components"""
        try:
            # Try to load improved model first
            improved_model_path = '../models/saved_models/improved_ml_model.pkl'
            improved_feature_path = '../models/saved_models/improved_feature_names.json'
            improved_encoder_path = '../models/saved_models/improved_label_encoders.pkl'
            improved_scaler_path = '../models/saved_models/improved_scaler.pkl'
            if os.path.exists(improved_model_path):
                with open(improved_model_path, 'rb') as f:
                    self.ml_model = pickle.load(f)
                print("✅ Improved ML model loaded")
                if os.path.exists(improved_feature_path):
                    with open(improved_feature_path, 'r') as f:
                        self.feature_names = json.load(f).get('feature_names')
                    print("✅ Improved feature names loaded")
                if os.path.exists(improved_encoder_path):
                    with open(improved_encoder_path, 'rb') as f:
                        self.label_encoders = pickle.load(f)
                    print("✅ Improved label encoders loaded")
                if os.path.exists(improved_scaler_path):
                    with open(improved_scaler_path, 'rb') as f:
                        self.scaler = pickle.load(f)
                    print("✅ Improved scaler loaded")
                return
            # Fallback to old model
            model_path = 'models/saved_models/best_ml_model.pkl'
            if os.path.exists(model_path):
                with open(model_path, 'rb') as f:
                    self.ml_model = pickle.load(f)
                print("✅ Best ML model loaded")
            else:
                print("⚠️  Best ML model not found, using default")
                self.ml_model = None
            
            # Load feature names
            feature_path = 'models/saved_models/ml_feature_names.json'
            if os.path.exists(feature_path):
                with open(feature_path, 'r') as f:
                    self.feature_names = json.load(f)
                print("✅ Feature names loaded")
            else:
                self.feature_names = None
            
            # Load label encoders
            encoder_path = 'models/saved_models/ml_label_encoders.pkl'
            if os.path.exists(encoder_path):
                with open(encoder_path, 'rb') as f:
                    self.label_encoders = pickle.load(f)
                print("✅ Label encoders loaded")
            else:
                self.label_encoders = {}
            
            # Load scaler
            scaler_path = 'models/saved_models/ml_scaler.pkl'
            if os.path.exists(scaler_path):
                with open(scaler_path, 'rb') as f:
                    self.scaler = pickle.load(f)
                print("✅ Scaler loaded")
            else:
                self.scaler = None
                
        except Exception as e:
            print(f"⚠️  Error loading ML models: {e}")
            self.ml_model = None
            self.feature_names = None
            self.label_encoders = {}
            self.scaler = None
    
    def _prepare_ml_features(self, transaction, user_history=None):
        """Prepare features for ML model prediction - aligned with improved model"""
        try:
            # Basic features (matching improved model expectations)
            features = {
                'amount': transaction['amount'],
                'hour_of_day': transaction['hour_of_day'],
                'merchant_category': str(transaction['merchant_category']),
                'city': str(transaction['city']),
                'payment_method': str(transaction['payment_method'])
            }
            
            # Add day_of_week if available
            if 'day_of_week' in transaction:
                features['day_of_week'] = transaction['day_of_week']
            else:
                # Calculate from timestamp if available
                try:
                    from datetime import datetime
                    timestamp = pd.to_datetime(transaction['timestamp'])
                    features['day_of_week'] = timestamp.dayofweek
                except:
                    features['day_of_week'] = 0
            
            # Only the 18 features expected by the model
            features['amount_log'] = np.log1p(transaction['amount'])
            features['amount_sqrt'] = np.sqrt(transaction['amount'])
            
            # Create amount bins (0-9) - simplified to avoid pandas Series issues
            try:
                amount = transaction['amount']
                if amount <= 10000:
                    features['amount_bin'] = 0
                elif amount <= 20000:
                    features['amount_bin'] = 1
                elif amount <= 30000:
                    features['amount_bin'] = 2
                elif amount <= 40000:
                    features['amount_bin'] = 3
                elif amount <= 50000:
                    features['amount_bin'] = 4
                elif amount <= 60000:
                    features['amount_bin'] = 5
                elif amount <= 70000:
                    features['amount_bin'] = 6
                elif amount <= 80000:
                    features['amount_bin'] = 7
                elif amount <= 90000:
                    features['amount_bin'] = 8
                else:
                    features['amount_bin'] = 9
            except:
                features['amount_bin'] = 0
            
            features['is_night'] = (transaction['hour_of_day'] >= 22) or (transaction['hour_of_day'] <= 6)
            features['is_weekend'] = features['day_of_week'] in [5, 6]
            features['is_business_hours'] = (transaction['hour_of_day'] >= 9) and (transaction['hour_of_day'] <= 17)
            
            # High-risk categories
            high_risk_categories = ['Electronics', 'Jewelry', 'Travel Agency', 'Insurance']
            features['is_high_risk_category'] = transaction['merchant_category'] in high_risk_categories
            
            # High-risk cities
            high_risk_cities = ['New York', 'Los Angeles', 'Chicago', 'Miami', 'Las Vegas']
            features['is_high_risk_city'] = transaction['city'] in high_risk_cities
            
            # Amount thresholds
            features['is_high_amount'] = transaction['amount'] > 50000
            features['is_very_high_amount'] = transaction['amount'] > 100000
            
            # Interaction features
            features['high_amount_high_risk'] = features['is_high_amount'] and features['is_high_risk_category']
            features['night_high_amount'] = features['is_night'] and features['is_high_amount']
            
            return features
            
        except Exception as e:
            print(f"⚠️  Error preparing ML features: {e}")
            return None
    
    def _get_ml_prediction(self, transaction, user_history=None):
        """Get ML model prediction - aligned with improved model"""
        try:
            if self.ml_model is None:
                return 0.5  # Default score if ML model not available
            
            # Prepare features
            features = self._prepare_ml_features(transaction, user_history)
            if features is None:
                return 0.5
            
            # Convert to DataFrame
            feature_df = pd.DataFrame([features])
            
            # Use only the 18 features expected by the model
            if self.feature_names is not None:
                # Ensure we only have the expected features in the correct order
                expected_features = self.feature_names
                for feature in expected_features:
                    if feature not in feature_df.columns:
                        feature_df[feature] = 0
                # Select only the expected features in the correct order
                feature_df = feature_df[expected_features]
            else:
                # Fallback to basic features if no feature names available
                basic_features = ['amount', 'hour_of_day', 'day_of_week', 'merchant_category', 'city', 'payment_method']
                for feature in basic_features:
                    if feature not in feature_df.columns:
                        feature_df[feature] = 0
                feature_df = feature_df[basic_features]
            
            # Encode categorical features (only the ones that were encoded during training)
            categorical_cols = ['merchant_category', 'city', 'payment_method']
            for col in categorical_cols:
                if col in feature_df.columns and col in self.label_encoders:
                    try:
                        feature_df[col] = self.label_encoders[col].transform(feature_df[col].astype(str))
                    except:
                        feature_df[col] = 0
                else:
                    feature_df[col] = 0
            
            # Scale features if scaler is available
            if self.scaler is not None:
                try:
                    feature_df = self.scaler.transform(feature_df)
                except Exception as e:
                    print(f"⚠️  Scaling error: {e}")
                    # Continue without scaling
            
            # Get prediction
            try:
                ml_score = self.ml_model.predict_proba(feature_df)[0][1]  # Probability of fraud
                return ml_score
            except Exception as e:
                print(f"⚠️  Prediction error: {e}")
                return 0.5
            
        except Exception as e:
            print(f"⚠️  Error in ML prediction: {e}")
            return 0.5
    
    def _get_rule_prediction(self, user_id, transaction):
        """Get rule-based prediction"""
        try:
            result = self.rule_detector.detect_fraud(user_id, transaction)
            return result.get('risk_score', 0.5)
        except Exception as e:
            print(f"⚠️  Error in rule-based prediction: {e}")
            return 0.5
    
    def detect_fraud(self, user_id, transaction):
        """Aggressive hybrid fraud detection: flag as fraud if either ML or rule-based score is high, or hybrid score is moderate."""
        try:
            # Get user history for ML features
            user_history = self.rule_detector.user_histories.get(user_id, [])
            
            # Get ML prediction
            ml_score = self._get_ml_prediction(transaction, user_history)
            
            # Get rule-based prediction
            rule_score = self._get_rule_prediction(user_id, transaction)
            
            # Combine predictions using weighted average
            hybrid_score = (self.ml_weight * ml_score) + (self.rule_weight * rule_score)
            
            # Aggressive logic: flag as fraud if any score is high
            if ml_score >= 0.3 or rule_score >= 0.3 or hybrid_score >= 0.4:
                risk_level = 'HIGH'
                requires_verification = True
                block_transaction = True
            else:
                risk_level = 'LOW'
                requires_verification = False
                block_transaction = False
            
            # Prepare detailed analysis
            analysis = {
                'ml_score': ml_score,
                'rule_score': rule_score,
                'hybrid_score': hybrid_score,
                'ml_weight': self.ml_weight,
                'rule_weight': self.rule_weight
            }
            
            # Add reasoning
            reasons = []
            if ml_score > 0.3:
                reasons.append(f"ML model indicates possible fraud ({ml_score:.3f})")
            if rule_score > 0.3:
                reasons.append(f"Rule-based system flags as possible fraud ({rule_score:.3f})")
            if transaction['amount'] > 50000:
                reasons.append(f"High amount transaction (${transaction['amount']:,.2f})")
            if transaction['hour_of_day'] in [1, 2, 3, 4, 5]:
                reasons.append(f"Suspicious time ({transaction['hour_of_day']}:00)")
            
            return {
                'risk_score': hybrid_score,
                'risk_level': risk_level,
                'requires_verification': requires_verification,
                'block_transaction': block_transaction,
                'detection_method': 'hybrid_ml_rule',
                'ml_score': ml_score,
                'rule_score': rule_score,
                'hybrid_analysis': analysis,
                'reasons': reasons,
                'confidence': 'high' if risk_level == 'HIGH' else 'low'
            }
            
        except Exception as e:
            print(f"⚠️  Error in hybrid detection: {e}")
            return {
                'risk_score': 0.5,
                'risk_level': 'MEDIUM',
                'requires_verification': True,
                'block_transaction': False,
                'detection_method': 'error',
                'ml_score': 0.5,
                'rule_score': 0.5,
                'error': str(e)
            }
    
    def add_transaction_to_history(self, user_id, transaction):
        """Add transaction to user history for both systems"""
        self.rule_detector.add_transaction_to_history(user_id, transaction)
    
    def get_system_info(self):
        """Get information about the hybrid system"""
        return {
            'ml_model_loaded': self.ml_model is not None,
            'ml_weight': self.ml_weight,
            'rule_weight': self.rule_weight,
            'detection_method': 'hybrid_ml_rule',
            'features_available': self.feature_names is not None,
            'scalers_loaded': self.scaler is not None
        }

def test_true_hybrid():
    """Test the true hybrid detector"""
    print("🚀 TESTING TRUE HYBRID DETECTOR (ML + Rule-based)")
    print("=" * 60)
    
    # Initialize true hybrid detector
    detector = TrueHybridFraudDetector()
    
    # Get system info
    info = detector.get_system_info()
    print(f"\n📊 System Information:")
    print(f"   ML Model Loaded: {info['ml_model_loaded']}")
    print(f"   ML Weight: {info['ml_weight']}")
    print(f"   Rule Weight: {info['rule_weight']}")
    print(f"   Detection Method: {info['detection_method']}")
    
    # Test with sample data
    try:
        df = pd.read_csv('../data/test/test_data.csv')
        sample = df.sample(n=5, random_state=42)
        
        print(f"\n🧪 Testing with 5 sample transactions...")
        print("-" * 50)
        
        for idx, row in sample.iterrows():
            transaction = {
                "user_id": str(row['user_id']),
                "amount": float(row['amount']),
                "merchant_category": str(row['merchant_category']),
                "city": str(row['city']),
                "device_type": str(row['device_type']),
                "payment_method": str(row['payment_method']),
                "hour_of_day": int(row['hour_of_day']),
                "timestamp": str(row['timestamp'])
            }
            
            result = detector.detect_fraud(transaction['user_id'], transaction)
            
            print(f"\n🔍 Transaction {idx}:")
            print(f"   Amount: ${transaction['amount']:,.2f}")
            print(f"   Category: {transaction['merchant_category']}")
            print(f"   Time: {transaction['hour_of_day']}:00")
            print(f"   Actual Fraud: {'Yes' if row['is_fraud'].item() else 'No'}")
            print(f"   Risk Level: {result['risk_level']}")
            print(f"   Hybrid Score: {result['risk_score']:.3f}")
            print(f"   ML Score: {result['ml_score']:.3f}")
            print(f"   Rule Score: {result['rule_score']:.3f}")
            print(f"   Action: {'Block' if result['block_transaction'] else 'Review' if result['requires_verification'] else 'Approve'}")
            
            if result.get('reasons'):
                print(f"   Reasons: {', '.join(result['reasons'])}")
        
        print(f"\n✅ True hybrid detector testing completed!")
        
    except Exception as e:
        print(f"❌ Error testing hybrid detector: {e}")

if __name__ == "__main__":
    test_true_hybrid() 