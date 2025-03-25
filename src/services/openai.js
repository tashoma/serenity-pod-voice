import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.REACT_APP_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // Not recommended for production, use a backend proxy
});

// Function to transcribe audio using OpenAI Whisper
export const transcribeAudio = async (audioBlob) => {
  try {
    // Create a form data object to send the audio file
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.webm');
    formData.append('model', 'whisper-1');
    
    // Call the OpenAI API directly (not recommended for production, use a backend proxy)
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}`
      },
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data.text;
  } catch (error) {
    console.error('Error transcribing audio:', error);
    throw error;
  }
};

// Function to generate AI response using GPT
export const generateResponse = async (userMessage, userMood) => {
  try {
    // Create system prompt with mood context
    const systemPrompt = 
      `You are a compassionate AI therapy assistant. The user's current detected mood is ${userMood}. 
      Respond with empathy and understanding to help them process their emotions. 
      Keep responses concise (under 3 sentences) and conversational. 
      Do not diagnose or provide medical advice, but focus on emotional support and mindfulness.`;
    
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      max_tokens: 150,
      temperature: 0.7
    });
    
    return response.choices[0].message.content;
  } catch (error) {
    console.error('Error generating response:', error);
    throw error;
  }
};

// Function to convert text response to speech using OpenAI TTS
export const textToSpeech = async (text) => {
  try {
    const response = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'alloy', // Using a neutral voice
      input: text
    });
    
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