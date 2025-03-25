import React, { useState, useEffect } from 'react';
import { getUserConversations } from '../services/firebase';
import '../styles/ConversationHistory.css';

const ConversationHistory = ({ userId, onClose }) => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dataSource, setDataSource] = useState('cloud');
  
  useEffect(() => {
    const fetchConversations = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        const userConversations = await getUserConversations(userId);
        
        // Check if we have local data
        if (userConversations.length > 0 && userConversations[0].id.startsWith('local_')) {
          setDataSource('local');
        } else {
          setDataSource('cloud');
        }
        
        setConversations(userConversations);
      } catch (error) {
        console.error('Error fetching conversations:', error);
        setError('Failed to load conversation history');
        setDataSource('error');
      } finally {
        setLoading(false);
      }
    };
    
    fetchConversations();
  }, [userId]);
  
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
          </div>
        ) : conversations.length === 0 ? (
          <div className="empty-state">
            <p>You don't have any conversations yet. Start talking to the assistant to see your history here.</p>
          </div>
        ) : (
          <div className="conversations-list">
            {conversations.map((convo) => (
              <div key={convo.id} className="conversation-item card">
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