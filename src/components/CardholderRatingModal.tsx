import React, { useState } from 'react';
import { FaStar, FaTimes, FaCreditCard, FaUser, FaCheckCircle } from 'react-icons/fa';
import FormattedPrice from './FormattedPrice';

interface CardholderRatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  cardholderName: string;
  cardDetails: {
    bankName: string;
    cardType: string;
    lastFourDigits: string;
  };
  orderAmount: number;
  discountAmount: number;
  onRatingSubmitted: () => void;
}

interface RatingData {
  discountQuality: number;
  responseTime: number;
  communication: number;
  overallExperience: number;
}

const CardholderRatingModal: React.FC<CardholderRatingModalProps> = ({
  isOpen,
  onClose,
  orderId,
  cardholderName,
  cardDetails,
  orderAmount,
  discountAmount,
  onRatingSubmitted
}) => {
  const [ratings, setRatings] = useState<RatingData>({
    discountQuality: 0,
    responseTime: 0,
    communication: 0,
    overallExperience: 0
  });
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const ratingCategories = [
    {
      key: 'discountQuality' as keyof RatingData,
      label: 'Discount Quality',
      description: 'How good was the discount offered?'
    },
    {
      key: 'responseTime' as keyof RatingData,
      label: 'Response Time',
      description: 'How quickly did the cardholder respond?'
    },
    {
      key: 'communication' as keyof RatingData,
      label: 'Communication',
      description: 'How clear and helpful was the communication?'
    },
    {
      key: 'overallExperience' as keyof RatingData,
      label: 'Overall Experience',
      description: 'How would you rate your overall experience?'
    }
  ];

  const handleRatingChange = (category: keyof RatingData, value: number) => {
    setRatings(prev => ({
      ...prev,
      [category]: value
    }));
  };

  const renderStars = (category: keyof RatingData, currentRating: number) => {
    return (
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => handleRatingChange(category, star)}
            className={`text-2xl transition-colors ${
              star <= currentRating
                ? 'text-yellow-400 hover:text-yellow-500'
                : 'text-gray-300 hover:text-gray-400'
            }`}
          >
            <FaStar />
          </button>
        ))}
      </div>
    );
  };

  const getRatingText = (rating: number) => {
    if (rating === 0) return 'Not rated';
    if (rating <= 1) return 'Poor';
    if (rating <= 2) return 'Fair';
    if (rating <= 3) return 'Good';
    if (rating <= 4) return 'Very Good';
    return 'Excellent';
  };

  const isFormValid = () => {
    return Object.values(ratings).every(rating => rating > 0);
  };

  const handleSubmit = async () => {
    if (!isFormValid()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/rating/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId,
          ratings,
          comment
        }),
      });

      if (response.ok) {
        setSubmitted(true);
        onRatingSubmitted();
        // Auto close after 2 seconds
        setTimeout(() => {
          onClose();
          setSubmitted(false);
          setRatings({
            discountQuality: 0,
            responseTime: 0,
            communication: 0,
            overallExperience: 0
          });
          setComment('');
        }, 2000);
      } else {
        const error = await response.json();
        alert(`Error: ${error.message}`);
      }
    } catch (error) {
      console.error('Error submitting rating:', error);
      alert('Error submitting rating. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {submitted ? (
          <div className="p-8 text-center">
            <div className="flex items-center justify-center mb-4">
              <FaCheckCircle className="text-6xl text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h2>
            <p className="text-gray-600 mb-4">
              Your rating has been submitted successfully.
            </p>
            <p className="text-sm text-gray-500">
              Your feedback helps us improve our cardholder matching system.
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <FaCreditCard className="text-2xl text-amazon_blue" />
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Rate Your Experience</h2>
                    <p className="text-sm text-gray-600">Help us improve by rating your cardholder</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FaTimes className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Cardholder Info */}
            <div className="p-6 border-b bg-gray-50">
              <div className="flex items-center space-x-3 mb-3">
                <FaUser className="text-lg text-gray-600" />
                <div>
                  <h3 className="font-semibold text-gray-900">{cardholderName}</h3>
                  <p className="text-sm text-gray-600">
                    {cardDetails.bankName} • {cardDetails.cardType} • •••• {cardDetails.lastFourDigits}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Order Amount:</span>
                <span className="font-semibold"><FormattedPrice amount={orderAmount} /></span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Discount Received:</span>
                <span className="font-semibold text-green-600"><FormattedPrice amount={discountAmount} /></span>
              </div>
            </div>

            {/* Rating Form */}
            <div className="p-6">
              <div className="space-y-6">
                {ratingCategories.map((category) => (
                  <div key={category.key} className="border-b pb-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-medium text-gray-900">{category.label}</h4>
                        <p className="text-sm text-gray-600">{category.description}</p>
                      </div>
                      <span className="text-sm font-medium text-gray-500">
                        {getRatingText(ratings[category.key])}
                      </span>
                    </div>
                    {renderStars(category.key, ratings[category.key])}
                  </div>
                ))}

                {/* Comment Section */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Additional Comments (Optional)
                  </label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Share your experience with this cardholder..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amazon_blue focus:border-transparent resize-none"
                    rows={3}
                    maxLength={500}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {comment.length}/500 characters
                  </p>
                </div>

                {/* Average Rating Display */}
                <div className="bg-blue-50 p-4 rounded-md">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Average Rating:</span>
                    <div className="flex items-center space-x-2">
                      <div className="flex space-x-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <FaStar
                            key={star}
                            className={`text-lg ${
                              star <= (Object.values(ratings).reduce((a, b) => a + b, 0) / 4)
                                ? 'text-yellow-400'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-sm font-semibold text-gray-900">
                        {Object.values(ratings).every(r => r > 0) 
                          ? (Object.values(ratings).reduce((a, b) => a + b, 0) / 4).toFixed(1)
                          : '0.0'
                        }
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="mt-6 flex items-center justify-end space-x-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Skip
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!isFormValid() || isSubmitting}
                  className={`px-6 py-2 rounded-md font-medium transition-colors ${
                    isFormValid() && !isSubmitting
                      ? 'bg-amazon_blue text-white hover:bg-amazon_yellow hover:text-black'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Rating'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CardholderRatingModal; 