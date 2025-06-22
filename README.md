# Team Artificial Diligence - Amazon HackOn (Season 5)

###  Smart Payment Optimization


## The Problem 

In today's e-commerce landscape, valuable card-specific discounts often go unused simply because customers don't own the right credit or debit card. This creates a frustrating experience for shoppers and results in significant lost revenue for businesses—nearly 40% of potential sales are abandoned at checkout due to payment friction.

The current ecosystem lacks a mechanism for collaboration between:
- *Shoppers* who want to avail card-specific discounts to maximize savings.
- *Cardholders* who have access to these discounts but may not be actively shopping.

## Our Solution

We've built a *peer-to-peer discount sharing platform* that connects shoppers with cardholders in real-time, enabling both parties to benefit from card-specific discounts.

### How It Works

1. *Smart Matching*: Our AI-powered system matches shoppers with the most suitable cardholder based on product categories, availability, and discount percentages.
2. *Seamless Transaction*: The cardholder's card is used for the purchase, and the shopper receives the discount instantly.
3. *Automatic Commission*: The platform automatically calculates and distributes commissions—90% to the cardholder and 10% to the platform.
4. *Secure Processing*: Every transaction is protected by our advanced fraud detection system.

## Core Features

Our platform is packed with features designed to create a seamless and secure ecosystem for sharing discounts.

| Feature                          | Description                                                                                                                                                             |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| *Smart Card Matching*          | An intelligent algorithm connects users with the best available card in real-time by analyzing product categories, user availability, and ranking for the highest discount.   |
| *Peer-to-Peer Transactions*    | A fully automated workflow handles the entire transaction, from matching and payment requests to secure order processing, creating a seamless experience.                     |
| *Automated Commission System*  | Transparent reward distribution where cardholders receive 90% of the discount amount as commission, while the platform retains 10% for operational costs.                   |
| *Real-time Fraud Detection*    | Advanced ML-powered fraud detection system that analyzes 18+ features to identify and block suspicious transactions in real-time.                                          |
| *Cardholder Feedback System*   | Users can rate cardholders on multiple criteria including discount quality, response time, and overall experience after each transaction.                                   |
| *Comprehensive Admin Dashboard*| Powerful analytics dashboard for platform administrators to monitor transactions, user activity, and system performance.                                                   |



### The AI Engine

Our platform's intelligence is powered by two distinct machine learning models:

| Model                        | Purpose                                                                                                                                                              | Tech Stack                                                                    |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| *GBS Fraud Detection*      | A real-time system that analyzes over 18 transactional and behavioral features to assign a risk score, blocking suspicious payments before they are processed.         | Python, Scikit-learn, Pandas, Flask                                   |
| *Cardholder Ranking Model* | A sophisticated model that ranks cardholders based on their historical performance, reliability, and user feedback to ensure shoppers are matched with the best peers. | Python, XGBoost, LightGBM, Scikit-learn, Pandas, NumPy, FastAPI, Uvicorn, Matplotlib, Seaborn, Jupyter |

These models work in tandem to ensure a secure and efficient marketplace.

## System Architecture & Technology Stack

### Frontend
- *Framework*: Next.js 15.3.3 with TypeScript
- *Styling*: Tailwind CSS with custom Amazon-themed design system
- *State Management*: Redux Toolkit with Redux Persist
- *Authentication*: NextAuth.js with Google OAuth
- *UI Components*: Custom React components with responsive design

### Backend
- *Runtime*: Node.js with TypeScript
- *Database*: MongoDB with Mongoose ODM
- *API*: Next.js API routes with RESTful architecture
- *Authentication*: JWT tokens with NextAuth.js
- *Real-time Features*: WebSocket connections for live updates

### Machine Learning
- *Fraud Detection*: Python-based hybrid ML model with Scikit-learn
- *Cardholder Ranking*: XGBoost and LightGBM models with FastAPI
- *Feature Engineering*: Advanced preprocessing with Pandas and NumPy
- *Model Serving*: Flask and FastAPI for real-time inference

### DevOps & Deployment
- *Platform*: Vercel for frontend and API deployment
- *Database*: MongoDB Atlas for cloud database
- *Version Control*: Git with GitHub
- *Environment*: Production-ready with environment variables

