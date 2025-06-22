#!/usr/bin/env python3
"""
Unified Hybrid Fraud Detection System Testing
Tests the True Hybrid system on multiple datasets with comprehensive metrics
"""

import pandas as pd
import numpy as np
import argparse
import sys
import os
from datetime import datetime
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix

# Add src to path for imports
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

from true_hybrid_detector import TrueHybridFraudDetector

def load_test_data(file_path):
    """Load and prepare test data"""
    try:
        df = pd.read_csv(file_path)
        print(f"✅ Loaded {len(df)} transactions from {file_path}")
        return df
    except Exception as e:
        print(f"❌ Error loading {file_path}: {e}")
        return None

def prepare_transaction(row):
    """Prepare transaction data for detection"""
    return {
        "user_id": str(row['user_id']),
        "amount": float(row['amount']),
        "merchant_category": str(row['merchant_category']),
        "city": str(row['city']),
        "device_type": str(row['device_type']),
        "payment_method": str(row['payment_method']),
        "hour_of_day": int(row['hour_of_day']),
        "timestamp": str(row['timestamp'])
    }

def evaluate_predictions(y_true, y_pred, dataset_name):
    """Calculate and display evaluation metrics"""
    print(f"\n📊 Evaluation Results for {dataset_name}")
    print("=" * 50)
    
    # Calculate metrics
    accuracy = accuracy_score(y_true, y_pred)
    precision = precision_score(y_true, y_pred, zero_division='warn')
    recall = recall_score(y_true, y_pred, zero_division='warn')
    f1 = f1_score(y_true, y_pred, zero_division='warn')
    
    # Confusion matrix
    cm = confusion_matrix(y_true, y_pred)
    
    print(f"Accuracy:  {accuracy:.3f} ({accuracy*100:.1f}%)")
    print(f"Precision: {precision:.3f} ({precision*100:.1f}%)")
    print(f"Recall:    {recall:.3f} ({recall*100:.1f}%)")
    print(f"F1-Score:  {f1:.3f} ({f1*100:.1f}%)")
    
    print(f"\nConfusion Matrix:")
    print(f"                Predicted")
    print(f"Actual    0 (Legitimate)  1 (Fraud)")
    print(f"0 (Legitimate)    {cm[0,0]:>8}      {cm[0,1]:>8}")
    print(f"1 (Fraud)         {cm[1,0]:>8}      {cm[1,1]:>8}")
    
    return {
        'accuracy': accuracy,
        'precision': precision,
        'recall': recall,
        'f1': f1,
        'confusion_matrix': cm
    }

def test_dataset(detector, df, dataset_name, show_samples=False, max_samples=5):
    """Test the hybrid system on a dataset"""
    print(f"\n🧪 Testing {dataset_name}")
    print("-" * 40)
    
    predictions = []
    actual_labels = []
    ml_scores = []
    rule_scores = []
    hybrid_scores = []
    
    # Sample data if requested
    if show_samples and len(df) > max_samples:
        test_df = df.sample(n=max_samples, random_state=42)
        print(f"📋 Showing detailed analysis for {max_samples} sample transactions:")
    else:
        test_df = df
    
    for idx, row in test_df.iterrows():
        transaction = prepare_transaction(row)
        result = detector.detect_fraud(transaction['user_id'], transaction)
        
        # Collect predictions and scores
        predicted_fraud = 1 if result['block_transaction'] else 0
        actual_fraud = int(row['is_fraud'])
        
        predictions.append(predicted_fraud)
        actual_labels.append(actual_fraud)
        ml_scores.append(result['ml_score'])
        rule_scores.append(result['rule_score'])
        hybrid_scores.append(result['risk_score'])
        
        if show_samples:
            print(f"\n🔍 Transaction {idx}:")
            print(f"   Amount: ${transaction['amount']:,.2f}")
            print(f"   Category: {transaction['merchant_category']}")
            print(f"   Time: {transaction['hour_of_day']}:00")
            print(f"   Actual Fraud: {'Yes' if actual_fraud else 'No'}")
            print(f"   Predicted: {'Block' if predicted_fraud else 'Allow'}")
            print(f"   Risk Level: {result['risk_level']}")
            print(f"   Hybrid Score: {result['risk_score']:.3f}")
            print(f"   ML Score: {result['ml_score']:.3f}")
            print(f"   Rule Score: {result['rule_score']:.3f}")
            
            if result.get('reasons'):
                print(f"   Reasons: {', '.join(result['reasons'])}")
    
    # Evaluate results
    if len(predictions) > 0:
        metrics = evaluate_predictions(actual_labels, predictions, dataset_name)
        
        # Score analysis
        print(f"\n📈 Score Analysis:")
        print(f"   ML Score - Avg: {np.mean(ml_scores):.3f}, Std: {np.std(ml_scores):.3f}")
        print(f"   Rule Score - Avg: {np.mean(rule_scores):.3f}, Std: {np.std(rule_scores):.3f}")
        print(f"   Hybrid Score - Avg: {np.mean(hybrid_scores):.3f}, Std: {np.std(hybrid_scores):.3f}")
        
        return metrics
    else:
        print("❌ No predictions generated")
        return None

