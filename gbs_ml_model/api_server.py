#!/usr/bin/env python3
"""
Flask REST API for Real-time Fraud Detection
This provides a web API for integrating fraud detection into applications
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import logging
from datetime import datetime
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)) + '/src')

from real_time_inference import RealTimeFraudDetector
from config import PATHS

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Initialize the fraud detector
try:
    fraud_detector = RealTimeFraudDetector()
    logger.info("✅ Fraud detector initialized successfully")
except Exception as e:
    logger.error(f"❌ Failed to initialize fraud detector: {e}")
    fraud_detector = None

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'model_loaded': fraud_detector is not None
    })

@app.route('/detect_fraud', methods=['POST'])
def detect_fraud():
    """Main fraud detection endpoint"""
    if fraud_detector is None:
        return jsonify({
            'error': 'Fraud detector not initialized',
            'timestamp': datetime.now().isoformat()
        }), 500
    
    try:
        # Get request data
        data = request.get_json()
        
        if not data:
            return jsonify({
                'error': 'No data provided',
                'timestamp': datetime.now().isoformat()
            }), 400
        
        # Extract required fields
        user_id = data.get('user_id')
        transaction = data.get('transaction')
        
        if not user_id or not transaction:
            return jsonify({
                'error': 'Missing user_id or transaction data',
                'timestamp': datetime.now().isoformat()
            }), 400
        
        # Process transaction
        result = fraud_detector.process_transaction(user_id, transaction)
        
        # Log the request
        logger.info(f"Fraud detection request for user {user_id}: risk_score={result['risk_score']:.3f}")
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Error processing fraud detection request: {e}")
        return jsonify({
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

@app.route('/user_history/<user_id>', methods=['GET'])
def get_user_history(user_id):
    """Get user's transaction history"""
    if fraud_detector is None:
        return jsonify({'error': 'Fraud detector not initialized'}), 500
    
    try:
        history = fraud_detector.user_histories.get(user_id, [])
        return jsonify({
            'user_id': user_id,
            'transaction_count': len(history),
            'history': history
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/add_transaction', methods=['POST'])
def add_transaction():
    """Add a transaction to user history without fraud detection"""
    if fraud_detector is None:
        return jsonify({'error': 'Fraud detector not initialized'}), 500
    
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        transaction = data.get('transaction')
        
        if not user_id or not transaction:
            return jsonify({'error': 'Missing user_id or transaction data'}), 400
        
        fraud_detector.add_transaction_to_history(user_id, transaction)
        
        return jsonify({
            'message': 'Transaction added to history',
            'user_id': user_id,
            'history_length': len(fraud_detector.user_histories[user_id])
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/stats', methods=['GET'])
def get_stats():
    """Get system statistics"""
    if fraud_detector is None:
        return jsonify({'error': 'Fraud detector not initialized'}), 500
    
    try:
        total_users = len(fraud_detector.user_histories)
        total_transactions = sum(len(history) for history in fraud_detector.user_histories.values())
        
        return jsonify({
            'total_users': total_users,
            'total_transactions': total_transactions,
            'avg_transactions_per_user': total_transactions / max(total_users, 1),
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("🚀 Starting Fraud Detection API Server...")
    print("📊 Endpoints available:")
    print("  - GET  /health - Health check")
    print("  - POST /detect_fraud - Detect fraud for a transaction")
    print("  - GET  /user_history/<user_id> - Get user transaction history")
    print("  - POST /add_transaction - Add transaction to history")
    print("  - GET  /stats - Get system statistics")
    print("\n🌐 Server will start on http://localhost:5000")
    
    app.run(host='0.0.0.0', port=5000, debug=False) 