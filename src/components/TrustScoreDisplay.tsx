// components/TrustScoreDisplay.tsx
// Component to display trust scores in the cardholder dashboard

import React, { useState } from 'react';
import { FaShieldAlt, FaExclamationTriangle, FaCheckCircle, FaInfoCircle, FaChevronDown, FaChevronUp } from 'react-icons/fa';

interface TrustScoreDisplayProps {
  trustReport: any;
  isCompact?: boolean;
}

const TrustScoreDisplay: React.FC<TrustScoreDisplayProps> = ({ trustReport, isCompact = false }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!trustReport) {
    return (
      <div className="mt-4 p-3 bg-gray-50 border rounded">
        <div className="flex items-center space-x-2">
          <FaInfoCircle className="text-gray-400" />
          <span className="text-sm text-gray-600">Trust analysis not available</span>
        </div>
      </div>
    );
  }

  // Handle error cases
  if (trustReport.analysis_metadata?.error) {
    return (
      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
        <div className="flex items-center space-x-2">
          <FaExclamationTriangle className="text-yellow-500" />
          <span className="text-sm text-yellow-800">Trust analysis incomplete</span>
        </div>
        <p className="text-xs text-yellow-700 mt-1">
          {trustReport.analysis_metadata.error_message || 'Analysis could not be completed'}
        </p>
      </div>
    );
  }

  const trustScore = trustReport.trust_score || 50;
  const riskLevel = trustReport.risk_assessment?.overall_risk_level || 'unknown';
  const riskFactors = trustReport.risk_assessment?.risk_factors || [];
  const positiveFactors = trustReport.risk_assessment?.positive_factors || [];

  // Get color and icon based on trust score and risk level
  const getTrustScoreColor = () => {
    if (trustScore >= 80) return 'text-green-700 bg-green-100';
    if (trustScore >= 60) return 'text-blue-700 bg-blue-100';
    if (trustScore >= 40) return 'text-yellow-700 bg-yellow-100';
    if (trustScore >= 20) return 'text-orange-700 bg-orange-100';
    return 'text-red-700 bg-red-100';
  };

  const getRiskLevelColor = () => {
    switch (riskLevel) {
      case 'minimal':
      case 'low':
        return 'text-green-700 bg-green-100';
      case 'medium':
        return 'text-yellow-700 bg-yellow-100';
      case 'high':
        return 'text-orange-700 bg-orange-100';
      case 'critical':
        return 'text-red-700 bg-red-100';
      default:
        return 'text-gray-700 bg-gray-100';
    }
  };

  const getTrustIcon = () => {
    if (trustScore >= 70) return <FaCheckCircle className="text-green-500" />;
    if (trustScore >= 40) return <FaShieldAlt className="text-yellow-500" />;
    return <FaExclamationTriangle className="text-red-500" />;
  };

  if (isCompact) {
    return (
      <div className="mt-4 p-3 bg-gray-50 border rounded">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-semibold">AI Trust Analysis</span>
            {getTrustIcon()}
            <span className="font-semibold text-gray-700">Trust Score: {trustScore}/100</span>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full font-semibold ${getRiskLevelColor()}`}>
            {riskLevel.toUpperCase()}
          </span>
        </div>
        
        {riskFactors.length > 0 && (
          <div className="mt-2">
            <p className="text-xs text-gray-600">Key Concerns: {riskFactors.slice(0, 2).join(', ')}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mt-4 p-4 bg-gray-50 border rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-semibold">AI Trust Analysis</span>
          <h4 className="font-semibold text-gray-700">User Trust Report</h4>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-blue-600 hover:text-blue-800 text-sm flex items-center space-x-1"
        >
          <span>{isExpanded ? 'Less' : 'More'}</span>
          {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
        </button>
      </div>

      {/* Trust Score and Risk Level */}
      <div className="grid grid-cols-2 gap-4 mb-3">
        <div className={`p-3 rounded-lg ${getTrustScoreColor()}`}>
          <div className="flex items-center space-x-2">
            {getTrustIcon()}
            <div>
              <p className="text-xs opacity-75">Trust Score</p>
              <p className="text-lg font-bold">{trustScore}/100</p>
            </div>
          </div>
        </div>
        
        <div className={`p-3 rounded-lg ${getRiskLevelColor()}`}>
          <div className="flex items-center space-x-2">
            <FaShieldAlt />
            <div>
              <p className="text-xs opacity-75">Risk Level</p>
              <p className="text-lg font-bold">{riskLevel.toUpperCase()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Risk Factors */}
      {riskFactors.length > 0 && (
        <div className="mb-3">
          <p className="text-sm font-semibold text-red-700 mb-1">⚠️ Risk Factors:</p>
          <ul className="text-xs text-red-600 space-y-1">
            {riskFactors.slice(0, isExpanded ? riskFactors.length : 3).map((factor, index) => (
              <li key={index}>• {factor}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Positive Factors */}
      {positiveFactors.length > 0 && (
        <div className="mb-3">
          <p className="text-sm font-semibold text-green-700 mb-1">✅ Positive Factors:</p>
          <ul className="text-xs text-green-600 space-y-1">
            {positiveFactors.slice(0, isExpanded ? positiveFactors.length : 2).map((factor, index) => (
              <li key={index}>• {factor}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommendations */}
      {trustReport.recommendations && trustReport.recommendations.length > 0 && (
        <div className="mb-3">
          <p className="text-sm font-semibold text-blue-700 mb-1">💡 Recommendation:</p>
          <p className="text-xs text-blue-600">
            {trustReport.recommendations[0].details || trustReport.recommendations[0].reason}
          </p>
        </div>
      )}

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t pt-3 mt-3 space-y-3">
          {/* Analysis Metadata */}
          <div>
            <p className="text-xs font-semibold text-gray-700 mb-1">Analysis Details:</p>
            <div className="text-xs text-gray-600 space-y-1">
              <p>• Transactions analyzed: {trustReport.analysis_metadata?.transactions_analyzed || 0}</p>
              <p>• Time span: {Math.round(trustReport.analysis_metadata?.time_span_days || 0)} days</p>
              <p>• Confidence: {trustReport.risk_assessment?.confidence_level || 'medium'}</p>
            </div>
          </div>

          {/* Behavioral Insights */}
          {trustReport.behavioral_insights && trustReport.behavioral_insights.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-1">Behavioral Insights:</p>
              <div className="space-y-1">
                {trustReport.behavioral_insights.map((insight, index) => (
                  <div key={index} className="text-xs">
                    <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                      insight.level === 'alert' ? 'bg-red-500' :
                      insight.level === 'warning' ? 'bg-yellow-500' :
                      insight.level === 'info' ? 'bg-blue-500' : 'bg-green-500'
                    }`}></span>
                    <span className="text-gray-600">{insight.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Risk Score Breakdown */}
          {trustReport.behavioral_analysis && (
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-2">Risk Score Breakdown:</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {Object.entries(trustReport.behavioral_analysis).map(([category, analysis]) => (
                  <div key={category} className="flex justify-between">
                    <span className="text-gray-600 capitalize">{category}:</span>
                    <span className={`font-semibold ${
                      analysis.risk_score > 70 ? 'text-red-600' :
                      analysis.risk_score > 40 ? 'text-yellow-600' : 'text-green-600'
                    }`}>
                      {Math.round(analysis.risk_score)}/100
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Analysis timestamp */}
      <div className="text-xs text-gray-500 mt-2 pt-2 border-t">
        Analysis generated: {new Date(trustReport.timestamp).toLocaleString()}
      </div>
    </div>
  );
};

export default TrustScoreDisplay;