import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMicrophone, faMicrophoneSlash, faStop, faUser, faSignOutAlt, faHistory } from '@fortawesome/free-solid-svg-icons';
import WebcamComponent from '../components/WebcamComponent';
import AvatarComponent from '../components/AvatarComponent';
import AudioRecorder from '../utils/audioRecorder';
import { transcribeAudio, generateResponse, textToSpeech } from '../services/openai';
import { saveConversation, getCurrentUser, onAuthChange, logoutUser } from '../services/firebase';
import Login from '../components/Login';
import ConversationHistory from '../components/ConversationHistory';
import '../styles/Home.css';

const Home = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [detectedMood, setDetectedMood] = useState('neutral');
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [firestoreError, setFirestoreError] = useState(null);
  
  const audioRecorder = useRef(null);
  const audioPlayer = useRef(new Audio());
  
  // Initialize audio recorder
  useEffect(() => {
    audioRecorder.current = new AudioRecorder();
    
    return () => {
      if (audioRecorder.current) {
        audioRecorder.current.stopStream();
      }
      
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);
  
  // Check if user is authenticated
  useEffect(() => {
    const unsubscribe = onAuthChange((currentUser) => {
      setUser(currentUser);
      setIsAuthenticated(!!currentUser);
    });
    
    return () => unsubscribe();
  }, []);
  
  // Play AI response audio when audioUrl changes
  useEffect(() => {
    if (audioUrl) {
      audioPlayer.current.src = audioUrl;
      audioPlayer.current.play().catch(error => {
        console.error('Error playing audio:', error);
      });
    }
    
    return () => {
      audioPlayer.current.pause();
    };
  }, [audioUrl]);
  
  const handleStartRecording = async () => {
    try {
      setIsRecording(true);
      setTranscript('');
      
      // Start recording audio
      await audioRecorder.current.startRecording();
    } catch (error) {
      console.error('Error starting recording:', error);
      setIsRecording(false);
    }
  };
  
  const handleStopRecording = async () => {
    if (!isRecording) return;
    
    try {
      setIsRecording(false);
      setIsProcessing(true);
      
      // Stop recording and get audio blob
      const audioBlob = await audioRecorder.current.stopRecording();
      
      if (!audioBlob) {
        console.warn('No audio recorded');
        setIsProcessing(false);
        return;
      }
      
      // Transcribe audio using OpenAI Whisper
      let transcribedText;
      try {
        transcribedText = await transcribeAudio(audioBlob);
        setTranscript(transcribedText);
      } catch (error) {
        console.error('Error transcribing audio:', error);
        setTranscript('Sorry, I couldn\'t transcribe your audio.');
        setIsProcessing(false);
        return;
      }
      
      // Only process if there's something to process
      if (transcribedText.trim()) {
        try {
          // Generate AI response based on transcript and mood
          const response = await generateResponse(transcribedText, detectedMood);
          setAiResponse(response);
          
          // Convert AI response to speech
          const speechUrl = await textToSpeech(response);
          setAudioUrl(speechUrl);
          
          // Save conversation if user is authenticated
          if (isAuthenticated && user) {
            try {
              await saveConversation(user.uid, transcribedText, response, detectedMood);
            } catch (error) {
              console.error('Error saving conversation:', error);
              setFirestoreError('Unable to save conversation. Your data is still secure.');
            }
          }
        } catch (error) {
          console.error('Error processing request:', error);
          setAiResponse('Sorry, I encountered an error processing your request.');
        }
      }
    } catch (error) {
      console.error('Error stopping recording:', error);
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleMoodUpdate = (mood) => {
    setDetectedMood(mood);
  };
  
  const handleLoginClick = () => {
    setShowLogin(true);
  };
  
  const handleLoginSuccess = (user) => {
    setUser(user);
    setIsAuthenticated(true);
    setShowLogin(false);
  };
  
  const handleLogout = async () => {
    try {
      await logoutUser();
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };
  
  const handleHistoryClick = () => {
    if (isAuthenticated && user) {
      setShowHistory(true);
    } else {
      setShowLogin(true);
    }
  };
  
  return (
    <div className="home-container">
      <header className="header">
        <div className="logo">
          <h1>SerenityPod</h1>
        </div>
        <div className="auth-controls">
          {isAuthenticated ? (
            <div className="user-info">
              <button className="btn btn-small history-btn" onClick={handleHistoryClick}>
                <FontAwesomeIcon icon={faHistory} /> History
              </button>
              <span className="user-email">{user?.email}</span>
              <button className="btn btn-small" onClick={handleLogout}>
                <FontAwesomeIcon icon={faSignOutAlt} /> Logout
              </button>
            </div>
          ) : (
            <button className="btn btn-small" onClick={handleLoginClick}>
              <FontAwesomeIcon icon={faUser} /> Login
            </button>
          )}
        </div>
      </header>
      
      <main className="main-content">
        <div className="webcam-section">
          <WebcamComponent onMoodUpdate={handleMoodUpdate} />
          {detectedMood && (
            <div className="mood-indicator">
              <p>Detected mood: <span className={`mood ${detectedMood}`}>{detectedMood}</span></p>
            </div>
          )}
        </div>
        
        <div className="conversation-section">
          <div className="avatar-section">
            <AvatarComponent mood={detectedMood} speaking={isProcessing || (audioPlayer.current.paused === false)} />
          </div>
          
          <div className="transcript-container card">
            <div className="transcript-content">
              <h3>Your message:</h3>
              <p>{transcript}</p>
            </div>
            
            <div className="ai-response">
              <h3>AI response:</h3>
              {isProcessing ? (
                <p className="processing">Processing...</p>
              ) : (
                <p>{aiResponse}</p>
              )}
            </div>
          </div>
          
          <div className="microphone-controls">
            {!isRecording ? (
              <button 
                className="btn btn-circle mic-button" 
                onClick={handleStartRecording}
                aria-label="Start recording"
                disabled={isProcessing}
              >
                <FontAwesomeIcon icon={faMicrophone} size="2x" />
              </button>
            ) : (
              <button 
                className="btn btn-circle mic-button recording" 
                onClick={handleStopRecording}
                aria-label="Stop recording"
              >
                <FontAwesomeIcon icon={faStop} size="2x" />
              </button>
            )}
            <p className="mic-status">
              {isRecording ? 'Recording...' : isProcessing ? 'Processing...' : 'Click to speak'}
            </p>
          </div>
        </div>
      </main>
      
      {firestoreError && (
        <div className="error-notification">
          <p>{firestoreError}</p>
          <button 
            className="close-error" 
            onClick={() => setFirestoreError(null)}
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}
      
      <footer className="footer">
        <p>SerenityPod &copy; 2025 - Privacy-focused AI therapy assistant</p>
      </footer>
      
      {showLogin && <Login onLoginSuccess={handleLoginSuccess} onClose={() => setShowLogin(false)} />}
      {showHistory && <ConversationHistory userId={user?.uid} onClose={() => setShowHistory(false)} />}
    </div>
  );
};

export default Home; 