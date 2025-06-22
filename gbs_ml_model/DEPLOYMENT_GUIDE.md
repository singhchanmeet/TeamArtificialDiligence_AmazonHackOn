# Real-time Fraud Detection Deployment Guide

This guide explains how to deploy and use the GBS Fraud Detection system in production environments.

## 🚀 Deployment Options

### Option 1: Direct Python Integration

**Best for:** Applications written in Python, microservices, batch processing

```python
from real_time_inference import RealTimeFraudDetector

# Initialize detector
detector = RealTimeFraudDetector()

# Process a transaction
transaction = {
    'amount': 1500.0,
    'timestamp': '2024-01-15 14:30:00',
    'merchant_category': 'Electronics',
    'city': 'Mumbai',
    'device_type': 'Mobile',
    'payment_method': 'Credit Card',
    'hour': 14,
    'day_of_week': 0,
    'daily_frequency': 2.0
}

result = detector.process_transaction("user_123", transaction)
print(f"Risk Level: {result['risk_level']}")
print(f"Action: {'BLOCK' if result['block_transaction'] else 'ALLOW'}")
```

### Option 2: REST API Server

**Best for:** Multi-language applications, web services, microservices architecture

#### Start the API Server:
```bash
# Install dependencies
pip install flask flask-cors requests

# Start the server
python api_server.py
```

#### Use the API:
```bash
# Test API health
curl http://localhost:5000/health

# Detect fraud
curl -X POST http://localhost:5000/detect_fraud \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user_123",
    "transaction": {
      "amount": 1500.0,
      "timestamp": "2024-01-15 14:30:00",
      "merchant_category": "Electronics",
      "city": "Mumbai",
      "device_type": "Mobile",
      "payment_method": "Credit Card",
      "hour": 14,
      "day_of_week": 0,
      "daily_frequency": 2.0
    }
  }'
```

#### Python Client Example:
```python
import requests

response = requests.post('http://localhost:5000/detect_fraud', json={
    'user_id': 'user_123',
    'transaction': transaction_data
})

result = response.json()
print(f"Risk Score: {result['risk_score']}")
```

### Option 3: Docker Deployment

**Best for:** Containerized environments, cloud deployment, scalability

#### Create Dockerfile:
```dockerfile
FROM python:3.8-slim

WORKDIR /app

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install -r requirements.txt

# Copy application files
COPY . .

# Expose port
EXPOSE 5000

# Start the API server
CMD ["python", "api_server.py"]
```

#### Build and Run:
```bash
# Build image
docker build -t fraud-detection-api .

# Run container
docker run -p 5000:5000 fraud-detection-api
```

### Option 4: Database Integration

**Best for:** Production environments with persistent storage

#### PostgreSQL Integration:
```python
import psycopg2
from real_time_inference import RealTimeFraudDetector

class DatabaseFraudDetector(RealTimeFraudDetector):
    def __init__(self, db_connection_string):
        super().__init__()
        self.db_conn = psycopg2.connect(db_connection_string)
    
    def get_user_history(self, user_id):
        """Get user history from database"""
        cursor = self.db_conn.cursor()
        cursor.execute("""
            SELECT amount, hour, day_of_week, merchant_category, 
                   city, device_type, payment_method, daily_frequency
            FROM transactions 
            WHERE user_id = %s 
            ORDER BY timestamp DESC 
            LIMIT 50
        """, (user_id,))
        return cursor.fetchall()
    
    def save_transaction(self, user_id, transaction, fraud_result):
        """Save transaction and fraud detection result"""
        cursor = self.db_conn.cursor()
        cursor.execute("""
            INSERT INTO transactions (user_id, amount, timestamp, merchant_category,
                                    city, device_type, payment_method, risk_score, 
                                    risk_level, blocked)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (user_id, transaction['amount'], transaction['timestamp'],
              transaction['merchant_category'], transaction['city'],
              transaction['device_type'], transaction['payment_method'],
              fraud_result['risk_score'], fraud_result['risk_level'],
              fraud_result['block_transaction']))
        self.db_conn.commit()
```

## 🔧 Configuration

