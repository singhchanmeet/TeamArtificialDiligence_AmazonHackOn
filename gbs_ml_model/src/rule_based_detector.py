#!/usr/bin/env python3
"""
Rule-based Fraud Detection System
Designed specifically for real transaction data patterns
"""

import pandas as pd
from datetime import datetime
import numpy as np
from config import FRAUD_THRESHOLDS

class RuleBasedFraudDetector:
    """Rule-based fraud detection system for real transaction data"""
    
    def __init__(self):
        self.user_histories = {}
        self.fraud_rules = {
            'high_amount_night': {
                'description': 'High amount transaction during unusual hours (2-5 AM)',
                'amount_threshold': 15000,
                'hour_range': (2, 5),
                'risk_score': 0.85
            },
            'very_high_amount_different_city': {
                'description': 'Very high amount transaction in different city',
                'amount_threshold': 30000,
                'risk_score': 0.90
            },
            'high_amount_different_device': {
                'description': 'High amount transaction on unusual device',
                'amount_threshold': 20000,
                'risk_score': 0.80
            },
            'unusual_time_pattern': {
                'description': 'Transaction at unusual time for user',
                'risk_score': 0.70
            },
            'amount_spike': {
                'description': 'Unusual amount spike compared to user history',
                'multiplier': 5.0,
                'risk_score': 0.75
            }
        }
    
    def add_transaction_to_history(self, user_id, transaction):
        """Add transaction to user history"""
        if user_id not in self.user_histories:
            self.user_histories[user_id] = []
        
        self.user_histories[user_id].append(transaction)
    
    def get_user_statistics(self, user_id):
        """Get user transaction statistics"""
        if user_id not in self.user_histories or len(self.user_histories[user_id]) < 3:
            return None
        
        history = self.user_histories[user_id]
        
        stats = {
            'avg_amount': np.mean([tx['amount'] for tx in history]),
            'max_amount': np.max([tx['amount'] for tx in history]),
            'common_hours': self._get_common_hours(history),
            'common_cities': self._get_common_cities(history),
            'common_devices': self._get_common_devices(history),
            'transaction_count': len(history)
        }
        
        return stats
    
    def _get_common_hours(self, history):
        """Get most common transaction hours"""
        hours = [tx['hour'] for tx in history]
        return list(set(hours))
    
    def _get_common_cities(self, history):
        """Get most common transaction cities"""
        cities = [tx['city'] for tx in history]
        return list(set(cities))
    
    def _get_common_devices(self, history):
        """Get most common transaction devices"""
        devices = [tx['device_type'] for tx in history]
        return list(set(devices))
    
    def detect_fraud(self, user_id, transaction):
        """Detect fraud using rule-based approach (balanced version)"""
        try:
            # Get user statistics
            stats = self.get_user_statistics(user_id)
            
            if not stats:
                return {
                    'risk_score': 0.1,  # Lowered default for new users
                    'risk_level': 'LOW',
                    'requires_verification': False,
                    'block_transaction': False,
                    'message': 'Insufficient transaction history',
                    'rule_analysis': []
                }
            
            # Apply fraud rules
            rule_results = []
            max_risk_score = 0.0
            num_rules_triggered = 0
            
            # Rule 1: High amount + unusual time (2-5 AM)
            if (transaction['amount'] >= self.fraud_rules['high_amount_night']['amount_threshold'] and
                self.fraud_rules['high_amount_night']['hour_range'][0] <= transaction['hour'] <= 
                self.fraud_rules['high_amount_night']['hour_range'][1]):
                risk_score = self.fraud_rules['high_amount_night']['risk_score']
                rule_results.append({
                    'rule': 'high_amount_night',
                    'description': self.fraud_rules['high_amount_night']['description'],
                    'risk_score': risk_score,
                    'triggered': True
                })
                max_risk_score = max(max_risk_score, risk_score)
                num_rules_triggered += 1
            
            # Rule 2: Very high amount + different city
            if (transaction['amount'] >= self.fraud_rules['very_high_amount_different_city']['amount_threshold'] and
                transaction['city'] not in stats['common_cities']):
                risk_score = self.fraud_rules['very_high_amount_different_city']['risk_score']
                rule_results.append({
                    'rule': 'very_high_amount_different_city',
                    'description': self.fraud_rules['very_high_amount_different_city']['description'],
                    'risk_score': risk_score,
                    'triggered': True
                })
                max_risk_score = max(max_risk_score, risk_score)
                num_rules_triggered += 1
            
            # Rule 3: High amount + different device
            if (transaction['amount'] >= self.fraud_rules['high_amount_different_device']['amount_threshold'] and
                transaction['device_type'] not in stats['common_devices']):
                risk_score = self.fraud_rules['high_amount_different_device']['risk_score']
                rule_results.append({
                    'rule': 'high_amount_different_device',
                    'description': self.fraud_rules['high_amount_different_device']['description'],
                    'risk_score': risk_score,
                    'triggered': True
                })
                max_risk_score = max(max_risk_score, risk_score)
                num_rules_triggered += 1
            
            # Rule 4: Unusual time pattern (less aggressive)
            if transaction['hour'] not in stats['common_hours']:
                risk_score = 0.4  # Less aggressive
                rule_results.append({
                    'rule': 'unusual_time_pattern',
                    'description': self.fraud_rules['unusual_time_pattern']['description'],
                    'risk_score': risk_score,
                    'triggered': True
                })
                max_risk_score = max(max_risk_score, risk_score)
                num_rules_triggered += 1
            
            # Rule 5: Amount spike (less aggressive)
            if transaction['amount'] > stats['avg_amount'] * self.fraud_rules['amount_spike']['multiplier']:
                risk_score = 0.4  # Less aggressive
                rule_results.append({
                    'rule': 'amount_spike',
                    'description': self.fraud_rules['amount_spike']['description'],
                    'risk_score': risk_score,
                    'triggered': True
                })
                max_risk_score = max(max_risk_score, risk_score)
                num_rules_triggered += 1
            
            # Determine risk level and action (require 2+ rules or very high risk for block)
            block_transaction = False
            if max_risk_score >= FRAUD_THRESHOLDS['block_threshold']:
                if num_rules_triggered >= 2 or max_risk_score >= 0.9:
                    block_transaction = True
            
            if max_risk_score == 0:
                risk_level = 'LOW'
            elif max_risk_score >= FRAUD_THRESHOLDS['block_threshold']:
                risk_level = 'HIGH'
            elif max_risk_score >= FRAUD_THRESHOLDS['high_risk']:
                risk_level = 'HIGH'
            else:
                risk_level = 'MEDIUM'
            
            return {
                'risk_score': max_risk_score,
                'risk_level': risk_level,
                'requires_verification': max_risk_score > FRAUD_THRESHOLDS['low_risk'],
                'block_transaction': block_transaction,
                'rule_analysis': rule_results,
                'user_stats': {
                    'avg_amount': stats['avg_amount'],
                    'max_amount': stats['max_amount'],
                    'common_hours': stats['common_hours'],
                    'common_cities': stats['common_cities'],
                    'common_devices': stats['common_devices']
                }
            }
        except Exception as e:
            return {
                'error': f'Rule-based detection failed: {str(e)}',
                'risk_score': 0.1,
                'risk_level': 'LOW',
                'requires_verification': False,
                'block_transaction': False
            }

    def get_detection_stats(self):
        """Get detection statistics"""
        total_transactions = sum(len(history) for history in self.user_histories.values())
        return {
            'total_users': len(self.user_histories),
            'total_transactions': total_transactions,
            'detector_type': 'rule_based'
        } 