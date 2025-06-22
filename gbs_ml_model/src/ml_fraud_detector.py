#!/usr/bin/env python3
"""
ML-Based Fraud Detection System
Uses multiple machine learning algorithms for fraud detection
"""

import pandas as pd
import numpy as np
import pickle
import joblib
from datetime import datetime, timedelta
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.model_selection import train_test_split, cross_val_score, GridSearchCV
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import classification_report, confusion_matrix, roc_auc_score, roc_curve
from sklearn.feature_selection import SelectKBest, f_classif
import xgboost as xgb
import lightgbm as lgb
from sklearn.neural_network import MLPClassifier
import warnings
warnings.filterwarnings('ignore')

class MLFraudDetector:
    """Machine Learning-based fraud detection system"""
    
    def __init__(self):
        self.models = {}
        self.scalers = {}
        self.label_encoders = {}
        self.feature_selector = None
        self.feature_columns = []
        self.user_histories = {}
        self.is_trained = False
        
        # Initialize different ML models
        self._initialize_models()
        
    def _initialize_models(self):
        """Initialize different ML models"""
        self.models = {
            'random_forest': RandomForestClassifier(
                n_estimators=100,
                max_depth=10,
                random_state=42,
                n_jobs=-1,
                class_weight='balanced'
            ),
            'xgboost': xgb.XGBClassifier(
                n_estimators=100,
                max_depth=6,
                learning_rate=0.1,
                random_state=42,
                eval_metric='logloss',
                scale_pos_weight=5.0  # Handle class imbalance
            ),
            'lightgbm': lgb.LGBMClassifier(
                n_estimators=100,
                max_depth=6,
                learning_rate=0.1,
                random_state=42,
                verbose=-1,
                class_weight='balanced'
            ),
            'neural_network': MLPClassifier(
                hidden_layer_sizes=(100, 50, 25),
                max_iter=500,
                random_state=42,
                early_stopping=True,
                validation_fraction=0.1
            ),
            'gradient_boosting': GradientBoostingClassifier(
                n_estimators=100,
                max_depth=6,
                learning_rate=0.1,
                random_state=42
            )
        }
        
        print("✅ ML models initialized: Random Forest, XGBoost, LightGBM, Neural Network, Gradient Boosting")
    
    def _encode_categorical_features(self, df):
        """Encode categorical features to numeric values"""
        categorical_columns = ['merchant_category', 'city', 'device_type', 'payment_method']
        
        for col in categorical_columns:
            if col in df.columns:
                # Force to string and encode
                df[col] = df[col].astype(str)
                if col not in self.label_encoders:
                    self.label_encoders[col] = LabelEncoder()
                    df[col] = self.label_encoders[col].fit_transform(df[col])
                else:
                    # Handle unseen categories
                    unique_values = df[col].unique()
                    encoder_classes = list(self.label_encoders[col].classes_)
                    new_categories = [val for val in unique_values if val not in encoder_classes]
                    if new_categories:
                        all_categories = encoder_classes + new_categories
                        self.label_encoders[col] = LabelEncoder()
                        self.label_encoders[col].fit(all_categories)
                    df[col] = self.label_encoders[col].transform(df[col])
        
        return df
    
    def _extract_features(self, transaction, user_history=None):
        """Extract features from transaction and user history"""
        features = {}
        
        # Basic transaction features
        features['amount'] = transaction['amount']
        features['hour'] = transaction['hour']
        features['day_of_week'] = transaction['day_of_week']
        
        # Categorical features - should already be encoded as integers
        for cat in ['merchant_category', 'city', 'device_type', 'payment_method']:
            if cat in transaction:
                if isinstance(transaction[cat], (int, np.integer)):
                    features[cat] = transaction[cat]
                else:
                    try:
                        if cat in self.label_encoders:
                            features[cat] = self.label_encoders[cat].transform([str(transaction[cat])])[0]
                        else:
                            features[cat] = 0
                    except:
                        features[cat] = 0
            else:
                features[cat] = 0
        
        # User behavior features (if history available)
        if user_history and len(user_history) > 0:
            amounts = [tx['amount'] for tx in user_history]
            hours = [tx['hour'] for tx in user_history]
            cities = [str(tx['city']) for tx in user_history]
            devices = [str(tx['device_type']) for tx in user_history]
            
            # Statistical features
            features['avg_amount'] = np.mean(amounts)
            features['std_amount'] = np.std(amounts)
            features['max_amount'] = np.max(amounts)
            features['min_amount'] = np.min(amounts)
            features['amount_ratio'] = transaction['amount'] / (np.mean(amounts) + 1e-8)
            
            # Time-based features
            features['avg_hour'] = np.mean(hours)
            features['hour_diff'] = abs(transaction['hour'] - np.mean(hours))
            features['is_night'] = 1 if 22 <= transaction['hour'] or transaction['hour'] <= 6 else 0
            
            # Location features
            features['city_count'] = len(set(cities))
            features['is_new_city'] = 1 if str(transaction['city']) not in cities else 0
            
            # Device features
            features['device_count'] = len(set(devices))
            features['is_new_device'] = 1 if str(transaction['device_type']) not in devices else 0
            
            # Frequency features
            features['transaction_count'] = len(user_history)
            features['daily_frequency'] = len([tx for tx in user_history if tx.get('day_of_week') == transaction['day_of_week']])
            
            # Amount patterns
            features['amount_increase'] = 1 if transaction['amount'] > np.mean(amounts) * 2 else 0
            features['amount_spike'] = 1 if transaction['amount'] > np.mean(amounts) * 5 else 0
            
        else:
            # Default values for new users
            features.update({
                'avg_amount': 0, 'std_amount': 0, 'max_amount': 0, 'min_amount': 0,
                'amount_ratio': 1, 'avg_hour': 12, 'hour_diff': 0, 'is_night': 0,
                'city_count': 1, 'is_new_city': 0, 'device_count': 1, 'is_new_device': 0,
                'transaction_count': 0, 'daily_frequency': 0, 'amount_increase': 0, 'amount_spike': 0
            })
        
        return features
    
    def _prepare_training_data(self, transactions_df):
        """Prepare data for training"""
        print("🔄 Preparing training data...")
        
        # Handle column name differences
        if 'hour_of_day' in transactions_df.columns and 'hour' not in transactions_df.columns:
            transactions_df = transactions_df.rename(columns={'hour_of_day': 'hour'})
        
        # Encode categorical features first
        transactions_df = self._encode_categorical_features(transactions_df.copy())
        
        # Create feature matrix
        feature_data = []
        labels = []
        
        for user_id in transactions_df['user_id'].unique():
            user_data = transactions_df[transactions_df['user_id'] == user_id].sort_values('timestamp')
            user_history = []
            
            for idx, row in user_data.iterrows():
                transaction = {
                    'amount': row['amount'],
                    'hour': row['hour'],
                    'day_of_week': row['day_of_week'],
                    'merchant_category': row['merchant_category'],
                    'city': row['city'],
                    'device_type': row['device_type'],
                    'payment_method': row['payment_method']
                }
                
                # Extract features
                features = self._extract_features(transaction, user_history)
                feature_data.append(features)
                
                # Label
                if 'is_fraud' in row:
                    labels.append(int(row['is_fraud']))
                else:
                    is_fraud = self._create_synthetic_label(transaction, user_history)
                    labels.append(is_fraud)
                
                # Add to user history
                user_history.append(transaction)
        
        # Convert to DataFrame
        feature_df = pd.DataFrame(feature_data)
        self.feature_columns = feature_df.columns.tolist()
        
        print(f"✅ Prepared {len(feature_df)} samples with {len(self.feature_columns)} features")
        return feature_df, np.array(labels)
    
    def _create_synthetic_label(self, transaction, user_history):
        """Create synthetic fraud labels based on suspicious patterns"""
        if len(user_history) < 3:
            return 0
        
        # Suspicious patterns
        amounts = [tx['amount'] for tx in user_history]
        avg_amount = np.mean(amounts)
        
        # High amount at unusual time
        if (transaction['amount'] > avg_amount * 10 and 
            (transaction['hour'] < 6 or transaction['hour'] > 22)):
            return 1
        
        # Very high amount
        if transaction['amount'] > avg_amount * 20:
            return 1
        
        # Unusual device + high amount
        devices = [tx['device_type'] for tx in user_history]
        if (transaction['device_type'] not in devices and 
            transaction['amount'] > avg_amount * 5):
            return 1
        
        return 0
    
    def train(self, transactions_df, test_size=0.2, random_state=42):
        """Train all ML models"""
        print("🚀 Starting ML model training...")
        
        # Prepare data
        X, y = self._prepare_training_data(transactions_df)
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, random_state=random_state, stratify=y
        )
        
        print(f"📊 Training set: {len(X_train)} samples, Test set: {len(X_test)} samples")
        print(f"🎯 Fraud rate: {np.mean(y_train):.3f} (train), {np.mean(y_test):.3f} (test)")
        
        # Feature selection
        self.feature_selector = SelectKBest(score_func=f_classif, k=min(20, len(self.feature_columns)))
        X_train_selected = self.feature_selector.fit_transform(X_train, y_train)
        X_test_selected = self.feature_selector.transform(X_test)
        
        # Get selected feature names
        selected_features = self.feature_selector.get_support()
        self.selected_feature_names = [self.feature_columns[i] for i in range(len(self.feature_columns)) if selected_features[i]]
        
        print(f"🎯 Selected {len(self.selected_feature_names)} best features")
        
        # Scale features
        self.scalers['standard'] = StandardScaler()
        X_train_scaled = self.scalers['standard'].fit_transform(X_train_selected)
        X_test_scaled = self.scalers['standard'].transform(X_test_selected)
        
        # Train each model
        model_results = {}
        
        for model_name, model in self.models.items():
            print(f"\n🔄 Training {model_name}...")
            
            try:
                # Train model
                model.fit(X_train_scaled, y_train)
                
                # Predictions
                y_pred = model.predict(X_test_scaled)
                y_pred_proba = model.predict_proba(X_test_scaled)[:, 1]
                
                # Metrics
                accuracy = (y_pred == y_test).mean()
                auc_score = roc_auc_score(y_test, y_pred_proba)
                
                model_results[model_name] = {
                    'accuracy': accuracy,
                    'auc_score': auc_score,
                    'model': model
                }
                
                print(f"✅ {model_name}: Accuracy={accuracy:.3f}, AUC={auc_score:.3f}")
                
            except Exception as e:
                print(f"❌ Error training {model_name}: {str(e)}")
        
        # Find best model
        if model_results:
            best_model_name = max(model_results.keys(), 
                                key=lambda x: model_results[x]['auc_score'])
            self.best_model = model_results[best_model_name]['model']
            self.best_model_name = best_model_name
            
            print(f"\n🏆 Best model: {best_model_name} (AUC: {model_results[best_model_name]['auc_score']:.3f})")
            
            # Save models
            self._save_models()
            
            self.is_trained = True
            return model_results
        else:
            print("❌ No models were successfully trained")
            return {}
    
    def _save_models(self):
        """Save trained models and preprocessing objects"""
        import os
        from config import PATHS
        
        # Create directory if not exists
        os.makedirs(PATHS['saved_models_dir'], exist_ok=True)
        
        # Save best model
        with open(PATHS['saved_models_dir'] / 'best_ml_model.pkl', 'wb') as f:
            pickle.dump(self.best_model, f)
        
        # Save scaler
        with open(PATHS['saved_models_dir'] / 'ml_scaler.pkl', 'wb') as f:
            pickle.dump(self.scalers['standard'], f)
        
        # Save feature selector
        with open(PATHS['saved_models_dir'] / 'ml_feature_selector.pkl', 'wb') as f:
            pickle.dump(self.feature_selector, f)
        
        # Save label encoders
        with open(PATHS['saved_models_dir'] / 'ml_label_encoders.pkl', 'wb') as f:
            pickle.dump(self.label_encoders, f)
        
        # Save feature names
        with open(PATHS['saved_models_dir'] / 'ml_feature_names.json', 'w') as f:
            import json
            json.dump({
                'all_features': self.feature_columns,
                'selected_features': self.selected_feature_names
            }, f, indent=2)
        
        print("💾 Models saved successfully")
    
    def load_models(self):
        """Load trained models"""
        import os
        from config import PATHS
        
        try:
            # Load best model
            with open(PATHS['saved_models_dir'] / 'best_ml_model.pkl', 'rb') as f:
                self.best_model = pickle.load(f)
            
            # Load scaler
            with open(PATHS['saved_models_dir'] / 'ml_scaler.pkl', 'rb') as f:
                self.scalers['standard'] = pickle.load(f)
            
            # Load feature selector
            with open(PATHS['saved_models_dir'] / 'ml_feature_selector.pkl', 'rb') as f:
                self.feature_selector = pickle.load(f)
            
            # Load label encoders
            with open(PATHS['saved_models_dir'] / 'ml_label_encoders.pkl', 'rb') as f:
                self.label_encoders = pickle.load(f)
            
            # Load feature names
            with open(PATHS['saved_models_dir'] / 'ml_feature_names.json', 'r') as f:
                import json
                feature_info = json.load(f)
                self.feature_columns = feature_info['all_features']
                self.selected_feature_names = feature_info['selected_features']
            
            self.is_trained = True
            print("✅ ML models loaded successfully")
            return True
            
        except Exception as e:
            print(f"❌ Error loading models: {str(e)}")
            return False
    
    def add_transaction_to_history(self, user_id, transaction):
        """Add transaction to user history"""
        if user_id not in self.user_histories:
            self.user_histories[user_id] = []
        
        self.user_histories[user_id].append(transaction)
    
    def detect_fraud(self, user_id, transaction):
        """Detect fraud using ML model"""
        if not self.is_trained:
            return {
                'error': 'ML model not trained. Please train the model first.',
                'risk_score': 0.5,
                'risk_level': 'MEDIUM'
            }
        
        try:
            # Get user history
            user_history = self.user_histories.get(user_id, [])
            
            # Extract features
            features = self._extract_features(transaction, user_history)
            
            # Convert to DataFrame
            feature_df = pd.DataFrame([features])
            
            # Select features
            X_selected = self.feature_selector.transform(feature_df)
            
            # Scale features
            X_scaled = self.scalers['standard'].transform(X_selected)
            
            # Predict
            fraud_probability = self.best_model.predict_proba(X_scaled)[0, 1]
            
            # Determine risk level
            if fraud_probability >= 0.8:
                risk_level = 'HIGH'
                block_transaction = True
            elif fraud_probability >= 0.6:
                risk_level = 'HIGH'
                block_transaction = False
            elif fraud_probability >= 0.4:
                risk_level = 'MEDIUM'
                block_transaction = False
            else:
                risk_level = 'LOW'
                block_transaction = False
            
            # Feature importance (if available)
            feature_importance = {}
            if hasattr(self.best_model, 'feature_importances_'):
                importances = self.best_model.feature_importances_
                for i, feature in enumerate(self.selected_feature_names):
                    feature_importance[feature] = float(importances[i])
            
            return {
                'risk_score': fraud_probability,
                'risk_level': risk_level,
                'requires_verification': fraud_probability > 0.4,
                'block_transaction': block_transaction,
                'detection_method': 'ml_model',
                'model_used': self.best_model_name,
                'feature_importance': feature_importance,
                'user_stats': {
                    'transaction_count': len(user_history),
                    'avg_amount': np.mean([tx['amount'] for tx in user_history]) if user_history else 0
                }
            }
            
        except Exception as e:
            return {
                'error': f'ML detection failed: {str(e)}',
                'risk_score': 0.5,
                'risk_level': 'MEDIUM',
                'requires_verification': True
            } 