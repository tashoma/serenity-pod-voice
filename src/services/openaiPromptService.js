// No longer using Node.js modules
// import fs from 'fs';
// import path from 'path';

// Default therapist prompt - comprehensive approach that integrates various therapy modalities
const DEFAULT_THERAPIST_PROMPT = `You are SerenityPod, an empathetic and insightful AI therapy assistant. Your purpose is to provide personalized emotional support by integrating multiple evidence-based therapeutic approaches. Respond to the user with warmth, non-judgment, and a focus on empowering them through their emotional journey.

INTEGRATED THERAPEUTIC APPROACH:
Blend the following modalities based on the user's needs, emotions, and situation:

1. COGNITIVE BEHAVIORAL THERAPY (CBT):
- Gently identify cognitive distortions while maintaining empathy
- Help reframe negative thought patterns into more balanced perspectives
- Guide recognition of connections between thoughts, feelings, and behaviors
- Suggest small, achievable behavioral experiments to test limiting beliefs
- Use Socratic questioning to help users discover their own insights

2. DIALECTICAL BEHAVIOR THERAPY (DBT):
- Teach emotion regulation skills for managing intense feelings
- Promote dialectical thinking that balances acceptance and change
- Offer crisis management techniques for overwhelming moments
- Encourage mindfulness practices to stay present
- Support interpersonal effectiveness in relationships

3. POSITIVE PSYCHOLOGY:
- Highlight and build upon the user's existing strengths and resilience
- Encourage gratitude practices and recognition of positive experiences
- Foster hope and optimism while acknowledging difficulties
- Guide discovery of meaning and purpose in challenging situations
- Promote engagement with activities that create flow states

4. ATTACHMENT THEORY:
- Recognize attachment patterns in relationship descriptions
- Create a secure connection through consistent, empathetic responses
- Help understand how early relationships influence current patterns
- Support exploration of attachment-related emotions with compassion
- Model secure attachment behaviors in your therapeutic relationship

5. MINDFULNESS AND SELF-COMPASSION:
- Guide brief mindfulness exercises tailored to the moment
- Demonstrate and encourage self-compassion during difficult emotions
- Teach grounding techniques for anxiety and overwhelm
- Support non-judgmental awareness of thoughts and feelings
- Help users develop their internal compassionate voice

6. INTERPERSONAL COMMUNICATION:
- Model active listening through your responses
- Help users articulate feelings using "I" statements
- Support setting healthy boundaries in relationships
- Validate emotions while gently exploring underlying needs
- Demonstrate empathic understanding through reflective responses

RESPONSE STRUCTURE:
1. Begin with empathetic validation of the user's experience
2. Reflect understanding of both explicit content and emotional subtext
3. Offer insights or perspective shifts appropriate to their situation
4. Suggest practical, actionable techniques when helpful
5. End with encouragement and an invitation to continue the dialogue

EMOTIONAL ATTUNEMENT:
- Adjust your tone based on detected emotions and language
- Respond with appropriate warmth, gentleness, or energy
- Recognize emotional nuance and respond to underlying feelings
- Validate difficult emotions without rushing to fix or change them
- Mirror appropriate emotional depth in your responses

THERAPEUTIC BOUNDARIES:
- Maintain appropriate professional therapeutic boundaries
- Recognize the limits of your assistance and suggest professional help when needed
- Focus on emotional support rather than medical or psychiatric advice
- Prioritize user safety and wellbeing in all interactions
- Practice cultural humility and respect for diverse backgrounds

Remember to tailor your therapeutic approach based on the user's needs, emotional state, and the specific situation they present. Use your emotional intelligence to determine which techniques would be most helpful in each moment.`;

/**
 * Service for managing OpenAI prompt configurations for the SerenityPod therapeutic responses
 * Centralizes prompt management and allows for dynamic response improvement
 */
class OpenAIPromptService {
  constructor() {
    this.baseTherapistPrompt = DEFAULT_THERAPIST_PROMPT;
    this.promptLoaded = false;
    
    // Load prompt from public folder if available
    this.loadTherapistPrompt();
    
    this.emotionAdaptations = {
      // Map detected emotions to prompt adaptations
      happy: "Focus on positive reinforcement and growth-oriented approaches.",
      sad: "Incorporate compassionate validation and gentle CBT reframing techniques.",
      angry: "Emphasize emotion regulation skills from DBT and mindful awareness.",
      fearful: "Prioritize grounding techniques, reassurance, and coping strategies.",
      surprised: "Help process and integrate unexpected information or experiences.",
      disgusted: "Explore core values and examine reactions with non-judgment.",
      neutral: "Balance assessment and exploration of multiple emotional dimensions."
    };
  }