## Project Structure

```
TeamArtificialDiligence_AmazonHackOn/
├── card_ranking_model/
│   ├── api/
│   │   ├── ranking_api.py
│   │   └── test_api.py
│   ├── data/
│   ├── models/
│   │   ├── feature_engineering.py
│   │   ├── model_trainer.py
│   │   └── rank_cardholders.py
│   ├── requirements.txt
│   └── test_final_system.py
├── gbs_ml_model/
│   ├── data/
│   ├── models/
│   ├── src/
│   │   ├── ml_fraud_detector.py
│   │   ├── rule_based_detector.py
│   │   └── true_hybrid_detector.py
│   ├── requirements.txt
│   └── server.py
├── public/
├── src/
│   ├── components/
│   │   ├── Admin/
│   │   ├── Cardholder/
│   │   └── User/
│   ├── lib/
│   │   └── mongodb.ts
│   ├── models/
│   │   ├── Cardholder.ts
│   │   ├── Order.ts
│   │   └── Rating.ts
│   ├── pages/
│   │   ├── api/
│   │   │   ├── admin/
│   │   │   ├── auth/
│   │   │   ├── cardholder/
│   │   │   ├── payment-request/
│   │   │   └── rating/
│   │   ├── admin/
│   │   ├── auth/
│   │   └── product/
│   ├── store/
│   │   └── nextSlice.ts
│   └── styles/
├── next.config.mjs
├── package.json
├── README.md
└── tailwind.config.ts
```

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- Python 3.8+ and pip
- MongoDB database (local or Atlas)
- Google OAuth credentials

### Installation

1. *Clone the repository*
   bash
   git clone <repository-url>
   cd TeamArtificialDiligence_AmazonHackOn
   

2. *Install frontend dependencies*
   bash
   npm install
   

3. *Install ML model dependencies*
   bash
   cd card_ranking_model
   pip install -r requirements.txt
   cd ../gbs_ml_model
   pip install -r requirements.txt
   

4. *Set up environment variables*
   bash
   cp .env.example .env.local
   # Add your MongoDB URI, Google OAuth credentials, and other required variables
   

5. *Start the development server*
   bash
   npm run dev
   

### Running the ML Models

1. *Start the fraud detection API*
   bash
   cd gbs_ml_model
   python server.py
   

2. *Start the cardholder ranking API*
   bash
   cd card_ranking_model
   python -m uvicorn api.ranking_api:app --reload
   

## Key Features

### 1. Smart Card Matching Algorithm
Our platform features a smart algorithm that connects users with the most suitable cardholder in real-time. It analyzes the user's cart and transaction details to filter and rank available cards, ensuring an optimal match that maximizes discount potential for the shopper.

### 2. Seamless Peer-to-Peer Transactions
Once a match is found, our system facilitates a secure, automated transaction. The user gets their discount instantly, and the cardholder's card is used for the payment, all within a seamless checkout experience.

### 3. Automated & Transparent Commissions
We've built a transparent reward distribution system where cardholders receive 90% of the discount amount as commission, while the platform retains 10% for operational costs. This creates a win-win scenario for all parties involved.

### 4. Advanced Fraud Detection System
Our platform is protected by a sophisticated fraud detection system that combines machine learning with rule-based logic. It analyzes over 18 features including transaction amount, time-of-day, user history, and device type to detect anomalies with high accuracy.

### 5. Comprehensive Admin Dashboard
The platform includes a powerful admin dashboard built with Next.js and Recharts. It allows platform administrators to:
- Monitor real-time transaction activity
- View detailed analytics and performance metrics
- Manage cardholder registrations and verifications
- Track commission distributions and platform revenue
- Generate comprehensive reports for business insights

## Contributing

We welcome contributions from the community! Please read our contributing guidelines and submit pull requests for any improvements or bug fixes.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Team

*Team Artificial Diligence*
- Building innovative solutions for the future of e-commerce
- Amazon HackOn Season 5 Participants

---

This project was developed as part of Amazon HackOn Season 5, demonstrating the potential of AI-powered peer-to-peer payment solutions in modern e-commerce.
