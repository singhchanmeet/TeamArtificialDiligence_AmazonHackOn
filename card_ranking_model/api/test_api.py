"""
Test script for the Cardholder Ranking API
Tests all endpoints with sample data
"""

import requests
import json
import time
from typing import Dict, Any

# API base URL
BASE_URL = "http://localhost:8000"

def test_health_check():
    """Test health check endpoint"""
    print("🧪 Testing Health Check...")
    try:
        response = requests.get(f"{BASE_URL}/health")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Health check passed: {data['status']}")
            print(f"   Model loaded: {data['model_loaded']}")
            print(f"   Pipeline loaded: {data['feature_pipeline_loaded']}")
            return True
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Health check error: {e}")
        return False

def test_single_ranking():
    """Test single cardholder ranking"""
    print("\n🧪 Testing Single Cardholder Ranking...")
    
    cardholder_data = {
        "user_id": "TEST001",
        "credit_limit": 100000,
        "avg_repayment_time": 5.0,
        "transaction_success_rate": 0.95,
        "response_speed": 120.0,
        "discount_hit_rate": 0.8,
        "commission_acceptance_rate": 0.9,
        "user_rating": 4,
        "default_count": 0,
        "record_timestamp": "2024-01-15T10:30:00"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/rank-single", json=cardholder_data)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Single ranking successful")
            print(f"   Request ID: {data['request_id']}")
            print(f"   Processing time: {data['processing_time_ms']}ms")
            print(f"   Health score: {data['cardholder']['health_score']:.3f}")
            print(f"   Rank: {data['cardholder']['rank']}")
            return True
        else:
            print(f"❌ Single ranking failed: {response.status_code}")
            print(f"   Error: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Single ranking error: {e}")
        return False

def test_batch_ranking():
    """Test batch cardholder ranking"""
    print("\n🧪 Testing Batch Ranking...")
    
    batch_data = {
        "cardholders": [
            {
                "user_id": "TEST001",
                "credit_limit": 100000,
                "avg_repayment_time": 5.0,
                "transaction_success_rate": 0.95,
                "response_speed": 120.0,
                "discount_hit_rate": 0.8,
                "commission_acceptance_rate": 0.9,
                "user_rating": 4,
                "default_count": 0
            },
            {
                "user_id": "TEST002",
                "credit_limit": 75000,
                "avg_repayment_time": 8.0,
                "transaction_success_rate": 0.88,
                "response_speed": 180.0,
                "discount_hit_rate": 0.7,
                "commission_acceptance_rate": 0.8,
                "user_rating": 3,
                "default_count": 1
            },
            {
                "user_id": "TEST003",
                "credit_limit": 150000,
                "avg_repayment_time": 3.0,
                "transaction_success_rate": 0.98,
                "response_speed": 90.0,
                "discount_hit_rate": 0.9,
                "commission_acceptance_rate": 0.95,
                "user_rating": 5,
                "default_count": 0
            }
        ],
        "merchant_category": "ecommerce"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/rank-batch", json=batch_data)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Batch ranking successful")
            print(f"   Request ID: {data['request_id']}")
            print(f"   Processing time: {data['processing_time_ms']}ms")
            print(f"   Total cardholders: {data['total_cardholders']}")
            print(f"   Top performer: {data['ranked_cardholders'][0]['cardholder_id']} (Score: {data['ranked_cardholders'][0]['health_score']:.3f})")
            return True
        else:
            print(f"❌ Batch ranking failed: {response.status_code}")
            print(f"   Error: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Batch ranking error: {e}")
        return False

