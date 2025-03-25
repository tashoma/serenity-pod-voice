import OpenAI from 'openai';

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
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
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

// Generate emotion insights from detailed emotion data
const generateEmotionInsights = (emotionData) => {
  if (!emotionData || !emotionData.allEmotions) {
    return 'neutral';
  }
  
  // Get primary and secondary emotions
  const sortedEmotions = Object.entries(emotionData.allEmotions)
    .sort((a, b) => b[1] - a[1]);
  
  const primaryEmotion = sortedEmotions[0][0];
  const primaryScore = sortedEmotions[0][1];
  const secondaryEmotion = sortedEmotions[1][0];
  const secondaryScore = sortedEmotions[1][1];
  
  // Check for mixed emotions
  const isAmbivalent = primaryScore < 0.5 || (secondaryScore > 0.3 && secondaryEmotion !== 'neutral');
  
  // Format insight based on emotion patterns
  if (isAmbivalent) {
    return `mixed ${primaryEmotion} and ${secondaryEmotion}`;
  } else if (primaryScore > 0.7) {
    return `strong ${primaryEmotion}`;
  } else {
    return primaryEmotion;
  }
};

// Function to generate AI response using GPT
export const generateResponse = async (userMessage, userMood, emotionData = {}) => {
  try {
    // Get deeper emotion insights if available
    const emotionInsight = generateEmotionInsights(emotionData);
    
    // Create system prompt with mood context and emotional insights
    const systemPrompt = 
      `You are a compassionate AI therapy assistant named SerenityPod. The user's current detected mood is ${userMood || 'neutral'}${
        emotionInsight !== userMood ? ` with ${emotionInsight} undertones` : ''
      }. 
      
      Respond with empathy and understanding to help them process their emotions. 
      Keep responses concise (2-3 sentences) and conversational.
      
      Based on their emotional state, adjust your tone:
      - For happiness/joy: Be validating and encouraging
      - For sadness: Be supportive and gentle
      - For anger: Be calming and acknowledging
      - For anxiety/fear: Be reassuring and grounding
      - For neutral: Be attentive and balanced
      
      Do not diagnose or provide medical advice, but focus on emotional support, mindfulness, and in-the-moment emotional processing.`;
    
    // Call OpenAI with retry logic
    const response = await callOpenAIWithRetry(
      async () => await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        max_tokens: 150,
        temperature: 0.7
      })
    );
    
    return response.choices[0].message.content;
  } catch (error) {
    console.error('Error generating response:', error);
    throw error;
  }
};

// Function to convert text response to speech using OpenAI TTS
export const textToSpeech = async (text) => {
  try {
    // Choose voice based on text content and tone
    let voice = 'alloy'; // Default neutral voice
    
    if (text.includes('?')) {
      voice = 'nova'; // More questioning, curious tone
    } else if (text.toLowerCase().includes('sorry') || 
               text.toLowerCase().includes('understand') ||
               text.toLowerCase().includes('feel')) {
      voice = 'shimmer'; // More empathetic tone
    } else if (text.toLowerCase().includes('try') || 
               text.toLowerCase().includes('can') ||
               text.toLowerCase().includes('would')) {
      voice = 'echo'; // More supportive, coaching tone
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