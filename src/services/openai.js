import OpenAI from 'openai';
import promptService from './openaiPromptService';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.REACT_APP_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // Not recommended for production, use a backend proxy
});

// Safe OpenAI API call with retry
const callOpenAIWithRetry = async (apiFunction, options) => {
  const MAX_RETRIES = 2;
  let retries = 0;
  let lastError = null;
  
  while (retries <= MAX_RETRIES) {
    try {
      return await apiFunction(options);
    } catch (error) {
      lastError = error;
      retries++;
      
      // Only retry for specific errors
      if (error.status === 429 || error.status >= 500 || error.code === 'ECONNRESET') {
        // Exponential backoff: wait 1s, then 2s, then 4s
        const delay = Math.pow(2, retries - 1) * 1000;
        console.log(`OpenAI API error (attempt ${retries}/${MAX_RETRIES}), retrying in ${delay}ms:`, error);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error; // Don't retry other errors
      }
    }
  }
  
  // If we've exhausted retries, throw the last error
  throw lastError;
};

// Function to transcribe audio using OpenAI Whisper
export const transcribeAudio = async (audioBlob) => {
  try {
    if (!audioBlob) {
      console.error('No audio blob provided for transcription');
      throw new Error('No audio blob provided');
    }
    
    console.log(`Transcribing audio blob: size=${audioBlob.size}, type=${audioBlob.type}`);
    
    // If the audio blob is too small, it probably doesn't contain speech
    if (audioBlob.size < 1024) {
      console.warn('Audio blob is very small, may not contain speech');
    }
    
    // Create a form data object to send the audio file
    const formData = new FormData();
    
    // Check if the blob type is supported
    let blobToSend = audioBlob;
    
    // Check for supported file types - Whisper expects mp3, mp4, mpeg, mpga, m4a, wav, or webm
    if (!audioBlob.type.includes('audio/') && !audioBlob.type.includes('video/')) {
      console.warn(`Unsupported blob type: ${audioBlob.type}, attempting to send anyway`);
    }
    
    // Create a file from blob with timestamp to ensure uniqueness
    const filename = `audio_${Date.now()}.webm`;
    const file = new File([blobToSend], filename, { type: blobToSend.type });
    
    formData.append('file', file);
    formData.append('model', 'whisper-1');
    formData.append('language', 'en'); // Specify language for better results
    formData.append('response_format', 'json');
    
    console.log('Sending transcription request to OpenAI...');
    console.log(`API Key prefix: ${process.env.REACT_APP_OPENAI_API_KEY.substring(0, 5)}...`);
    
    // Call the OpenAI API with increased timeout and retry logic
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    try {
      console.time('Transcription API call');
      
      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}`
        },
        body: formData,
        signal: controller.signal
      });
      
      console.timeEnd('Transcription API call');
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Transcription API error (${response.status}):`, errorText);
        throw new Error(`HTTP error! status: ${response.status}, details: ${errorText}`);
      }
      
      const data = await response.json();
      console.log('Transcription successful:', data);
      
      if (!data.text || data.text.trim() === '') {
        console.warn('Transcription returned empty text');
        return 'I could not hear any speech. Please try speaking more clearly or check your microphone.';
      }
      
      return data.text;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        console.error('Transcription request timed out after 30 seconds');
        throw new Error('Transcription request timed out. Please try again.');
      }
      throw error;
    }
  } catch (error) {
    console.error('Error transcribing audio:', error);
    throw error;
  }
};

// Enhanced emotion processing for the integrated therapeutic model
const processEmotionalData = (emotionData) => {
  if (!emotionData || Object.keys(emotionData).length === 0) {
    return { dominant: 'neutral', intensity: 'low' };
  }

  // Extract and process detailed emotion data
  const allEmotions = emotionData.allEmotions || {};
  
  // Sort emotions by score
  const sortedEmotions = Object.entries(allEmotions)
    .sort((a, b) => b[1] - a[1]);
  
  // Get the dominant and secondary emotions
  const dominant = sortedEmotions[0]?.[0] || 'neutral';
  const dominantScore = sortedEmotions[0]?.[1] || 0;
  const secondary = sortedEmotions[1]?.[0] || 'neutral';
  const secondaryScore = sortedEmotions[1]?.[1] || 0;
  
  // Determine emotion intensity
  let intensity = 'moderate';
  if (dominantScore > 0.7) intensity = 'high';
  if (dominantScore < 0.4) intensity = 'low';
  
  // Check for emotional ambivalence (mixed feelings)
  const isAmbivalent = dominantScore < 0.5 || (secondaryScore > 0.3 && secondary !== 'neutral');
  
  return {
    dominant,
    secondary,
    intensity,
    isAmbivalent,
    dominantScore,
    secondaryScore
  };
};

// Function to generate AI response using GPT with enhanced therapeutic approach
export const generateResponse = async (userMessage, userMood, emotionData = {}, conversationHistory = []) => {
  try {
    // Process emotion data into a format useful for the prompt
    const processedEmotions = processEmotionalData(emotionData);
    
    // Use the prompt service to generate optimized chat messages
    const messages = promptService.generateChatCompletionMessages(
      userMessage,
      processedEmotions,
      conversationHistory
    );
    
    // Call OpenAI with retry logic using the enhanced prompt
    const response = await callOpenAIWithRetry(
      async () => await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: messages,
        max_tokens: 250, // Increased for more nuanced therapeutic responses
        temperature: 0.7
      })
    );
    
    return response.choices[0].message.content;
  } catch (error) {
    console.error('Error generating therapeutic response:', error);
    throw error;
  }
};

// Function to convert text response to speech using OpenAI TTS
export const textToSpeech = async (text) => {
  try {
    // Enhanced voice selection based on emotional content
    let voice = 'alloy'; // Default neutral voice
    
    // Analyze text for emotional content to select appropriate voice
    const emotionalKeywords = {
      shimmer: ['compassion', 'understand', 'feel', 'emotion', 'sorry', 'care'],
      nova: ['curious', 'wonder', 'explore', 'question', 'perhaps', 'consider'],
      echo: ['action', 'try', 'can', 'would', 'practice', 'technique', 'exercise'],
      onyx: ['grounding', 'focus', 'attention', 'present', 'notice', 'aware']
    };
    
    // Select voice based on emotional content
    const textLower = text.toLowerCase();
    for (const [voiceType, keywords] of Object.entries(emotionalKeywords)) {
      if (keywords.some(keyword => textLower.includes(keyword))) {
        voice = voiceType;
        break;
      }
    }
    
    // Call OpenAI TTS with retry logic
    const response = await callOpenAIWithRetry(
      async () => await openai.audio.speech.create({
        model: 'tts-1',
        voice: voice,
        input: text
      })
    );
    
    // Convert the response to an audio URL
    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    
    return audioUrl;
  } catch (error) {
    console.error('Error converting text to speech:', error);
    throw error;
  }
};

export default {
  transcribeAudio,
  generateResponse,
  textToSpeech
}; 