def test_top_ranking():
    """Test top K ranking"""
    print("\n🧪 Testing Top K Ranking...")
    
    batch_data = {
        "cardholders": [
            {
                "user_id": "TEST001",
                "credit_limit": 100000,
                "avg_repayment_time": 5.0,
                "transaction_success_rate": 0.95,
                "response_speed": 120.0,
                "discount_hit_rate": 0.8,
                "commission_acceptance_rate": 0.9,
                "user_rating": 4,
                "default_count": 0
            },
            {
                "user_id": "TEST002",
                "credit_limit": 75000,
                "avg_repayment_time": 8.0,
                "transaction_success_rate": 0.88,
                "response_speed": 180.0,
                "discount_hit_rate": 0.7,
                "commission_acceptance_rate": 0.8,
                "user_rating": 3,
                "default_count": 1
            },
            {
                "user_id": "TEST003",
                "credit_limit": 150000,
                "avg_repayment_time": 3.0,
                "transaction_success_rate": 0.98,
                "response_speed": 90.0,
                "discount_hit_rate": 0.9,
                "commission_acceptance_rate": 0.95,
                "user_rating": 5,
                "default_count": 0
            }
        ]
    }
    
    try:
        response = requests.post(f"{BASE_URL}/rank-top?top_k=2", json=batch_data)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Top K ranking successful")
            print(f"   Request ID: {data['request_id']}")
            print(f"   Processing time: {data['processing_time_ms']}ms")
            print(f"   Top K: {data['top_k']}")
            print(f"   Top performer: {data['top_cardholders'][0]['cardholder_id']} (Score: {data['top_cardholders'][0]['health_score']:.3f})")
            return True
        else:
            print(f"❌ Top K ranking failed: {response.status_code}")
            print(f"   Error: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Top K ranking error: {e}")
        return False

def test_model_info():
    """Test model info endpoint"""
    print("\n🧪 Testing Model Info...")
    try:
        response = requests.get(f"{BASE_URL}/model-info")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Model info successful")
            print(f"   Model type: {data['model_type']}")
            print(f"   Feature count: {data['feature_count']}")
            print(f"   Model size: {data['model_size_mb']}MB")
            return True
        else:
            print(f"❌ Model info failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Model info error: {e}")
        return False

def test_performance():
    """Test API performance"""
    print("\n🧪 Testing Performance...")
    
    # Create 10 test cardholders
    cardholders = []
    for i in range(10):
        cardholder = {
            "user_id": f"PERF{i:03d}",
            "credit_limit": 50000 + (i * 10000),
            "avg_repayment_time": 3.0 + (i * 0.5),
            "transaction_success_rate": 0.85 + (i * 0.01),
            "response_speed": 100.0 + (i * 10),
            "discount_hit_rate": 0.7 + (i * 0.02),
            "commission_acceptance_rate": 0.8 + (i * 0.01),
            "user_rating": 3 + (i % 3),
            "default_count": i % 2
        }
        cardholders.append(cardholder)
    
    batch_data = {"cardholders": cardholders}
    
    try:
        start_time = time.time()
        response = requests.post(f"{BASE_URL}/rank-batch", json=batch_data)
        end_time = time.time()
        
        if response.status_code == 200:
            total_time = (end_time - start_time) * 1000
            data = response.json()
            api_time = data['processing_time_ms']
            
            print(f"✅ Performance test successful")
            print(f"   Total time: {total_time:.2f}ms")
            print(f"   API processing time: {api_time:.2f}ms")
            print(f"   Network overhead: {total_time - api_time:.2f}ms")
            print(f"   Time per cardholder: {api_time/len(cardholders):.2f}ms")
            return True
        else:
            print(f"❌ Performance test failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Performance test error: {e}")
        return False

def main():
    """Run all API tests"""
    print("🚀 API TESTING SUITE")
    print("=" * 60)
    
    tests = [
        test_health_check,
        test_single_ranking,
        test_batch_ranking,
        test_top_ranking,
        test_model_info,
        test_performance
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        if test():
            passed += 1
    
    print("\n" + "=" * 60)
    print(f"📊 API TEST RESULTS: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All API tests passed! API is ready for production.")
    else:
        print("⚠️ Some API tests failed. Please check the issues above.")
    
    return passed == total

if __name__ == "__main__":
    main() 