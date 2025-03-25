import { useRef, useState, useEffect } from 'react';
import AudioRecorder from '../utils/audioRecorder';
import { transcribeAudio } from '../services/openai';

/**
 * Custom hook for handling audio recording and transcription
 * @returns {Object} Audio recording state and handlers
 */
const useAudioRecording = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState(null);
  
  // Create recorder instance
  const audioRecorder = useRef(null);
  
  // Initialize audio recorder
  useEffect(() => {
    audioRecorder.current = new AudioRecorder();
    
    return () => {
      if (audioRecorder.current) {
        audioRecorder.current.stopStream();
      }
    };
  }, []);
  
  // Start recording audio
  const startRecording = async () => {
    try {
      setError(null);
      setIsRecording(true);
      setTranscript('');
      
      await audioRecorder.current.startRecording();
    } catch (error) {
      setError('Failed to access microphone. Please check permissions.');
      console.error('Error starting recording:', error);
      setIsRecording(false);
    }
  };
  
  // Stop recording and transcribe audio
  const stopRecording = async () => {
    if (!isRecording) return null;
    
    try {
      setIsRecording(false);
      setIsTranscribing(true);
      
      // Stop recording and get audio blob
      const audioBlob = await audioRecorder.current.stopRecording();
      
      if (!audioBlob) {
        setError('No audio recorded');
        setIsTranscribing(false);
        return null;
      }
      
      // Transcribe audio using OpenAI Whisper
      const transcribedText = await transcribeAudio(audioBlob);
      setTranscript(transcribedText);
      
      return {
        text: transcribedText,
        audioBlob
      };
    } catch (error) {
      setError('Failed to transcribe audio');
      console.error('Error transcribing audio:', error);
      return null;
    } finally {
      setIsTranscribing(false);
    }
  };
  
  // Cancel recording
  const cancelRecording = () => {
    if (isRecording && audioRecorder.current) {
      audioRecorder.current.stopRecording();
      setIsRecording(false);
    }
  };
  
  return {
    isRecording,
    isTranscribing,
    transcript,
    error,
    startRecording,
    stopRecording,
    cancelRecording
  };
};

export default useAudioRecording; 