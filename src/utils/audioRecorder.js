/**
 * Utility functions for recording audio from the browser
 */

// Configuration options for audio recording
const DEFAULT_CONFIG = {
  audio: true,
  video: false,
  mimeType: 'audio/webm',
  audioBitsPerSecond: 128000
};

/**
 * Class for recording audio from the user's microphone
 */
class AudioRecorder {
  constructor(config = DEFAULT_CONFIG) {
    this.config = config;
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.stream = null;
    this.isRecording = false;
  }
  
  /**
   * Request access to the user's microphone
   * @returns {Promise<MediaStream>} - The media stream
   */
  async requestMicrophoneAccess() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: this.config.audio, video: this.config.video });
      return this.stream;
    } catch (error) {
      console.error('Error accessing microphone:', error);
      throw error;
    }
  }
  
  /**
   * Start recording audio
   * @returns {Promise<void>}
   */
  async startRecording() {
    if (this.isRecording) {
      console.warn('Recording already in progress');
      return;
    }
    
    if (!this.stream) {
      await this.requestMicrophoneAccess();
    }
    
    this.audioChunks = [];
    
    // Create MediaRecorder instance
    this.mediaRecorder = new MediaRecorder(this.stream, {
      mimeType: this.config.mimeType,
      audioBitsPerSecond: this.config.audioBitsPerSecond
    });
    
    // Set up event handlers
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };
    
    // Start recording
    this.mediaRecorder.start();
    this.isRecording = true;
  }
  
  /**
   * Stop recording audio
   * @returns {Promise<Blob>} - The recorded audio blob
   */
  async stopRecording() {
    if (!this.isRecording || !this.mediaRecorder) {
      console.warn('No recording in progress');
      return null;
    }
    
    return new Promise((resolve) => {
      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: this.config.mimeType });
        this.isRecording = false;
        resolve(audioBlob);
      };
      
      this.mediaRecorder.stop();
    });
  }
  
  /**
   * Stop the microphone stream
   */
  stopStream() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
  }
  
  /**
   * Create an audio URL from an audio blob
   * @param {Blob} audioBlob - The audio blob to create a URL for
   * @returns {string} - The URL for the audio blob
   */
  static createAudioUrl(audioBlob) {
    return URL.createObjectURL(audioBlob);
  }
  
  /**
   * Play audio from a blob
   * @param {Blob} audioBlob - The audio blob to play
   * @returns {Promise<void>}
   */
  static async playAudio(audioBlob) {
    const audioUrl = this.createAudioUrl(audioBlob);
    const audio = new Audio(audioUrl);
    
    return new Promise((resolve) => {
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        resolve();
      };
      
      audio.play();
    });
  }
}

export default AudioRecorder; 