### Environment Variables
```bash
# Model configuration
MODEL_PATH=/path/to/best_gbs_model.pth
SCALERS_PATH=/path/to/scalers.pkl
CATEGORICAL_MAPPINGS_PATH=/path/to/categorical_mappings.json

# API configuration
API_HOST=0.0.0.0
API_PORT=5000
API_DEBUG=false

# Database configuration
DATABASE_URL=postgresql://user:password@localhost/fraud_detection

# Logging
LOG_LEVEL=INFO
LOG_FILE=/var/log/fraud_detection.log
```

### Production Configuration
```python
# config.py
import os

# Production settings
PRODUCTION_CONFIG = {
    'model_path': os.getenv('MODEL_PATH', 'models/saved_models/best_gbs_model.pth'),
    'api_host': os.getenv('API_HOST', '0.0.0.0'),
    'api_port': int(os.getenv('API_PORT', 5000)),
    'log_level': os.getenv('LOG_LEVEL', 'INFO'),
    'max_history_length': 100,
    'min_history_required': 8,
    'fraud_thresholds': {
        'low_risk': 0.2,
        'high_risk': 0.5
    }
}
```

## 📊 Monitoring and Logging

### Logging Configuration
```python
import logging
from logging.handlers import RotatingFileHandler

def setup_logging():
    logger = logging.getLogger('fraud_detection')
    logger.setLevel(logging.INFO)
    
    # File handler with rotation
    file_handler = RotatingFileHandler(
        '/var/log/fraud_detection.log',
        maxBytes=10*1024*1024,  # 10MB
        backupCount=5
    )
    
    # Console handler
    console_handler = logging.StreamHandler()
    
    # Formatter
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    file_handler.setFormatter(formatter)
    console_handler.setFormatter(formatter)
    
    logger.addHandler(file_handler)
    logger.addHandler(console_handler)
    
    return logger
```

### Metrics Collection
```python
import time
from collections import defaultdict

class FraudDetectionMetrics:
    def __init__(self):
        self.request_count = 0
        self.fraud_detected = 0
        self.response_times = []
        self.user_activity = defaultdict(int)
    
    def record_request(self, user_id, risk_score, response_time, blocked):
        self.request_count += 1
        self.user_activity[user_id] += 1
        self.response_times.append(response_time)
        
        if risk_score > 0.5:
            self.fraud_detected += 1
    
    def get_stats(self):
        return {
            'total_requests': self.request_count,
            'fraud_rate': self.fraud_detected / max(self.request_count, 1),
            'avg_response_time': sum(self.response_times) / len(self.response_times),
            'active_users': len(self.user_activity)
        }
```

## 🔒 Security Considerations

### Input Validation
```python
def validate_transaction(transaction):
    """Validate transaction data"""
    required_fields = ['amount', 'timestamp', 'merchant_category', 'city', 
                      'device_type', 'payment_method']
    
    for field in required_fields:
        if field not in transaction:
            raise ValueError(f"Missing required field: {field}")
    
    # Validate amount
    if not isinstance(transaction['amount'], (int, float)) or transaction['amount'] <= 0:
        raise ValueError("Invalid amount")
    
    # Validate timestamp
    try:
        datetime.fromisoformat(transaction['timestamp'])
    except ValueError:
        raise ValueError("Invalid timestamp format")
    
    return True
```

### Rate Limiting
```python
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

limiter = Limiter(
    app,
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"]
)

@app.route('/detect_fraud', methods=['POST'])
@limiter.limit("10 per minute")
def detect_fraud():
    # Your fraud detection logic here
    pass
```

## 🚀 Performance Optimization

### Model Optimization
```python
# Use GPU if available
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
model = model.to(device)

# Enable model evaluation mode
model.eval()

# Use torch.jit for faster inference
traced_model = torch.jit.trace(model, example_input)
traced_model.save('optimized_model.pt')
```

### Caching
```python
import redis
import pickle

class CachedFraudDetector:
    def __init__(self, redis_url):
        self.redis_client = redis.from_url(redis_url)
        self.fraud_detector = RealTimeFraudDetector()
    
    def detect_fraud(self, user_id, transaction):
        # Create cache key
        cache_key = f"fraud_result:{user_id}:{hash(str(transaction))}"
        
        # Check cache first
        cached_result = self.redis_client.get(cache_key)
        if cached_result:
            return pickle.loads(cached_result)
        
        # Perform fraud detection
        result = self.fraud_detector.detect_fraud(user_id, transaction)
        
        # Cache result for 5 minutes
        self.redis_client.setex(cache_key, 300, pickle.dumps(result))
        
        return result
```

