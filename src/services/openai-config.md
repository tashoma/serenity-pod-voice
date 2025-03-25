# OpenAI API Configuration

This document provides instructions for setting up and configuring the OpenAI API for SerenityPod.

## Prerequisites

1. Create an account on [OpenAI Platform](https://platform.openai.com/)
2. Generate an API key in your account dashboard
3. Make sure you have billing set up to use the API

## API Key Management

1. Add your OpenAI API key to the `.env.local` file:
   ```
   REACT_APP_OPENAI_API_KEY=your_actual_api_key
   ```
2. Never commit your actual API key to GitHub
3. Consider using a project-specific API key with usage limits

## Models Used

SerenityPod uses the following OpenAI models:

1. **GPT-3.5 Turbo** (`gpt-3.5-turbo`) - For generating conversational responses
   - Temperature: 0.7 (balanced between creativity and coherence)
   - Max tokens: 150 (keeps responses concise)
   - System message: Instructs the model to act as a compassionate therapy assistant

2. **Whisper** (`whisper-1`) - For transcribing speech to text
   - Format: WebM audio format

3. **TTS** (`tts-1`) - For text-to-speech conversion
   - Voice: "alloy" (neutral, calming voice)

## Usage Considerations

1. **Cost Management**
   - Monitor API usage in your OpenAI dashboard
   - Set up usage limits to prevent unexpected charges
   - Consider implementing rate limiting in the application

2. **Security**
   - For production, implement a backend proxy to avoid exposing your API key in client-side code
   - Use encryption for data in transit and at rest
   - Implement user authentication before allowing API access

3. **Content Filtering**
   - OpenAI has built-in content filtering
   - Consider implementing additional safeguards for sensitive topics
   - Have a clear content policy for users

4. **Latency Optimization**
   - Cache common responses when appropriate
   - Implement feedback to users during processing
   - Consider streaming responses for longer text

## Testing the API

Before full implementation, test API endpoints:

1. Test GPT chat completion:
   ```javascript
   const response = await openai.chat.completions.create({
     model: "gpt-3.5-turbo",
     messages: [
       { role: "system", content: "You are a helpful assistant." },
       { role: "user", content: "Hello, how are you?" }
     ]
   });
   console.log(response.choices[0].message.content);
   ```

2. Test TTS:
   ```javascript
   const speechResponse = await openai.audio.speech.create({
     model: "tts-1",
     voice: "alloy",
     input: "Hello, this is a test of the text to speech API."
   });
   ```

## Fallback Mechanisms

Implement fallbacks in case of API failures:

1. Local text responses for common inputs
2. Graceful error handling with user-friendly messages
3. Retry logic with exponential backoff for temporary failures 