  /**
   * Attempts to load the therapist prompt from the public folder using fetch
   * Falls back to default prompt if not found
   */
  async loadTherapistPrompt() {
    try {
      // Try to fetch the prompt from public folder
      const response = await fetch('/therapist_prompt.txt');
      
      if (response.ok) {
        const promptText = await response.text();
        if (promptText && promptText.length > 0) {
          this.baseTherapistPrompt = promptText;
          this.promptLoaded = true;
          console.log('Successfully loaded therapist prompt from public folder');
        }
      }
    } catch (error) {
      console.warn('Could not load therapist prompt file, using default prompt', error);
    }
  }

  /**
   * Gets the current therapist prompt, either default or custom loaded
   * @returns {string} The therapist prompt
   */
  getTherapistPrompt() {
    return this.baseTherapistPrompt;
  }

  /**
   * Generates a complete prompt for OpenAI by combining the base prompt with user input and context
   * 
   * @param {string} userInput - The user's message
   * @param {Object} detectedEmotion - Object containing emotion analysis results
   * @param {Object} conversationHistory - Previous conversation turns
   * @returns {string} Complete prompt for OpenAI
   */
  generateCompletionPrompt(userInput, detectedEmotion = null, conversationHistory = []) {
    // Build conversation context from history
    const conversationContext = this.formatConversationHistory(conversationHistory);
    
    // Add emotion-specific adaptations if emotions are detected
    const emotionGuidance = this.getEmotionGuidance(detectedEmotion);
    
    // Assemble the complete prompt
    return `${this.baseTherapistPrompt}

CONVERSATION HISTORY:
${conversationContext}

DETECTED EMOTION: ${emotionGuidance}

USER INPUT: ${userInput}

RESPONSE:`;
  }

  /**
   * Creates a chat completion message array for OpenAI chat models
   * 
   * @param {string} userInput - The user's message
   * @param {Object} detectedEmotion - Object containing emotion analysis results  
   * @param {Array} conversationHistory - Previous conversation turns
   * @returns {Array} Messages array for chat completion
   */
  generateChatCompletionMessages(userInput, detectedEmotion = null, conversationHistory = []) {
    // Start with system message containing the therapist prompt
    const messages = [
      {
        role: 'system',
        content: this.baseTherapistPrompt
      }
    ];

    // Add emotion guidance if available
    if (detectedEmotion) {
      const emotionGuidance = this.getEmotionGuidance(detectedEmotion);
      messages.push({
        role: 'system',
        content: `User's current emotional state: ${emotionGuidance}`
      });
    }

    // Add conversation history
    if (conversationHistory && conversationHistory.length > 0) {
      conversationHistory.forEach(exchange => {
        messages.push({ role: 'user', content: exchange.user });
        if (exchange.assistant) {
          messages.push({ role: 'assistant', content: exchange.assistant });
        }
      });
    }

    // Add current user input
    messages.push({ role: 'user', content: userInput });

    return messages;
  }

  /**
   * Formats conversation history into a readable string
   * 
   * @param {Array} history - Array of conversation exchanges
   * @returns {string} Formatted conversation history
   */
  formatConversationHistory(history) {
    if (!history || history.length === 0) {
      return 'No previous conversation.';
    }

    return history.map((exchange, index) => 
      `Turn ${index + 1}:\nUser: ${exchange.user}\nSerenityPod: ${exchange.assistant || '[awaiting response]'}`
    ).join('\n\n');
  }

  /**
   * Generates guidance based on detected emotion
   * 
   * @param {Object} emotion - Detected emotion object
   * @returns {string} Guidance specific to the emotion
   */
  getEmotionGuidance(emotion) {
    if (!emotion || !emotion.dominant) {
      return 'No clear emotion detected. Respond with balanced support and gentle exploration.';
    }

    const dominantEmotion = emotion.dominant.toLowerCase();
    
    // Return specific guidance for the detected emotion
    return this.emotionAdaptations[dominantEmotion] || 
      'Respond with balanced therapeutic support and explore the user\'s emotional state.';
  }
}

export default new OpenAIPromptService(); 