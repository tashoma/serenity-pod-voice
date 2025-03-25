/**
 * Utility functions for recording audio from the browser
 */

// Configuration options for audio recording
const DEFAULT_CONFIG = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    channelCount: 2,
    sampleRate: 48000
  },
  video: false,
  mimeType: 'audio/webm',
  audioBitsPerSecond: 256000 // Increase the bitrate for better quality
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
    this.audioContext = null;
    this.analyser = null;
    this.microphone = null;
    this.volumeCallback = null;
    this.volumeInterval = null;
  }
  
  /**
   * Request access to the user's microphone
   * @returns {Promise<MediaStream>} - The media stream
   */
  async requestMicrophoneAccess() {
    try {
      console.log('Requesting microphone access...');
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        audio: this.config.audio, 
        video: this.config.video 
      });
      console.log('Microphone access granted!');
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
    
    try {
      console.log('Starting recording...');
      if (!this.stream) {
        await this.requestMicrophoneAccess();
      }
      
      this.audioChunks = [];
      
      // Create MediaRecorder instance with fallback mime types
      let mimeType = this.config.mimeType;
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        // Try fallback mime types
        const fallbackTypes = [
          'audio/webm;codecs=opus',
          'audio/webm',
          'audio/ogg;codecs=opus',
          'audio/mp4'
        ];
        
        for (const type of fallbackTypes) {
          if (MediaRecorder.isTypeSupported(type)) {
            console.log(`Using fallback mime type: ${type}`);
            mimeType = type;
            break;
          }
        }
      }
      
      // Create MediaRecorder instance
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: mimeType,
        audioBitsPerSecond: this.config.audioBitsPerSecond
      });
      
      // Set up event handlers
      this.mediaRecorder.ondataavailable = (event) => {
        console.log(`Data available event: size=${event.data.size}`);
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };
      
      this.mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event.error);
      };
      
      // Request data every second to ensure we get chunks even for short recordings
      this.mediaRecorder.start(1000);
      console.log('MediaRecorder started:', this.mediaRecorder.state);
      this.isRecording = true;
      
      // Start volume monitoring
      if (this.volumeCallback) {
        this.setupVolumeMonitoring(this.volumeCallback);
      }
    } catch (error) {
      console.error('Error starting recording:', error);
      throw error;
    }
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
    
    console.log('Stopping recording...');
    this.isRecording = false;
    
    // Stop volume monitoring
    this.stopVolumeMonitoring();
    
    return new Promise((resolve) => {
      // Add an event handler for when recording stops
      this.mediaRecorder.onstop = () => {
        console.log('MediaRecorder stopped');
        console.log(`Collected ${this.audioChunks.length} audio chunks`);
        
        if (this.audioChunks.length === 0) {
          console.warn('No audio data collected');
          resolve(null);
          return;
        }
        
        try {
          const audioBlob = new Blob(this.audioChunks, { type: this.mediaRecorder.mimeType });
          console.log(`Created audio blob: size=${audioBlob.size}, type=${audioBlob.type}`);
          resolve(audioBlob);
        } catch (error) {
          console.error('Error creating audio blob:', error);
          resolve(null);
        }
      };
      
      // Stop the media recorder
      try {
        this.mediaRecorder.stop();
      } catch (error) {
        console.error('Error stopping media recorder:', error);
        resolve(null);
      }
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
  
  /**
   * Set up volume monitoring for the microphone
   * @param {function} callback - A callback function that will receive the volume level (0-100)
   */
  setupVolumeMonitoring(callback) {
    this.volumeCallback = callback;
    
    if (!this.stream) {
      console.warn('No microphone stream available for volume monitoring');
      return;
    }
    
    try {
      // Create audio context
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      
      // Connect microphone to analyzer
      this.microphone = this.audioContext.createMediaStreamSource(this.stream);
      this.microphone.connect(this.analyser);
      
      // Set up monitoring interval
      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      this.volumeInterval = setInterval(() => {
        if (!this.isRecording) {
          this.stopVolumeMonitoring();
          return;
        }
        
        this.analyser.getByteFrequencyData(dataArray);
        
        // Calculate volume level (0-100)
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        
        const average = sum / bufferLength;
        const volume = Math.min(100, Math.round((average / 256) * 100));
        
        // Send volume level through callback
        if (this.volumeCallback) {
          this.volumeCallback(volume);
        }
      }, 100); // Monitor every 100ms
      
      console.log('Volume monitoring started');
    } catch (error) {
      console.error('Error setting up volume monitoring:', error);
    }
  }
  
  /**
   * Stop volume monitoring
   */
  stopVolumeMonitoring() {
    if (this.volumeInterval) {
      clearInterval(this.volumeInterval);
      this.volumeInterval = null;
    }
    
    if (this.microphone) {
      this.microphone.disconnect();
      this.microphone = null;
    }
    
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(error => {
        console.error('Error closing audio context:', error);
      });
    }
    
    this.analyser = null;
    console.log('Volume monitoring stopped');
  }
}

export default AudioRecorder; 