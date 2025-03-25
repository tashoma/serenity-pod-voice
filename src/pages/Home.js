import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMicrophone, faMicrophoneSlash, faStop, faUser, faSignOutAlt, faHistory, faPlus, faRedo } from '@fortawesome/free-solid-svg-icons';
import WebcamComponent from '../components/WebcamComponent';
import AvatarComponent from '../components/AvatarComponent';
import AudioRecorder from '../utils/audioRecorder';
import { transcribeAudio, generateResponse, textToSpeech } from '../services/openai';
import { saveConversation, getCurrentUser, onAuthChange, logoutUser } from '../services/firebase';
import Login from '../components/Login';
import ConversationHistory from '../components/ConversationHistory';
import VoiceInstructions from '../components/VoiceInstructions';
import '../styles/Home.css';
import '../styles/VoiceInstructions.css';

const Home = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [detectedMood, setDetectedMood] = useState('neutral');
  const [detailedEmotionData, setDetailedEmotionData] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [firestoreError, setFirestoreError] = useState(null);
  const [micError, setMicError] = useState(null);
  const [transcriptionError, setTranscriptionError] = useState(null);
  const [micVolumeLevel, setMicVolumeLevel] = useState(0);
  const [showVoiceInstructions, setShowVoiceInstructions] = useState(true);
  
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
  
  // Add useEffect to check localStorage for previously dismissed instructions
  useEffect(() => {
    const hideInstructions = localStorage.getItem('hideVoiceInstructions');
    if (hideInstructions === 'true') {
      setShowVoiceInstructions(false);
    }
  }, []);
  
  const handleStartRecording = async () => {
    try {
      setMicError(null);
      setTranscriptionError(null);
      setIsRecording(true);
      setTranscript('');
      
      console.log('Starting audio recording...');
      
      if (!audioRecorder.current) {
        console.log('Creating new AudioRecorder instance');
        audioRecorder.current = new AudioRecorder();
      }
      
      // Set volume level callback
      audioRecorder.current.volumeCallback = (level) => {
        setMicVolumeLevel(level);
      };
      
      // Check if browser supports getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        const error = 'Your browser does not support audio recording. Please try using Chrome, Firefox, or Edge.';
        console.error(error);
        setMicError(error);
        setIsRecording(false);
        return;
      }
      
      // Start recording audio
      await audioRecorder.current.startRecording();
      console.log('Recording started successfully');
    } catch (error) {
      console.error('Error starting recording:', error);
      setMicError(`Microphone access denied or error: ${error.message || 'Unknown error'}`);
      setIsRecording(false);
    }
  };
  
  const handleStopRecording = async () => {
    if (!isRecording) return;
    
    try {
      console.log('Stopping audio recording...');
      setIsRecording(false);
      setIsProcessing(true);
      setMicVolumeLevel(0); // Reset volume level
      
      // Stop recording and get audio blob
      const audioBlob = await audioRecorder.current.stopRecording();
      
      if (!audioBlob) {
        console.warn('No audio recorded or audio recording failed');
        setTranscriptionError('No audio recorded. Please try again and speak clearly.');
        setIsProcessing(false);
        return;
      }
      
      // Log blob details for debugging
      console.log(`Audio recorded: size=${audioBlob.size} bytes, type=${audioBlob.type}`);
      
      if (audioBlob.size < 1000) {
        setTranscriptionError('Audio recording was too short or silent. Please try again and speak clearly.');
        setIsProcessing(false);
        return;
      }
      
      // Transcribe audio using OpenAI Whisper
      try {
        console.log('Transcribing audio...');
        const transcribedText = await transcribeAudio(audioBlob);
        
        if (!transcribedText || transcribedText.trim() === '') {
          console.warn('Transcription returned empty text');
          setTranscriptionError('Could not transcribe audio. Please try again and speak clearly.');
          setIsProcessing(false);
          return;
        }
        
        console.log('Transcription successful:', transcribedText);
        setTranscript(transcribedText);
        
        // Only process if there's something to process
        try {
          // Generate AI response based on transcript and mood
          console.log(`Generating AI response for: "${transcribedText}" with mood: ${detectedMood}`);
          const response = await generateResponse(transcribedText, detectedMood, detailedEmotionData);
          setAiResponse(response);
          
          // Convert AI response to speech
          console.log('Converting AI response to speech');
          const speechUrl = await textToSpeech(response);
          setAudioUrl(speechUrl);
          
          // Save conversation if user is authenticated
          if (isAuthenticated && user) {
            try {
              const success = await saveConversation(
                user.uid, 
                transcribedText, 
                response, 
                detectedMood, 
                detailedEmotionData
              );
              if (!success) {
                handleFirestoreError(new Error('Failed to save conversation'));
              }
            } catch (error) {
              handleFirestoreError(error);
            }
          }
        } catch (error) {
          console.error('Error processing request:', error);
          setAiResponse('Sorry, I encountered an error processing your request.');
        }
      } catch (error) {
        console.error('Error transcribing audio:', error);
        setTranscriptionError(`Transcription failed: ${error.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error in recording workflow:', error);
      setTranscriptionError(`Recording error: ${error.message || 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleMoodUpdate = (mood, emotionData = {}) => {
    setDetectedMood(mood);
    
    try {
      // Ensure we only store serializable data
      if (Object.keys(emotionData).length > 0) {
        // Make a clean copy without any potential circular references
        const sanitizedData = JSON.parse(JSON.stringify(emotionData, (key, value) => {
          // Filter out any functions or non-serializable objects
          return (typeof value === 'function') ? undefined : value;
        }));
        
        setDetailedEmotionData(sanitizedData);
      }
    } catch (error) {
      console.error('Error processing emotion data:', error);
      // Fall back to basic emotion data
      setDetailedEmotionData({ 
        primaryEmotion: mood,
        timestamp: new Date()
      });
    }
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
  
  const handleNewSession = () => {
    // Clear current conversation state
    setTranscript('');
    setAiResponse('');
    setAudioUrl(null);
    
    // Stop any ongoing audio playback
    if (audioPlayer.current) {
      audioPlayer.current.pause();
      audioPlayer.current.src = '';
    }
    
    // Reset any errors
    setMicError(null);
    setTranscriptionError(null);
    
    // Let the user know a new session has started
    console.log('Starting new session');
  };
  
  const handleFirestoreError = (error) => {
    console.error('Firestore error:', error);
    
    // Extract helpful message for the user
    let errorMessage = 'Cloud database connection issue. Your conversations are being saved locally instead.';
    
    if (error.message && error.message.includes('custom FaceExpressions object')) {
      errorMessage = 'Data formatting issue. Your conversation has been saved locally.';
    } else if (error.message && error.message.includes('timeout')) {
      errorMessage = 'Cloud database connection timed out. Your conversation has been saved locally.';
    } else if (!navigator.onLine) {
      errorMessage = 'You are offline. Your conversation has been saved locally and will sync when you reconnect.';
    }
    
    setFirestoreError(errorMessage);
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      setFirestoreError(null);
    }, 5000);
  };
  
  const handleDismissInstructions = () => {
    setShowVoiceInstructions(false);
    // Save to localStorage to remember the user's preference
    localStorage.setItem('hideVoiceInstructions', 'true');
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
              <button className="btn btn-small new-session-btn" onClick={handleNewSession}>
                <FontAwesomeIcon icon={faPlus} /> New Session
              </button>
              <button className="btn btn-small history-btn" onClick={handleHistoryClick}>
                <FontAwesomeIcon icon={faHistory} /> History
              </button>
              <span className="user-email">{user?.email}</span>
              <button className="btn btn-small" onClick={handleLogout}>
                <FontAwesomeIcon icon={faSignOutAlt} /> Logout
              </button>
            </div>
          ) : (
            <div className="user-info">
              <button className="btn btn-small new-session-btn" onClick={handleNewSession}>
                <FontAwesomeIcon icon={faPlus} /> New Session
              </button>
              <button className="btn btn-small" onClick={handleLoginClick}>
                <FontAwesomeIcon icon={faUser} /> Login
              </button>
            </div>
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
          
          {showVoiceInstructions && (
            <VoiceInstructions onClose={handleDismissInstructions} />
          )}
          
          <div className="transcript-container card">
            <div className="transcript-header">
              <h3>Conversation</h3>
              <button 
                className="btn btn-small reset-btn" 
                onClick={handleNewSession}
                title="Start new session"
              >
                <FontAwesomeIcon icon={faRedo} /> Reset
              </button>
            </div>
            
            <div className="transcript-content">
              <h4>Your message:</h4>
              <p>{transcript}</p>
            </div>
            
            {micError && (
              <div className="error-message">
                <p><strong>Microphone Error:</strong> {micError}</p>
                <p>Please make sure you have granted microphone permissions and try again.</p>
              </div>
            )}
            
            {transcriptionError && (
              <div className="error-message">
                <p><strong>Transcription Error:</strong> {transcriptionError}</p>
              </div>
            )}
            
            <div className="ai-response">
              <h4>AI response:</h4>
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
              <>
                <button 
                  className="btn btn-circle mic-button recording" 
                  onClick={handleStopRecording}
                  aria-label="Stop recording"
                >
                  <FontAwesomeIcon icon={faStop} size="2x" />
                </button>
                
                <div className="volume-meter">
                  <div 
                    className="volume-meter-fill" 
                    style={{ width: `${micVolumeLevel}%` }}
                  ></div>
                  {micVolumeLevel < 10 && (
                    <div className="volume-warning">
                      Microphone volume very low! Please speak louder or check your microphone.
                    </div>
                  )}
                </div>
              </>
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