#!/usr/bin/env python3
"""
Client Example for Fraud Detection API
This demonstrates how to integrate fraud detection into your applications
"""

import requests
import json
import time
from datetime import datetime

# API Configuration
API_BASE_URL = "http://localhost:5000"

def test_api_health():
    """Test if the API is running"""
    try:
        response = requests.get(f"{API_BASE_URL}/health")
        if response.status_code == 200:
            data = response.json()
            print("✅ API is healthy!")
            print(f"   Status: {data['status']}")
            print(f"   Model loaded: {data['model_loaded']}")
            return True
        else:
            print(f"❌ API health check failed: {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to API. Make sure the server is running.")
        return False

def detect_fraud(user_id, transaction):
    """Send fraud detection request to API"""
    url = f"{API_BASE_URL}/detect_fraud"
    payload = {
        "user_id": user_id,
        "transaction": transaction
    }
    
    try:
        response = requests.post(url, json=payload)
        if response.status_code == 200:
            return response.json()
        else:
            print(f"❌ Fraud detection failed: {response.status_code}")
            print(f"   Error: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Error calling API: {e}")
        return None

def add_transaction_to_history(user_id, transaction):
    """Add transaction to user history"""
    url = f"{API_BASE_URL}/add_transaction"
    payload = {
        "user_id": user_id,
        "transaction": transaction
    }
    
    try:
        response = requests.post(url, json=payload)
        if response.status_code == 200:
            return response.json()
        else:
            print(f"❌ Failed to add transaction: {response.status_code}")
            return None
    except Exception as e:
        print(f"❌ Error adding transaction: {e}")
        return None

def get_user_history(user_id):
    """Get user's transaction history"""
    url = f"{API_BASE_URL}/user_history/{user_id}"
    
    try:
        response = requests.get(url)
        if response.status_code == 200:
            return response.json()
        else:
            print(f"❌ Failed to get user history: {response.status_code}")
            return None
    except Exception as e:
        print(f"❌ Error getting user history: {e}")
        return None

def get_system_stats():
    """Get system statistics"""
    url = f"{API_BASE_URL}/stats"
    
    try:
        response = requests.get(url)
        if response.status_code == 200:
            return response.json()
        else:
            print(f"❌ Failed to get stats: {response.status_code}")
            return None
    except Exception as e:
        print(f"❌ Error getting stats: {e}")
        return None

def demo_api_usage():
    """Demonstrate API usage"""
    print("🚀 Fraud Detection API Client Demo")
    print("=" * 50)
    
    # Check API health
    if not test_api_health():
        print("\n❌ API is not available. Please start the server first:")
        print("   python api_server.py")
        return
    
    user_id = "api_user_123"
    
    # Build user history with normal transactions
    print(f"\n📊 Building transaction history for {user_id}...")
    
    normal_transactions = [
        {
            'amount': 500.0,
            'timestamp': '2024-01-15 09:30:00',
            'merchant_category': 'Grocery',
            'city': 'Mumbai',
            'device_type': 'Mobile',
            'payment_method': 'Credit Card',
            'hour': 9,
            'day_of_week': 0,
            'daily_frequency': 2.0
        },
        {
            'amount': 1200.0,
            'timestamp': '2024-01-15 14:30:00',
            'merchant_category': 'Retail',
            'city': 'Mumbai',
            'device_type': 'Mobile',
            'payment_method': 'Credit Card',
            'hour': 14,
            'day_of_week': 0,
            'daily_frequency': 2.0
        },
        {
            'amount': 300.0,
            'timestamp': '2024-01-15 19:30:00',
            'merchant_category': 'Restaurant',
            'city': 'Mumbai',
            'device_type': 'Mobile',
            'payment_method': 'Credit Card',
            'hour': 19,
            'day_of_week': 0,
            'daily_frequency': 2.0
        }
    ]
    
    # Add normal transactions to history
    for tx in normal_transactions:
        result = add_transaction_to_history(user_id, tx)
        if result:
            print(f"   ✅ Added transaction: {tx['amount']} at {tx['merchant_category']}")
    
    # Test 1: Normal transaction
    print(f"\n🔍 Test 1: Normal Transaction")
    normal_tx = {
        'amount': 600.0,
        'timestamp': '2024-01-16 10:30:00',
        'merchant_category': 'Grocery',
        'city': 'Mumbai',
        'device_type': 'Mobile',
        'payment_method': 'Credit Card',
        'hour': 10,
        'day_of_week': 1,
        'daily_frequency': 2.0
    }
    
    result = detect_fraud(user_id, normal_tx)
    if result:
        print(f"   Risk Score: {result['risk_score']:.3f}")
        print(f"   Risk Level: {result['risk_level']}")
        print(f"   Action: {'BLOCK' if result['block_transaction'] else 'ALLOW'}")
        print(f"   Recommendation: {result['recommendation']}")
    
    # Test 2: Suspicious transaction
    print(f"\n🔍 Test 2: Suspicious Transaction")
    suspicious_tx = {
        'amount': 15000.0,
        'timestamp': '2024-01-16 10:30:00',
        'merchant_category': 'Electronics',
        'city': 'Mumbai',
        'device_type': 'Mobile',
        'payment_method': 'Credit Card',
        'hour': 10,
        'day_of_week': 1,
        'daily_frequency': 2.0
    }
    
    result = detect_fraud(user_id, suspicious_tx)
    if result:
        print(f"   Risk Score: {result['risk_score']:.3f}")
        print(f"   Risk Level: {result['risk_level']}")
        print(f"   Action: {'BLOCK' if result['block_transaction'] else 'ALLOW'}")
        print(f"   Recommendation: {result['recommendation']}")
    
    # Get user history
    print(f"\n📊 User History for {user_id}")
    history = get_user_history(user_id)
    if history:
        print(f"   Total transactions: {history['transaction_count']}")
        print(f"   History length: {len(history['history'])}")
    
    # Get system stats
    print(f"\n📈 System Statistics")
    stats = get_system_stats()
    if stats:
        print(f"   Total users: {stats['total_users']}")
        print(f"   Total transactions: {stats['total_transactions']}")
        print(f"   Avg transactions per user: {stats['avg_transactions_per_user']:.2f}")

if __name__ == "__main__":
    demo_api_usage() 