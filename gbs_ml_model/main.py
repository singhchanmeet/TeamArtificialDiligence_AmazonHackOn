#!/usr/bin/env python3
"""
Main script to run the complete GBS model pipeline
"""

import os
import sys
import argparse
from pathlib import Path

# Add src to path
sys.path.append('src')

from data_generation import SyntheticDataGenerator
from preprocessing import DataPreprocessor
from training import GBSTrainer
from gbs_model import GBSGenerator
from evaluation import GBSEvaluator, create_fraud_test_cases
from inference import GBSDemo
import pandas as pd
import torch

def setup_directories():
    """Create necessary directories"""
    directories = [
        'data/raw', 'data/processed', 'data/synthetic',
        'models/saved_models', 'models/checkpoints',
        'notebooks', 'tests'
    ]
    
    for directory in directories:
        Path(directory).mkdir(parents=True, exist_ok=True)
    print("✓ Directories created successfully!")

def generate_data():
    """Generate synthetic transaction data"""
    print("Generating synthetic data...")
    generator = SyntheticDataGenerator(n_users=500, days=90)
    data, profiles = generator.generate_dataset()
    
    # Save data
    data.to_csv('data/synthetic/transactions.csv', index=False)
    pd.DataFrame(profiles).to_csv('data/synthetic/user_profiles.csv', index=False)
    
    print(f"✓ Generated {len(data)} transactions for {len(profiles)} users")
    return data

def train_model():
    """Train the GBS model"""
    print("Training GBS model...")
    
    # Load data
    df = pd.read_csv('data/synthetic/transactions.csv')
    
    # Preprocess
    preprocessor = DataPreprocessor()
    sequences, user_sequences = preprocessor.prepare_sequences(df, sequence_length=10)
    train_loader, val_loader = preprocessor.create_dataloaders(sequences, batch_size=32)
    
    # Initialize and train model
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    model = GBSGenerator(input_size=8, hidden_size=64, num_layers=2)
    
    trainer = GBSTrainer(model, device)
    trainer.train(train_loader, val_loader, epochs=30)
    
    print("✓ Model training completed!")

def evaluate_model():
    """Evaluate the trained model"""
    print("Evaluating model...")
    
    # Load test data
    df = pd.read_csv('data/synthetic/transactions.csv')
    test_data, fraud_labels = create_fraud_test_cases(df, n_fraud=200)
    
    # Evaluate
    evaluator = GBSEvaluator('models/saved_models/best_gbs_model.pth')
    divergence_scores = evaluator.evaluate_fraud_detection(test_data, fraud_labels)
    evaluator.plot_divergence_distribution(divergence_scores, fraud_labels)
    
    print("✓ Model evaluation completed!")

def run_demo():
    """Run fraud detection demo"""
    print("Running fraud detection demo...")
    demo = GBSDemo()
    demo.demo_fraud_detection()

def main():
    parser = argparse.ArgumentParser(description='GBS Fraud Detection System')
    parser.add_argument('--mode', choices=['all', 'generate', 'train', 'evaluate', 'demo'], 
                       default='all', help='What to run')
    
    args = parser.parse_args()
    
    print("🚀 Starting GBS Fraud Detection System")
    print("="*50)
    
    # Setup
    setup_directories()
    
    if args.mode in ['all', 'generate']:
        generate_data()
    
    if args.mode in ['all', 'train']:
        train_model()
    
    if args.mode in ['all', 'evaluate']:
        evaluate_model()
    
    if args.mode in ['all', 'demo']:
        run_demo()
    
    print("\n🎉 GBS System setup completed successfully!")
    print("\nNext steps:")
    print("1. Check your trained model in 'models/saved_models/'")
    print("2. View evaluation results in 'models/evaluation_results.png'")
    print("3. Integrate the inference engine into your main project")

if __name__ == "__main__":
    main()