def main():
    parser = argparse.ArgumentParser(description='Test Hybrid Fraud Detection System')
    parser.add_argument('--datasets', nargs='+', 
                       default=['data/test/test_data.csv', 'data/test/test2_data.csv', 
                               'data/test/test3_data.csv', 'data/test/test4_data.csv'],
                       help='Test dataset file paths')
    parser.add_argument('--samples', action='store_true',
                       help='Show detailed sample analysis')
    parser.add_argument('--max-samples', type=int, default=5,
                       help='Maximum number of samples to show (default: 5)')
    
    args = parser.parse_args()
    
    print("🚀 UNIFIED HYBRID FRAUD DETECTION SYSTEM TESTING")
    print("=" * 60)
    print(f"📅 Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"📁 Testing datasets: {len(args.datasets)} files")
    print(f"🔍 Sample analysis: {'Enabled' if args.samples else 'Disabled'}")
    
    # Initialize detector
    print(f"\n🔧 Initializing True Hybrid Fraud Detector...")
    detector = TrueHybridFraudDetector()
    
    # Get system info
    info = detector.get_system_info()
    print(f"✅ System initialized:")
    print(f"   ML Model Loaded: {info['ml_model_loaded']}")
    print(f"   ML Weight: {info['ml_weight']}")
    print(f"   Rule Weight: {info['rule_weight']}")
    print(f"   Detection Method: {info['detection_method']}")
    
    # Test each dataset
    all_metrics = []
    
    for dataset_path in args.datasets:
        if not os.path.exists(dataset_path):
            print(f"⚠️  Dataset not found: {dataset_path}")
            continue
            
        df = load_test_data(dataset_path)
        if df is None:
            continue
            
        dataset_name = os.path.basename(dataset_path)
        metrics = test_dataset(detector, df, dataset_name, args.samples, args.max_samples)
        
        if metrics:
            all_metrics.append({
                'dataset': dataset_name,
                **metrics
            })
    
    # Summary across all datasets
    if all_metrics:
        print(f"\n🎯 OVERALL PERFORMANCE SUMMARY")
        print("=" * 50)
        
        avg_accuracy = np.mean([m['accuracy'] for m in all_metrics])
        avg_precision = np.mean([m['precision'] for m in all_metrics])
        avg_recall = np.mean([m['recall'] for m in all_metrics])
        avg_f1 = np.mean([m['f1'] for m in all_metrics])
        
        print(f"Average Accuracy:  {avg_accuracy:.3f} ({avg_accuracy*100:.1f}%)")
        print(f"Average Precision: {avg_precision:.3f} ({avg_precision*100:.1f}%)")
        print(f"Average Recall:    {avg_recall:.3f} ({avg_recall*100:.1f}%)")
        print(f"Average F1-Score:  {avg_f1:.3f} ({avg_f1*100:.1f}%)")
        
        print(f"\n📊 Individual Dataset Results:")
        for metrics in all_metrics:
            print(f"   {metrics['dataset']}: "
                  f"Acc={metrics['accuracy']:.3f}, "
                  f"Prec={metrics['precision']:.3f}, "
                  f"Rec={metrics['recall']:.3f}, "
                  f"F1={metrics['f1']:.3f}")
    
    print(f"\n✅ Testing completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

if __name__ == "__main__":
    main() 