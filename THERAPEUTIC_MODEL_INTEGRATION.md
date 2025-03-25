# SerenityPod Therapeutic Model Integration Guide

This document outlines how to integrate the enhanced therapeutic model capabilities into your SerenityPod application for improved AI responses.

## Overview

The updated system enhances SerenityPod's therapeutic capabilities by integrating six evidence-based therapeutic approaches:

1. **Cognitive Behavioral Therapy (CBT)** - Identifies and reframes negative thought patterns
2. **Dialectical Behavior Therapy (DBT)** - Provides emotion regulation and mindfulness strategies
3. **Positive Psychology** - Highlights strengths and promotes gratitude and meaning
4. **Attachment Theory** - Explores relationship patterns and creates a secure connection
5. **Mindfulness and Self-Compassion** - Offers grounding techniques and self-kindness
6. **Interpersonal Communication Models** - Models active listening and effective expression

## Integration Steps

### 1. File Structure Overview

The enhanced therapeutic model consists of three key components:

- `public/therapist_prompt.txt` - Core prompt that defines the therapeutic approach (accessible via browser)
- `src/services/openaiPromptService.js` - Service for managing prompts and adapting to emotions
- Updated OpenAI service and hooks for using the enhanced prompts

### 2. Prompt File Placement

The therapist prompt file should be placed in the public folder so it can be accessed by the browser:

```
public/
  therapist_prompt.txt  <- Place the prompt file here
```

If the file is not found, the service will fall back to a built-in default prompt.

### 3. Import the OpenAI Prompt Service

In components that interact with the AI conversation, import the updated hook:

```jsx
import useOpenAIConversation from '../hooks/useOpenAIConversation';
```

### 4. Use the Enhanced Hook in Components

Update your components to utilize the enhanced hook capabilities:

```jsx
const {
  isProcessing,
  aiResponse,
  audioUrl,
  error,
  conversationHistory,
  processInput,
  resetConversation
} = useOpenAIConversation();

// Process user input with emotion data
const handleUserInput = async (text, emotionData) => {
  const response = await processInput(text, emotionData);
  // Handle the response
};
```

### 5. Passing Emotion Data

Ensure your emotion detection component passes the full emotion data object:

```jsx
// In your facial detection component
const processEmotions = (detections) => {
  if (!detections || detections.length === 0) return null;
  
  const detection = detections[0];
  const expressions = detection.expressions;
  
  // Convert to an object with all emotion scores
  const allEmotions = {
    happy: expressions.happy,
    sad: expressions.sad,
    angry: expressions.angry,
    fearful: expressions.fearful,
    surprised: expressions.surprised,
    disgusted: expressions.disgusted,
    neutral: expressions.neutral
  };
  
  // Find the dominant emotion
  const dominantEmotion = Object.entries(allEmotions)
    .sort((a, b) => b[1] - a[1])[0][0];
  
  return {
    dominant: dominantEmotion,
    allEmotions
  };
};
```

### 6. Customizing the Therapeutic Model

You can modify the therapeutic approach by editing:

- `public/therapist_prompt.txt` - For the core therapeutic instructions
- `src/services/openaiPromptService.js` - For emotion-specific adaptations

## Therapeutic Response Structure

The enhanced model structures responses in this pattern:

1. Validation of the user's experience
2. Reflection of understanding (explicit and emotional subtext)
3. Insights or perspective shifts appropriate to the situation
4. Practical techniques when helpful
5. Encouragement and invitation to continue

## Testing the Integration

1. Run basic conversation tests with different emotions:
   - Process inputs with happy, sad, and neutral emotions
   - Verify the responses adapt appropriately

2. Test conversation continuity:
   - Have multi-turn conversations
   - Verify the AI remembers context from previous turns

## Best Practices

1. **Privacy and Ethics**:
   - Ensure users are informed about data processing
   - Maintain appropriate therapeutic boundaries

2. **Response Processing**:
   - Keep maximum conversation history limited to prevent token issues
   - Clean up audio URLs properly to prevent memory leaks

3. **Error Handling**:
   - Gracefully handle API failures
   - Provide meaningful messages to users if responses fail

## Advanced Customization

For deeper customization, consider:

1. **Therapy Style Preferences**:
   - Add user preference setting for dominant therapeutic approach
   - Modify `openaiPromptService.js` to weight approaches based on preferences

2. **Session Awareness**:
   - Track session numbers and progress over time
   - Adapt prompt to reference previous sessions when appropriate

3. **Additional Modalities**:
   - Add support for other therapeutic approaches like Acceptance and Commitment Therapy
   - Expand emotion adaptations with more nuanced strategies

## Troubleshooting

- **Response Quality Issues**:
  - Check if emotion data is being passed correctly
  - Verify the prompt is being loaded from the public folder
  - Test with simplified inputs first

- **Performance Problems**:
  - Limit conversation history length
  - Optimize emotion processing
  - Consider caching mechanisms for similar responses

- **Token Limit Errors**:
  - Reduce prompt complexity
  - Limit conversation history length
  - Use more efficient emotion encoding 