import { useState } from 'react';
import { generateResponse, textToSpeech } from '../services/openai';

/**
 * Custom hook for handling OpenAI conversation
 * @returns {Object} Conversation state and handlers
 */
const useOpenAIConversation = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiResponse, setAiResponse] = useState('');
  const [audioUrl, setAudioUrl] = useState(null);
  const [error, setError] = useState(null);
  
  /**
   * Process user input and generate AI response
   * @param {string} userInput - The user's input text
   * @param {string} mood - The detected mood of the user
   * @returns {Promise<{text: string, audioUrl: string}>} The AI response and audio URL
   */
  const processInput = async (userInput, mood = 'neutral') => {
    if (!userInput.trim()) {
      return null;
    }
    
    try {
      setError(null);
      setIsProcessing(true);
      
      // Generate AI response based on user input and mood
      const response = await generateResponse(userInput, mood);
      setAiResponse(response);
      
      // Convert AI response to speech
      const speechUrl = await textToSpeech(response);
      setAudioUrl(speechUrl);
      
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
    
    // Clean up any existing audio URL
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
  };
  
  return {
    isProcessing,
    aiResponse,
    audioUrl,
    error,
    processInput,
    resetConversation
  };
};

export default useOpenAIConversation; 