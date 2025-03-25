import { useState, useRef } from 'react';
import { generateResponse, textToSpeech } from '../services/openai';

/**
 * Custom hook for handling OpenAI conversation with integrated therapeutic approach
 * @returns {Object} Conversation state and handlers
 */
const useOpenAIConversation = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiResponse, setAiResponse] = useState('');
  const [audioUrl, setAudioUrl] = useState(null);
  const [error, setError] = useState(null);
  const [conversationHistory, setConversationHistory] = useState([]);
  
  /**
   * Process user input and generate AI response with therapeutic approach
   * @param {string} userInput - The user's input text
   * @param {Object} emotionData - The detected emotions from facial analysis
   * @returns {Promise<{text: string, audioUrl: string}>} The AI response and audio URL
   */
  const processInput = async (userInput, emotionData = {}) => {
    if (!userInput.trim()) {
      return null;
    }
    
    try {
      setError(null);
      setIsProcessing(true);
      
      // Extract simple mood string for backward compatibility
      const mood = emotionData?.dominant || 'neutral';
      
      // Generate AI response based on user input, emotion data, and conversation history
      const response = await generateResponse(userInput, mood, emotionData, conversationHistory);
      setAiResponse(response);
      
      // Convert AI response to speech
      const speechUrl = await textToSpeech(response);
      setAudioUrl(speechUrl);
      
      // Update conversation history
      const newExchange = { 
        user: userInput, 
        assistant: response,
        timestamp: new Date().toISOString(),
        emotionData
      };
      
      setConversationHistory(prev => {
        // Keep only the last 10 exchanges to prevent context length issues
        const updatedHistory = [...prev, newExchange];
        if (updatedHistory.length > 10) {
          return updatedHistory.slice(updatedHistory.length - 10);
        }
        return updatedHistory;
      });
      
      return {
        text: response,
        audioUrl: speechUrl
      };
    } catch (error) {
      console.error('Error processing conversation:', error);
      setError('Failed to generate response. Please try again.');
      return null;
    } finally {
      setIsProcessing(false);
    }
  };
  
  /**
   * Reset the conversation state
   */
  const resetConversation = () => {
    setAiResponse('');
    setAudioUrl(null);
    setError(null);
    setConversationHistory([]);
    
    // Clean up any existing audio URL
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
  };

  /**
   * Get the entire conversation history
   * @returns {Array} The conversation history
   */
  const getConversationHistory = () => {
    return conversationHistory;
  };
  
  return {
    isProcessing,
    aiResponse,
    audioUrl,
    error,
    conversationHistory,
    processInput,
    resetConversation,
    getConversationHistory
  };
};

export default useOpenAIConversation; 