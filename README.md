# Team Artificial Diligence - Amazon HackOn (Season 5)

###  Smart Payment Optimization


## The Problem 

In today's e-commerce landscape, valuable card-specific discounts often go unused simply because customers don't own the right credit or debit card. This creates a frustrating experience for shoppers and results in significant lost revenue for businesses—nearly 40% of potential sales are abandoned at checkout due to payment friction.

The current ecosystem lacks a mechanism for collaboration between:
- *Shoppers* who want to avail card-specific discounts to maximize savings.
- *Cardholders* who have access to these discounts but may not be actively shopping.

## Our Solution

We've built a *peer-to-peer discount sharing platform* that connects shoppers with cardholders in real-time, enabling both parties to benefit from card-specific discounts.

![image alt](https://github.com/singhchanmeet/TeamArtificialDiligence_AmazonHackOn/blob/d58c9d77f6436893f26400c464f9c5b081887f20/images/13.jpeg) 

- The system introduces a new program where existing users can sign up to become "Cardholders." This allows them to monetize their card benefits by earning a 10% commission on transactions made by other shoppers who use their shared discounts.

![image alt](https://github.com/singhchanmeet/TeamArtificialDiligence_AmazonHackOn/blob/d58c9d77f6436893f26400c464f9c5b081887f20/images/12.jpeg)

- During the checkout process, the AI-powered "Smart Card Matching" system is triggered. The shopper is given the choice to either instantly find and connect with a cardholder who is currently online for immediate payment or to submit their request to all active cardholders for more flexible, deferred processing.

![image alt](https://github.com/singhchanmeet/TeamArtificialDiligence_AmazonHackOn/blob/d58c9d77f6436893f26400c464f9c5b081887f20/images/11.jpeg)

- After choosing to find a card now, the system's machine learning model evaluates and ranks all available online cardholders in real-time. It presents the shopper with a sorted list, showing the bank, the discount percentage, the exact amount saved, and a trust score, allowing them to select the best option.

![image alt](https://github.com/singhchanmeet/TeamArtificialDiligence_AmazonHackOn/blob/d58c9d77f6436893f26400c464f9c5b081887f20/images/14.jpeg)

- Once a card is selected, the system presents a final confirmation screen for the payment request. It provides a transparent breakdown of the total savings by subtracting a service fee from the card discount and explains the payment flow: the shopper pays the full amount now and receives the savings back after the cardholder completes the purchase.

![image alt](https://github.com/singhchanmeet/TeamArtificialDiligence_AmazonHackOn/blob/d58c9d77f6436893f26400c464f9c5b081887f20/images/16.jpeg)

- The system sends the live payment request to the selected cardholder's dashboard, showing their potential commission. At the same time, the AI Trust Analysis engine provides a real-time fraud assessment, including a trust score and risk factors, empowering the cardholder to securely accept and pay or decline the transaction.

![image alt](https://github.com/singhchanmeet/TeamArtificialDiligence_AmazonHackOn/blob/d58c9d77f6436893f26400c464f9c5b081887f20/images/9.jpeg)

- Once the cardholder approves the request and completes the payment, the system confirms the successful order to the shopper. This final screen verifies that the card discount has been applied, specifies the total amount saved, and includes a prompt for the shopper to rate the cardholder's service.

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
  
```
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
   Add your MongoDB URI, Google OAuth credentials, and other required variables
   

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
```
   

This project was developed as part of Amazon HackOn Season 5, demonstrating the potential of AI-powered peer-to-peer payment solutions in modern e-commerce.
