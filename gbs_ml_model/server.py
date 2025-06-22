#!/usr/bin/env python3
"""
Flask API for True Hybrid Fraud Detection System
Real-time fraud detection API with comprehensive endpoints
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import sys
import os
import logging
import numpy as np
from datetime import datetime
import traceback

# Add src to path for imports
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

try:
    from true_hybrid_detector import TrueHybridFraudDetector
except ImportError as e:
    print(f"Error importing TrueHybridFraudDetector: {e}")
    print("Please ensure the 'src' directory contains the 'true_hybrid_detector.py' file")
    sys.exit(1)

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('fraud_detection_api.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Global detector instance
detector = None

def initialize_detector():
    """Initialize the fraud detector"""
    global detector
    try:
        detector = TrueHybridFraudDetector()
        logger.info("✅ True Hybrid Fraud Detector initialized successfully")
        return True
    except Exception as e:
        logger.error(f"❌ Failed to initialize detector: {e}")
        return False

def validate_transaction_data(data):
    """Validate required transaction fields"""
    required_fields = [
        'user_id', 'amount', 'merchant_category', 'city', 
        'device_type', 'payment_method', 'hour_of_day'
    ]
    
    missing_fields = []
    for field in required_fields:
        if field not in data:
            missing_fields.append(field)
    
    if missing_fields:
        return False, f"Missing required fields: {', '.join(missing_fields)}"
    
    # Validate data types
    try:
        float(data['amount'])
        int(data['hour_of_day'])
        str(data['user_id'])
        str(data['merchant_category'])
        str(data['city'])
        str(data['device_type'])
        str(data['payment_method'])
    except (ValueError, TypeError) as e:
        return False, f"Invalid data type: {e}"
    
    # Validate ranges
    if float(data['amount']) < 0:
        return False, "Amount must be non-negative"
    
    if not (0 <= int(data['hour_of_day']) <= 23):
        return False, "Hour of day must be between 0 and 23"
    
    return True, "Valid"

def prepare_transaction_data(data):
    """Prepare and normalize transaction data for TrueHybridFraudDetector"""
    transaction = {
        "user_id": str(data['user_id']),
        "amount": float(data['amount']),
        "merchant_category": str(data['merchant_category']),
        "city": str(data['city']),
        "device_type": str(data['device_type']),
        "payment_method": str(data['payment_method']),
        "hour_of_day": int(data['hour_of_day']),
        "timestamp": data.get('timestamp', datetime.now().isoformat())
    }
    return transaction

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    try:
        if detector is None:
            return jsonify({
                "status": "unhealthy",
                "message": "Detector not initialized",
                "timestamp": datetime.now().isoformat()
            }), 503
        
        # Test detector functionality
        info = detector.get_system_info()
        
        return jsonify({
            "status": "healthy",
            "message": "Fraud detection API is running",
            "detector_info": info,
            "timestamp": datetime.now().isoformat()
        }), 200
    
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return jsonify({
            "status": "unhealthy",
            "message": f"Health check failed: {str(e)}",
            "timestamp": datetime.now().isoformat()
        }), 503

@app.route('/detect', methods=['POST'])
def detect_fraud():
    """Main fraud detection endpoint"""
    try:
        # Check if detector is initialized
        if detector is None:
            return jsonify({
                "error": "Detector not initialized",
                "timestamp": datetime.now().isoformat()
            }), 503
        
        # Get request data
        data = request.get_json()
        if not data:
            return jsonify({
                "error": "No JSON data provided",
                "timestamp": datetime.now().isoformat()
            }), 400
        
        # Validate transaction data
        is_valid, validation_message = validate_transaction_data(data)
        if not is_valid:
            return jsonify({
                "error": validation_message,
                "timestamp": datetime.now().isoformat()
            }), 400
        
        # Prepare transaction
        transaction = prepare_transaction_data(data)
        
        # Perform fraud detection using your existing TrueHybridFraudDetector
        result = detector.detect_fraud(transaction['user_id'], transaction)
        
        # Add transaction to history (as done in your original system)
        detector.add_transaction_to_history(transaction['user_id'], transaction)
        
        # Log the prediction
        logger.info(f"Fraud detection for user {transaction['user_id']}: "
                   f"Amount=${transaction['amount']:.2f}, "
                   f"Decision={'Block' if result['block_transaction'] else 'Allow'}, "
                   f"Risk={result['risk_score']:.3f}")
        
        # Return result using your existing detector's output format
        return jsonify({
            "transaction_id": data.get('transaction_id', 'unknown'),
            "user_id": transaction['user_id'],
            "decision": "block" if result['block_transaction'] else "allow",
            "risk_score": round(result['risk_score'], 4),
            "risk_level": result['risk_level'],
            "ml_score": round(result.get('ml_score', 0), 4),
            "rule_score": round(result.get('rule_score', 0), 4),
            "detection_method": result.get('detection_method', 'hybrid'),
            "requires_verification": result.get('requires_verification', False),
            "reasons": result.get('reasons', []),
            "confidence": result.get('confidence', 'medium'),
            "hybrid_analysis": result.get('hybrid_analysis', {}),
            "timestamp": datetime.now().isoformat()
        }), 200
    
    except Exception as e:
        logger.error(f"Fraud detection error: {e}")
        logger.error(traceback.format_exc())
        return jsonify({
            "error": f"Internal server error: {str(e)}",
            "timestamp": datetime.now().isoformat()
        }), 500

@app.route('/detect/batch', methods=['POST'])
def detect_fraud_batch():
    """Batch fraud detection endpoint"""
    try:
        if detector is None:
            return jsonify({
                "error": "Detector not initialized",
                "timestamp": datetime.now().isoformat()
            }), 503
        
        data = request.get_json()
        if not data or 'transactions' not in data:
            return jsonify({
                "error": "No transactions provided. Expected format: {'transactions': [...]}"
            }), 400
        
        transactions = data['transactions']
        if not isinstance(transactions, list):
            return jsonify({
                "error": "Transactions must be a list"
            }), 400
        
        if len(transactions) > 100:  # Limit batch size
            return jsonify({
                "error": "Batch size too large. Maximum 100 transactions allowed."
            }), 400
        
        results = []
        errors = []
        
        for i, transaction_data in enumerate(transactions):
            try:
                # Validate transaction
                is_valid, validation_message = validate_transaction_data(transaction_data)
                if not is_valid:
                    errors.append({
                        "index": i,
                        "error": validation_message
                    })
                    continue
                
                # Prepare transaction
                transaction = prepare_transaction_data(transaction_data)
                
                # Detect fraud using your existing TrueHybridFraudDetector
                result = detector.detect_fraud(user_id, transaction)
                
                # Add to history (as your system does)
                detector.add_transaction_to_history(user_id, transaction)
                
                results.append({
                    "index": i,
                    "transaction_id": transaction_data.get('transaction_id', f'batch_{i}'),
                    "user_id": transaction['user_id'],
                    "decision": "block" if result['block_transaction'] else "allow",
                    "risk_score": round(result['risk_score'], 4),
                    "risk_level": result['risk_level'],
                    "ml_score": round(result.get('ml_score', 0), 4),
                    "rule_score": round(result.get('rule_score', 0), 4),
                    "detection_method": result.get('detection_method', 'hybrid'),
                    "requires_verification": result.get('requires_verification', False),
                    "reasons": result.get('reasons', []),
                    "confidence": result.get('confidence', 'medium')
                })
                
            except Exception as e:
                errors.append({
                    "index": i,
                    "error": f"Processing error: {str(e)}"
                })
        
        logger.info(f"Batch processing: {len(results)} successful, {len(errors)} errors")
        
        return jsonify({
            "results": results,
            "errors": errors,
            "summary": {
                "total_transactions": len(transactions),
                "successful": len(results),
                "failed": len(errors),
                "blocked": sum(1 for r in results if r['decision'] == 'block'),
                "allowed": sum(1 for r in results if r['decision'] == 'allow')
            },
            "timestamp": datetime.now().isoformat()
        }), 200
    
    except Exception as e:
        logger.error(f"Batch detection error: {e}")
        return jsonify({
            "error": f"Internal server error: {str(e)}",
            "timestamp": datetime.now().isoformat()
        }), 500

@app.route('/info', methods=['GET'])
def get_system_info():
    """Get system information"""
    try:
        if detector is None:
            return jsonify({
                "error": "Detector not initialized"
            }), 503
        
        info = detector.get_system_info()
        
        return jsonify({
            "system_info": info,
            "api_version": "1.0.0",
            "endpoints": {
                "health": "/health",
                "detect": "/detect",
                "batch_detect": "/detect/batch",
                "info": "/info"
            },
            "timestamp": datetime.now().isoformat()
        }), 200
    
    except Exception as e:
        logger.error(f"System info error: {e}")
        return jsonify({
            "error": f"Failed to get system info: {str(e)}"
        }), 500

@app.route('/analyze/user', methods=['POST'])
def analyze_user_behavior():
    """Analyze multiple transactions from a single user for behavioral patterns"""
    try:
        if detector is None:
            return jsonify({
                "error": "Detector not initialized"
            }), 503
        
        data = request.get_json()
        if not data:
            return jsonify({
                "error": "No JSON data provided"
            }), 400
        
        if 'user_id' not in data or 'transactions' not in data:
            return jsonify({
                "error": "Required fields: 'user_id' and 'transactions'"
            }), 400
        
        user_id = str(data['user_id'])
        transactions = data['transactions']
        
        if not isinstance(transactions, list) or len(transactions) == 0:
            return jsonify({
                "error": "Transactions must be a non-empty list"
            }), 400
        
        # Process transactions sequentially to build user behavior profile
        results = []
        risk_scores = []
        ml_scores = []
        rule_scores = []
        fraud_decisions = []
        timestamps = []
        
        for i, transaction_data in enumerate(transactions):
            try:
                # Add user_id to transaction data for validation
                transaction_data_with_user = transaction_data.copy()
                transaction_data_with_user['user_id'] = user_id
                
                # Validate transaction
                is_valid, validation_message = validate_transaction_data(transaction_data_with_user)
                if not is_valid:
                    return jsonify({
                        "error": f"Transaction {i}: {validation_message}"
                    }), 400
                
                # Prepare transaction
                transaction = prepare_transaction_data(transaction_data_with_user)
                
                # Detect fraud - this builds user history over time using your existing system
                result = detector.detect_fraud(user_id, transaction)
                
                # Add to history (as your system does)
                detector.add_transaction_to_history(user_id, transaction)
                
                # Collect data for analysis
                risk_scores.append(result['risk_score'])
                ml_scores.append(result.get('ml_score', 0))
                rule_scores.append(result.get('rule_score', 0))
                fraud_decisions.append(1 if result['block_transaction'] else 0)
                timestamps.append(transaction.get('timestamp', datetime.now().isoformat()))
                
                transaction_result = {
                    "sequence": i + 1,
                    "transaction_id": transaction_data.get('transaction_id', f'seq_{i+1}'),
                    "amount": transaction['amount'],
                    "merchant_category": transaction['merchant_category'],
                    "city": transaction['city'],
                    "device_type": transaction['device_type'],
                    "hour_of_day": transaction['hour_of_day'],
                    "decision": "block" if result['block_transaction'] else "allow",
                    "risk_score": round(result['risk_score'], 4),
                    "risk_level": result['risk_level'],
                    "ml_score": round(result.get('ml_score', 0), 4),
                    "rule_score": round(result.get('rule_score', 0), 4),
                    "detection_method": result.get('detection_method', 'hybrid'),
                    "requires_verification": result.get('requires_verification', False),
                    "reasons": result.get('reasons', []),
                    "confidence": result.get('confidence', 'medium'),
                    "actual_fraud": transaction_data.get('is_fraud', None)
                }
                
                results.append(transaction_result)
                
            except Exception as e:
                logger.error(f"Error processing transaction {i}: {e}")
                return jsonify({
                    "error": f"Error processing transaction {i}: {str(e)}"
                }), 500
        
        # Behavioral Analysis
        behavioral_analysis = {
            "transaction_count": len(results),
            "blocked_transactions": sum(fraud_decisions),
            "allowed_transactions": len(fraud_decisions) - sum(fraud_decisions),
            "block_rate": sum(fraud_decisions) / len(fraud_decisions) if fraud_decisions else 0,
            
            # Risk score patterns
            "risk_score_stats": {
                "min": float(np.min(risk_scores)),
                "max": float(np.max(risk_scores)),
                "mean": float(np.mean(risk_scores)),
                "std": float(np.std(risk_scores)),
                "trend": "increasing" if risk_scores[-1] > risk_scores[0] else "decreasing" if risk_scores[-1] < risk_scores[0] else "stable"
            },
            
            # ML vs Rule analysis
            "model_analysis": {
                "ml_avg": float(np.mean(ml_scores)),
                "rule_avg": float(np.mean(rule_scores)),
                "ml_dominance": float(np.mean([1 if ml > rule else 0 for ml, rule in zip(ml_scores, rule_scores)]))
            },
            
            # Pattern detection
            "patterns": {
                "amount_escalation": detect_amount_escalation([r['amount'] for r in results]),
                "geographic_spread": len(set([r['city'] for r in results])),
                "device_switching": len(set([r['device_type'] for r in results])),
                "time_span_hours": calculate_time_span(timestamps),
                "rapid_transactions": detect_rapid_transactions(timestamps),
                "merchant_diversity": len(set([r['merchant_category'] for r in results]))
            }
        }
        
        # Accuracy metrics if actual fraud labels provided
        accuracy_metrics = None
        if all('actual_fraud' in t and t['actual_fraud'] is not None for t in transaction_data for transaction_data in transactions):
            actual_labels = [int(t.get('is_fraud', 0)) for t in transactions]
            if actual_labels:
                from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
                accuracy_metrics = {
                    "accuracy": float(accuracy_score(actual_labels, fraud_decisions)),
                    "precision": float(precision_score(actual_labels, fraud_decisions, zero_division=0)),
                    "recall": float(recall_score(actual_labels, fraud_decisions, zero_division=0)),
                    "f1_score": float(f1_score(actual_labels, fraud_decisions, zero_division=0))
                }
        
        # Risk assessment
        risk_assessment = assess_user_risk_level(behavioral_analysis, results)
        
        logger.info(f"User behavior analysis for {user_id}: {len(results)} transactions, "
                   f"{behavioral_analysis['blocked_transactions']} blocked, "
                   f"risk trend: {behavioral_analysis['risk_score_stats']['trend']}")
        
        response = {
            "user_id": user_id,
            "transaction_results": results,
            "behavioral_analysis": behavioral_analysis,
            "risk_assessment": risk_assessment,
            "timestamp": datetime.now().isoformat()
        }
        
        if accuracy_metrics:
            response["accuracy_metrics"] = accuracy_metrics
        
        return jsonify(response), 200
    
    except Exception as e:
        logger.error(f"User behavior analysis error: {e}")
        logger.error(traceback.format_exc())
        return jsonify({
            "error": f"Internal server error: {str(e)}"
        }), 500

def detect_amount_escalation(amounts):
    """Detect if transaction amounts are escalating suspiciously"""
    if len(amounts) < 3:
        return False
    
    # Check if amounts are generally increasing
    increases = sum(1 for i in range(1, len(amounts)) if amounts[i] > amounts[i-1])
    escalation_rate = increases / (len(amounts) - 1)
    
    # Check for sudden jumps
    max_jump = 0
    for i in range(1, len(amounts)):
        if amounts[i-1] > 0:
            jump = amounts[i] / amounts[i-1]
            max_jump = max(max_jump, jump)
    
    return escalation_rate > 0.6 and max_jump > 3.0

def calculate_time_span(timestamps):
    """Calculate time span between first and last transaction in hours"""
    if len(timestamps) < 2:
        return 0
    
    try:
        first_time = datetime.fromisoformat(timestamps[0].replace('Z', '+00:00'))
        last_time = datetime.fromisoformat(timestamps[-1].replace('Z', '+00:00'))
        return (last_time - first_time).total_seconds() / 3600
    except:
        return 0

def detect_rapid_transactions(timestamps):
    """Detect if transactions are happening too rapidly"""
    if len(timestamps) < 2:
        return False
    
    rapid_count = 0
    for i in range(1, len(timestamps)):
        try:
            time1 = datetime.fromisoformat(timestamps[i-1].replace('Z', '+00:00'))
            time2 = datetime.fromisoformat(timestamps[i].replace('Z', '+00:00'))
            minutes_diff = (time2 - time1).total_seconds() / 60
            if minutes_diff < 5:  # Less than 5 minutes apart
                rapid_count += 1
        except:
            continue
    
    return rapid_count > len(timestamps) * 0.3  # More than 30% are rapid

def assess_user_risk_level(behavioral_analysis, results):
    """Assess overall user risk level based on behavioral patterns"""
    risk_factors = []
    risk_score = 0
    
    # High block rate
    if behavioral_analysis['block_rate'] > 0.5:
        risk_factors.append("High transaction block rate")
        risk_score += 3
    
    # Escalating risk scores
    if behavioral_analysis['risk_score_stats']['trend'] == "increasing":
        risk_factors.append("Escalating risk pattern")
        risk_score += 2
    
    # Amount escalation
    if behavioral_analysis['patterns']['amount_escalation']:
        risk_factors.append("Suspicious amount escalation")
        risk_score += 2
    
    # Geographic spread
    if behavioral_analysis['patterns']['geographic_spread'] > 3:
        risk_factors.append("Multiple geographic locations")
        risk_score += 2
    
    # Device switching
    if behavioral_analysis['patterns']['device_switching'] > 2:
        risk_factors.append("Frequent device switching")
        risk_score += 1
    
    # Rapid transactions
    if behavioral_analysis['patterns']['rapid_transactions']:
        risk_factors.append("Rapid-fire transaction pattern")
        risk_score += 2
    
    # High average risk score
    if behavioral_analysis['risk_score_stats']['mean'] > 0.7:
        risk_factors.append("Consistently high risk scores")
        risk_score += 2
    
    # Determine overall risk level
    if risk_score >= 8:
        risk_level = "critical"
    elif risk_score >= 5:
        risk_level = "high"
    elif risk_score >= 3:
        risk_level = "medium"
    else:
        risk_level = "low"
    
    return {
        "overall_risk_level": risk_level,
        "risk_score": risk_score,
        "risk_factors": risk_factors,
        "recommendation": get_risk_recommendation(risk_level, risk_score)
    }

def get_risk_recommendation(risk_level, risk_score):
    """Get recommendation based on risk assessment"""
    recommendations = {
        "critical": "Immediate account review required. Consider account suspension and manual verification.",
        "high": "Enhanced monitoring recommended. Require additional authentication for future transactions.",
        "medium": "Monitor closely. Consider transaction limits or additional verification for high-value transactions.",
        "low": "Normal monitoring. User appears to have legitimate transaction patterns."
    }
    return recommendations.get(risk_level, "Continue standard monitoring.")

@app.route('/stats', methods=['GET'])
def get_stats():
    """Get basic API statistics"""
    # In a production system, you'd track these metrics properly
    return jsonify({
        "message": "Statistics endpoint - implement with proper metrics tracking",
        "suggested_metrics": [
            "total_requests",
            "fraud_detected",
            "false_positives",
            "average_response_time",
            "requests_per_hour"
        ],
        "timestamp": datetime.now().isoformat()
    }), 200

@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors"""
    return jsonify({
        "error": "Endpoint not found",
        "available_endpoints": ["/health", "/detect", "/detect/batch", "/info", "/stats"]
    }), 404

@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors"""
    logger.error(f"Internal server error: {error}")
    return jsonify({
        "error": "Internal server error",
        "timestamp": datetime.now().isoformat()
    }), 500

def main():
    """Main function to run the API"""
    print("🚀 Starting Fraud Detection API...")
    
    # Initialize detector
    if not initialize_detector():
        print("❌ Failed to initialize detector. Exiting.")
        sys.exit(1)
    
    print("✅ Detector initialized successfully")
    print("🌐 API Endpoints:")
    print("   GET  /health - Health check")
    print("   POST /detect - Single transaction fraud detection")
    print("   POST /detect/batch - Batch fraud detection")
    print("   POST /analyze/user - User behavioral analysis")
    print("   GET  /info - System information")
    print("   GET  /stats - API statistics")
    
    # Run the Flask app
    app.run(
        host='0.0.0.0',
        port=5000,
        debug=True  # Set to False in production
    )

if __name__ == "__main__":
    main()