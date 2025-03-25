import React, { useState, useEffect } from 'react';
import { getUserConversations, getFirestoreConnectionState } from '../services/firebase';
import '../styles/ConversationHistory.css';

const ConversationHistory = ({ userId, onClose }) => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dataSource, setDataSource] = useState('cloud');
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  
  useEffect(() => {
    let isMounted = true;
    const MAX_RETRIES = 2;
    
    const fetchConversations = async () => {
      if (!userId) {
        if (isMounted) setLoading(false);
        return;
      }
      
      try {
        if (isMounted) setLoading(true);
        
        // Get connection state to check if we should even try Firestore
        const connectionState = getFirestoreConnectionState();
        if (connectionState.errorCount > 2 || !connectionState.isOnline) {
          console.warn('Skipping Firestore due to known connection issues, using local data');
          setDataSource('local');
          const localData = await getUserConversations(userId);
          if (isMounted) {
            setConversations(localData);
            setLoading(false);
          }
          return;
        }
        
        // Proceed with fetching conversations
        const userConversations = await getUserConversations(userId);
        
        if (!isMounted) return;
        
        // Check data source
        if (userConversations.length > 0 && userConversations[0].id.startsWith('local_')) {
          setDataSource('local');
        } else {
          setDataSource('cloud');
        }
        
        setConversations(userConversations);
        setError(null); // Clear any previous errors on success
      } catch (error) {
        console.error('Error fetching conversations:', error);
        
        if (!isMounted) return;
        
        // Handle retries
        if (retryCount < MAX_RETRIES) {
          console.log(`Retrying fetch (${retryCount + 1}/${MAX_RETRIES})...`);
          setRetryCount(prev => prev + 1);
          // Let the effect run again with increased retry count
          return;
        }
        
        setError('Failed to load conversation history. Please try again later.');
        setDataSource('error');
        
        // Always try to get local data as fallback on error
        try {
          const localData = await getUserConversations(userId);
          if (isMounted && localData.length > 0) {
            setConversations(localData);
            setDataSource('local');
            setError('Using local data due to connection issues.');
          }
        } catch (localError) {
          console.error('Error getting local fallback data:', localError);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    
    fetchConversations();
    
    return () => {
      isMounted = false;
    };
  }, [userId, retryCount]);
  
  const handleRetry = () => {
    setRetryCount(0); // Reset retry count to trigger a fresh fetch
    setError(null);
  };
  
  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown date';
    
    // Handle both Firestore Timestamp objects and regular Date objects
    let date;
    if (typeof timestamp === 'string') {
      date = new Date(timestamp);
    } else if (timestamp.toDate) {
      date = timestamp.toDate();
    } else {
      date = new Date(timestamp);
    }
    
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };
  
  const handleConversationClick = (conversation) => {
    setSelectedConversation(
      selectedConversation?.id === conversation.id ? null : conversation
    );
  };
  
  // Format emotion data for display
  const renderEmotionData = (conversation) => {
    if (!conversation.emotionData || Object.keys(conversation.emotionData).length === 0) {
      return null;
    }
    
    const { allEmotions, primaryEmotion, primaryEmotionScore } = conversation.emotionData;
    
    // If we have detailed emotion data with scores
    if (allEmotions) {
      return (
        <div className="emotion-data">
          <h4>Emotion Analysis:</h4>
          <div className="emotion-bars">
            {Object.entries(allEmotions)
              .sort((a, b) => b[1] - a[1]) // Sort by highest score
              .map(([emotion, score]) => (
                <div key={emotion} className="emotion-bar-container">
                  <span className="emotion-label">{emotion}</span>
                  <div className="emotion-bar-wrapper">
                    <div 
                      className={`emotion-bar ${emotion === primaryEmotion ? 'primary' : ''}`}
                      style={{ width: `${score * 100}%` }}
                    ></div>
                    <span className="emotion-score">{(score * 100).toFixed(0)}%</span>
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      );
    }
    
    // Fallback for simple emotion data
    return (
      <div className="emotion-data">
        <p>Primary emotion: {primaryEmotion} ({(primaryEmotionScore * 100).toFixed(0)}%)</p>
      </div>
    );
  };
  
  return (
    <div className="history-overlay">
      <div className="history-modal card">
        <button className="close-button" onClick={onClose}>×</button>
        
        <h2>Conversation History</h2>
        
        {dataSource === 'local' && (
          <div className="data-source-indicator">
            <p>Using locally stored conversations (offline mode)</p>
          </div>
        )}
        
        {loading ? (
          <div className="loading-container">
            <p>Loading your conversations...</p>
            <div className="loading-spinner"></div>
          </div>
        ) : error ? (
          <div className="error-message">
            <p>{error}</p>
            <button className="retry-button" onClick={handleRetry}>
              Retry
            </button>
          </div>
        ) : conversations.length === 0 ? (
          <div className="empty-state">
            <p>You don't have any conversations yet. Start talking to the assistant to see your history here.</p>
          </div>
        ) : (
          <div className="conversations-list">
            {conversations.map((convo) => (
              <div 
                key={convo.id} 
                className={`conversation-item card ${selectedConversation?.id === convo.id ? 'expanded' : ''}`}
                onClick={() => handleConversationClick(convo)}
              >
                <div className="conversation-header">
                  <span className="conversation-date">{formatDate(convo.timestamp)}</span>
                  <span className={`mood-badge ${convo.mood}`}>{convo.mood}</span>
                </div>
                
                <div className="conversation-content">
                  <div className="user-message">
                    <h4>You said:</h4>
                    <p>{convo.transcript}</p>
                  </div>
                  
                  <div className="ai-message">
                    <h4>AI responded:</h4>
                    <p>{convo.aiResponse}</p>
                  </div>
                  
                  {selectedConversation?.id === convo.id && renderEmotionData(convo)}
                </div>
              </div>
            ))}
          </div>
        )}
        
        <div className="privacy-note">
          <p>All conversations are encrypted and stored securely. Only you can access your conversation history.</p>
        </div>
      </div>
    </div>
  );
};

export default ConversationHistory; 