## 📈 Scaling Strategies

### Horizontal Scaling
```python
# Load balancer configuration (nginx)
upstream fraud_detection {
    server 127.0.0.1:5000;
    server 127.0.0.1:5001;
    server 127.0.0.1:5002;
}

server {
    listen 80;
    location / {
        proxy_pass http://fraud_detection;
    }
}
```

### Message Queue Integration
```python
import pika
import json

class QueueFraudDetector:
    def __init__(self, queue_url):
        self.connection = pika.BlockingConnection(
            pika.URLParameters(queue_url)
        )
        self.channel = self.connection.channel()
        self.fraud_detector = RealTimeFraudDetector()
    
    def process_transaction(self, ch, method, properties, body):
        """Process transaction from queue"""
        data = json.loads(body)
        user_id = data['user_id']
        transaction = data['transaction']
        
        # Perform fraud detection
        result = self.fraud_detector.process_transaction(user_id, transaction)
        
        # Send result to result queue
        self.channel.basic_publish(
            exchange='',
            routing_key='fraud_results',
            body=json.dumps(result)
        )
        
        ch.basic_ack(delivery_tag=method.delivery_tag)
    
    def start_consuming(self):
        """Start consuming transactions"""
        self.channel.basic_consume(
            queue='transactions',
            on_message_callback=self.process_transaction
        )
        self.channel.start_consuming()
```

## 🧪 Testing

### Unit Tests
```python
import unittest
from real_time_inference import RealTimeFraudDetector

class TestFraudDetector(unittest.TestCase):
    def setUp(self):
        self.detector = RealTimeFraudDetector()
    
    def test_normal_transaction(self):
        transaction = {
            'amount': 100.0,
            'timestamp': '2024-01-15 10:00:00',
            'merchant_category': 'Grocery',
            'city': 'Mumbai',
            'device_type': 'Mobile',
            'payment_method': 'Credit Card',
            'hour': 10,
            'day_of_week': 0,
            'daily_frequency': 2.0
        }
        
        result = self.detector.detect_fraud('test_user', transaction)
        self.assertIn('risk_score', result)
        self.assertIn('risk_level', result)
```

### Load Testing
```python
import asyncio
import aiohttp
import time

async def load_test():
    async with aiohttp.ClientSession() as session:
        tasks = []
        for i in range(100):
            task = asyncio.create_task(send_request(session, i))
            tasks.append(task)
        
        start_time = time.time()
        results = await asyncio.gather(*tasks)
        end_time = time.time()
        
        print(f"Processed {len(results)} requests in {end_time - start_time:.2f} seconds")

async def send_request(session, user_id):
    transaction = {
        'amount': 100.0 + user_id,
        'timestamp': '2024-01-15 10:00:00',
        'merchant_category': 'Grocery',
        'city': 'Mumbai',
        'device_type': 'Mobile',
        'payment_method': 'Credit Card',
        'hour': 10,
        'day_of_week': 0,
        'daily_frequency': 2.0
    }
    
    async with session.post('http://localhost:5000/detect_fraud', json={
        'user_id': f'user_{user_id}',
        'transaction': transaction
    }) as response:
        return await response.json()
```

## 📋 Deployment Checklist

- [ ] Model trained and validated
- [ ] Dependencies installed
- [ ] Configuration files updated
- [ ] Logging configured
- [ ] Security measures implemented
- [ ] Monitoring setup
- [ ] Load testing completed
- [ ] Backup strategy in place
- [ ] Documentation updated
- [ ] Team trained on usage

## 🆘 Troubleshooting

### Common Issues

1. **Model not found**
   - Ensure model file exists at specified path
   - Check file permissions

2. **Memory issues**
   - Reduce batch size
   - Use model optimization techniques
   - Implement caching

3. **Performance issues**
   - Enable GPU acceleration
   - Use model quantization
   - Implement request queuing

4. **API connection errors**
   - Check server status
   - Verify port configuration
   - Check firewall settings

### Support

For issues and questions:
1. Check the logs: `/var/log/fraud_detection.log`
2. Review configuration files
3. Test with the provided examples
4. Check system resources (CPU, memory, disk) 