"""
Feature Engineering for Cardholder Ranking ML Model
Transforms raw data into ML-ready features
"""

import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler, LabelEncoder, MinMaxScaler
from sklearn.feature_selection import SelectKBest, f_classif
from typing import Tuple, Dict, List, Optional
import joblib
import sys
import os

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import FEATURE_RANGES, CARD_TYPES, MERCHANT_CATEGORIES, PATHS
from data.schema import CardType, MerchantCategory

class FeatureEngineer:
    """Feature engineering pipeline for cardholder ranking"""
    
    def __init__(self):
        self.scaler = StandardScaler()
        self.label_encoders = {}
        self.feature_names = []
        self.categorical_features = ['card_type', 'geographic_location']
        self.numerical_features = [
            'credit_limit', 'avg_repayment_days', 'transaction_success_rate',
            'response_time_sec', 'discount_hit_rate', 'commission_acceptance',
            'user_rating', 'default_count', 'usage_frequency_last_30_days',
            'account_tenure_months', 'cashback_earning_potential'
        ]
        
    def normalize_feature(self, value: float, feature_name: str) -> float:
        """Normalize a feature value to 0-1 range"""
        if feature_name not in FEATURE_RANGES:
            return value
        
        min_val, max_val = FEATURE_RANGES[feature_name]
        if max_val == min_val:
            return 0.5
        
        normalized = (value - min_val) / (max_val - min_val)
        return max(0, min(1, normalized))  # Clip to [0, 1]
    
    def create_derived_features(self, cardholders_df: pd.DataFrame, 
                               transactions_df: pd.DataFrame) -> pd.DataFrame:
        """Create derived features from raw data"""
        
        # Merge cardholder and transaction data
        merged_df = cardholders_df.copy()
        
        # If transactions_df is empty or missing cardholder_id, skip transaction-based features
        if transactions_df is None or transactions_df.empty or 'cardholder_id' not in transactions_df.columns:
            # Add default values for transaction-based features
            merged_df['total_transactions'] = 0
            merged_df['avg_amount'] = 0
            merged_df['amount_std'] = 0
            merged_df['total_amount'] = 0
            merged_df['success_rate_from_txns'] = merged_df['transaction_success_rate'] if 'transaction_success_rate' in merged_df.columns else 0
            merged_df['discount_success_rate'] = merged_df['discount_hit_rate'] if 'discount_hit_rate' in merged_df.columns else 0
            merged_df['avg_commission'] = 0
            merged_df['total_commission'] = 0
            merged_df['avg_response_time'] = merged_df['response_time_sec'] if 'response_time_sec' in merged_df.columns else 0
            merged_df['response_time_std'] = 0
            merged_df['avg_user_rating'] = merged_df['user_rating'] if 'user_rating' in merged_df.columns else 0
            merged_df['rating_count'] = 0
        else:
            # Calculate transaction-based features
            transaction_features = transactions_df.groupby('cardholder_id').agg({
                'transaction_id': 'count',
                'amount': ['mean', 'std', 'sum'],
                'status': lambda x: (x == 'success').mean(),
                'discount_applied': 'mean',
                'commission_charged': ['mean', 'sum'],
                'response_time_sec': ['mean', 'std'],
                'user_rating': ['mean', 'count']
            }).reset_index()
            # Flatten column names
            transaction_features.columns = [
                'cardholder_id', 'total_transactions', 'avg_amount', 'amount_std', 
                'total_amount', 'success_rate_from_txns', 'discount_success_rate',
                'avg_commission', 'total_commission', 'avg_response_time', 
                'response_time_std', 'avg_user_rating', 'rating_count'
            ]
            # Merge with cardholder data
            merged_df = merged_df.merge(transaction_features, on='cardholder_id', how='left')
            # Fill NaN values
            merged_df = merged_df.fillna({
                'total_transactions': 0,
                'avg_amount': 0,
                'amount_std': 0,
                'total_amount': 0,
                'success_rate_from_txns': 0,
                'discount_success_rate': 0,
                'avg_commission': 0,
                'total_commission': 0,
                'avg_response_time': merged_df['response_time_sec'],
                'response_time_std': 0,
                'avg_user_rating': merged_df['user_rating'],
                'rating_count': 0
            })
        
        # Create derived features
        merged_df['transaction_volume_score'] = np.log1p(merged_df['total_transactions'])
        merged_df['amount_consistency'] = 1 / (1 + merged_df['amount_std'])
        merged_df['commission_efficiency'] = merged_df['total_commission'] / (merged_df['total_amount'] + 1)
        merged_df['response_consistency'] = 1 / (1 + merged_df['response_time_std'])
        merged_df['rating_confidence'] = np.minimum(merged_df['rating_count'] / 10, 1.0)
        
        # Card type features
        merged_df['card_type_multiplier'] = merged_df['card_type'].map(CARD_TYPES)
        merged_df['is_premium_card'] = merged_df['card_type'].isin(['Amazon_ICICI', 'Axis_Flipkart', 'HDFC_Regalia']).astype(int)
        
        # Time-based features
        merged_df['days_since_last_active'] = (pd.Timestamp.now() - pd.to_datetime(merged_df['last_active'])).dt.days
        merged_df['account_age_days'] = (pd.Timestamp.now() - pd.to_datetime(merged_df['created_at'])).dt.days
        
        # Risk features
        merged_df['risk_score'] = (
            merged_df['default_count'] * 0.3 +
            (1 - merged_df['transaction_success_rate']) * 0.3 +
            (merged_df['avg_repayment_days'] / 30) * 0.2 +
            (merged_df['response_time_sec'] / 1800) * 0.2
        )
        
        # Reliability features
        merged_df['reliability_score'] = (
            merged_df['transaction_success_rate'] * 0.4 +
            merged_df['user_rating'] / 5 * 0.3 +
            (1 - merged_df['risk_score']) * 0.3
        )
        
        return merged_df
    
    def encode_categorical_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Encode categorical features"""
        df_encoded = df.copy()
        
        for feature in self.categorical_features:
            if feature in df.columns:
                if feature not in self.label_encoders:
                    self.label_encoders[feature] = LabelEncoder()
                    df_encoded[feature] = self.label_encoders[feature].fit_transform(df[feature])
                else:
                    # Handle unseen categories
                    unique_values = df[feature].unique()
                    known_values = self.label_encoders[feature].classes_
                    unknown_values = set(unique_values) - set(known_values)
                    
                    if unknown_values:
                        # Add unknown categories to encoder
                        all_values = list(known_values) + list(unknown_values)
                        self.label_encoders[feature] = LabelEncoder()
                        self.label_encoders[feature].fit(all_values)
                    
                    df_encoded[feature] = self.label_encoders[feature].transform(df[feature])
        
        return df_encoded
    
    def create_merchant_specific_features(self, df: pd.DataFrame, 
                                        merchant_category: str = None) -> pd.DataFrame:
        """Create features specific to merchant category"""
        df_enhanced = df.copy()
        
        if merchant_category and merchant_category in MERCHANT_CATEGORIES:
            preferred_cards = MERCHANT_CATEGORIES[merchant_category]
            df_enhanced['merchant_card_compatibility'] = df_enhanced['card_type'].isin(preferred_cards).astype(int)
        else:
            df_enhanced['merchant_card_compatibility'] = 0
        
        # Create interaction features
        df_enhanced['credit_limit_normalized'] = df_enhanced['credit_limit'].apply(
            lambda x: self.normalize_feature(x, 'credit_limit'))
        df_enhanced['repayment_speed_normalized'] = df_enhanced['avg_repayment_days'].apply(
            lambda x: 1 - self.normalize_feature(x, 'avg_repayment_days'))
        df_enhanced['response_speed_normalized'] = df_enhanced['response_time_sec'].apply(
            lambda x: 1 - self.normalize_feature(x, 'response_time_sec'))
        
        return df_enhanced
    
    def select_features(self, df: pd.DataFrame, target: pd.Series = None, 
                       k: int = 20) -> pd.DataFrame:
        """Select the most important features"""
        if target is not None:
            # Use feature selection if target is provided
            selector = SelectKBest(score_func=f_classif, k=k)
            feature_columns = [col for col in df.columns if col not in ['cardholder_id', 'created_at', 'last_active']]
            X_selected = selector.fit_transform(df[feature_columns], target)
            selected_features = [feature_columns[i] for i in selector.get_support(indices=True)]
        else:
            # Use predefined feature list
            selected_features = [
                'credit_limit', 'avg_repayment_days', 'transaction_success_rate',
                'response_time_sec', 'discount_hit_rate', 'commission_acceptance',
                'user_rating', 'default_count', 'card_type', 'usage_frequency_last_30_days',
                'account_tenure_months', 'cashback_earning_potential', 'geographic_location',
                'transaction_volume_score', 'amount_consistency', 'commission_efficiency',
                'response_consistency', 'rating_confidence', 'card_type_multiplier',
                'is_premium_card', 'risk_score', 'reliability_score',
                'credit_limit_normalized', 'repayment_speed_normalized', 'response_speed_normalized'
            ]
            selected_features = [f for f in selected_features if f in df.columns]
        
        self.feature_names = selected_features
        return df[selected_features]
    
    def fit_transform(self, cardholders_df: pd.DataFrame, 
                     transactions_df: pd.DataFrame,
                     target: pd.Series = None) -> Tuple[pd.DataFrame, pd.DataFrame]:
        """Fit the feature engineering pipeline and transform data"""
        
        print("🔄 Creating derived features...")
        enhanced_df = self.create_derived_features(cardholders_df, transactions_df)
        
        print("🔄 Encoding categorical features...")
        encoded_df = self.encode_categorical_features(enhanced_df)
        
        print("🔄 Creating merchant-specific features...")
        merchant_df = self.create_merchant_specific_features(encoded_df)
        
        print("🔄 Selecting features...")
        feature_df = self.select_features(merchant_df, target)
        
        print("🔄 Scaling numerical features...")
        scaled_features = self.scaler.fit_transform(feature_df)
        scaled_df = pd.DataFrame(scaled_features, columns=self.feature_names, index=feature_df.index)
        
        return scaled_df, enhanced_df
    
    def transform(self, cardholders_df: pd.DataFrame, 
                 transactions_df: pd.DataFrame = None,
                 merchant_category: str = None) -> pd.DataFrame:
        """Transform new data using fitted pipeline"""
        
        # If no transactions provided, use cardholder data only
        if transactions_df is None:
            enhanced_df = cardholders_df.copy()
            # Add default values for transaction-based features
            enhanced_df['total_transactions'] = 0
            enhanced_df['avg_amount'] = 0
            enhanced_df['amount_std'] = 0
            enhanced_df['total_amount'] = 0
            enhanced_df['success_rate_from_txns'] = enhanced_df['transaction_success_rate']
            enhanced_df['discount_success_rate'] = enhanced_df['discount_hit_rate']
            enhanced_df['avg_commission'] = 0
            enhanced_df['total_commission'] = 0
            enhanced_df['avg_response_time'] = enhanced_df['response_time_sec']
            enhanced_df['response_time_std'] = 0
            enhanced_df['avg_user_rating'] = enhanced_df['user_rating']
            enhanced_df['rating_count'] = 0
        else:
            enhanced_df = self.create_derived_features(cardholders_df, transactions_df)
        
        encoded_df = self.encode_categorical_features(enhanced_df)
        merchant_df = self.create_merchant_specific_features(encoded_df, merchant_category)
        
        # Select only the features that were used during training
        available_features = [f for f in self.feature_names if f in merchant_df.columns]
        feature_df = merchant_df[available_features]
        
        # Add missing features with default values
        for feature in self.feature_names:
            if feature not in feature_df.columns:
                feature_df[feature] = 0
        
        feature_df = feature_df[self.feature_names]
        scaled_features = self.scaler.transform(feature_df)
        scaled_df = pd.DataFrame(scaled_features, columns=self.feature_names, index=feature_df.index)
        
        return scaled_df
    
    def save_pipeline(self, filepath: str = None):
        """Save the fitted pipeline"""
        if filepath is None:
            filepath = PATHS['feature_scaler_file']
        
        pipeline_data = {
            'scaler': self.scaler,
            'label_encoders': self.label_encoders,
            'feature_names': self.feature_names,
            'categorical_features': self.categorical_features,
            'numerical_features': self.numerical_features
        }
        
        joblib.dump(pipeline_data, filepath)
        print(f"✅ Feature engineering pipeline saved to {filepath}")
    
    def load_pipeline(self, filepath: str = None):
        """Load a fitted pipeline"""
        if filepath is None:
            filepath = PATHS['feature_scaler_file']
        
        if os.path.exists(filepath):
            pipeline_data = joblib.load(filepath)
            self.scaler = pipeline_data['scaler']
            self.label_encoders = pipeline_data['label_encoders']
            self.feature_names = pipeline_data['feature_names']
            self.categorical_features = pipeline_data['categorical_features']
            self.numerical_features = pipeline_data['numerical_features']
            print(f"✅ Feature engineering pipeline loaded from {filepath}")
        else:
            print(f"⚠️ Pipeline file not found: {filepath}")

def create_training_labels(cardholders_df: pd.DataFrame, 
                          transactions_df: pd.DataFrame) -> pd.Series:
    """Create training labels for the model"""
    
    # Calculate success rate for each cardholder
    success_rates = transactions_df.groupby('cardholder_id').agg({
        'status': lambda x: (x == 'success').mean()
    }).reset_index()
    
    success_rates.columns = ['cardholder_id', 'actual_success_rate']
    
    # Merge with cardholders
    labeled_df = cardholders_df.merge(success_rates, on='cardholder_id', how='left')
    labeled_df['actual_success_rate'] = labeled_df['actual_success_rate'].fillna(0)
    
    # Create binary labels (1 for high-performing cardholders)
    threshold = labeled_df['actual_success_rate'].quantile(0.7)  # Top 30%
    labels = (labeled_df['actual_success_rate'] >= threshold).astype(int)
    
    return labels

def main():
    """Test the feature engineering pipeline"""
    from data.mock_data import MockDataGenerator
    
    # Generate mock data
    generator = MockDataGenerator()
    cardholders_df = generator.generate_cardholders(100)
    transactions_df = generator.generate_transactions(cardholders_df, 500)
    
    # Create feature engineer
    fe = FeatureEngineer()
    
    # Create labels
    labels = create_training_labels(cardholders_df, transactions_df)
    
    # Fit and transform
    X_train, enhanced_df = fe.fit_transform(cardholders_df, transactions_df, labels)
    
    print(f"✅ Feature engineering completed")
    print(f"📊 Input shape: {cardholders_df.shape}")
    print(f"📊 Output shape: {X_train.shape}")
    print(f"📊 Features: {len(fe.feature_names)}")
    print(f"📊 Sample features: {fe.feature_names[:5]}")

if __name__ == "__main__":
    main() 