import React, { useRef, useState, useEffect } from 'react';
import Webcam from 'react-webcam';
import * as faceapi from 'face-api.js';
import '../styles/WebcamComponent.css';

const WebcamComponent = ({ onMoodUpdate }) => {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [noFaceTimeout, setNoFaceTimeout] = useState(null);
  const [emotionHistory, setEmotionHistory] = useState([]);
  const [emotionData, setEmotionData] = useState({});
  
  // Load face-api models
  useEffect(() => {
    const loadModels = async () => {
      try {
        // Specify path to models directory
        const MODEL_URL = '/models';
        
        // Load models one by one
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
        await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL);
        
        console.log('Models loaded successfully');
        setIsModelLoaded(true);
      } catch (error) {
        console.error('Error loading models:', error);
      }
    };
    
    loadModels();
  }, []);
  
  // Setup camera
  useEffect(() => {
    const setupCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: 640, 
            height: 480,
            facingMode: 'user'
          } 
        });
        
        if (webcamRef.current) {
          webcamRef.current.srcObject = stream;
          setCameraActive(true);
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        setPermissionDenied(true);
      }
    };
    
    if (isModelLoaded) {
      setupCamera();
    }
    
    return () => {
      // Cleanup camera stream when component unmounts
      if (webcamRef.current && webcamRef.current.srcObject) {
        const tracks = webcamRef.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, [isModelLoaded]);
  
  // Track emotion history over time to provide better analysis
  useEffect(() => {
    const MAX_HISTORY_LENGTH = 20; // Store the last 20 emotion readings
    
    if (Object.keys(emotionData).length > 0) {
      // Add current emotion data to history
      setEmotionHistory(prevHistory => {
        const newHistory = [...prevHistory, emotionData];
        // Keep only the last MAX_HISTORY_LENGTH items
        return newHistory.slice(-MAX_HISTORY_LENGTH);
      });
    }
  }, [emotionData]);
  
  // Face detection and mood analysis
  useEffect(() => {
    let detectionInterval;
    
    if (isModelLoaded && cameraActive) {
      detectionInterval = setInterval(async () => {
        if (webcamRef.current && canvasRef.current) {
          // Get dimensions
          const video = webcamRef.current.video;
          if (!video) return;
          
          const { videoWidth, videoHeight } = video;
          
          // Match canvas dimensions to video
          canvasRef.current.width = videoWidth;
          canvasRef.current.height = videoHeight;
          
          // Detect faces and expressions
          const detections = await faceapi.detectAllFaces(
              video, 
              new faceapi.TinyFaceDetectorOptions()
            )
            .withFaceLandmarks()
            .withFaceExpressions();
          
          // Clear previous drawings
          const ctx = canvasRef.current.getContext('2d');
          ctx.clearRect(0, 0, videoWidth, videoHeight);
          
          // Draw results
          if (detections.length > 0) {
            // Draw detection results on canvas
            faceapi.draw.drawDetections(canvasRef.current, detections);
            faceapi.draw.drawFaceLandmarks(canvasRef.current, detections);
            
            // Process the detected expressions
            const expressions = detections[0].expressions;
            const maxExpression = Object.entries(expressions)
              .reduce((max, expression) => 
                expression[1] > max[1] ? expression : max, 
                ['neutral', 0]
              );
            
            // Create a detailed emotion data object
            const timestamp = new Date();
            const detailedEmotionData = {
              timestamp,
              primaryEmotion: maxExpression[0],
              primaryEmotionScore: maxExpression[1],
              // Convert FaceExpressions to a plain object for Firebase compatibility
              allEmotions: Object.fromEntries(
                Object.entries(expressions).map(([key, value]) => [key, value])
              ),
              faceBoundingBox: {
                x: detections[0].detection.box.x,
                y: detections[0].detection.box.y,
                width: detections[0].detection.box.width,
                height: detections[0].detection.box.height
              },
              faceConfidence: detections[0].detection.score,
              sessionTime: Date.now() - (emotionHistory[0]?.timestamp || Date.now())
            };
            
            // Store the emotion data
            setEmotionData(detailedEmotionData);
              
            // Pass the detected mood to parent component with full emotion data
            onMoodUpdate(maxExpression[0], detailedEmotionData);
            
            // Set face detected flag
            setFaceDetected(true);
            
            // Clear any existing timeout
            if (noFaceTimeout) {
              clearTimeout(noFaceTimeout);
              setNoFaceTimeout(null);
            }
          } else {
            // No face detected
            if (faceDetected && !noFaceTimeout) {
              // Start a timeout to show the message after 3 seconds of no face detection
              const timeout = setTimeout(() => {
                setFaceDetected(false);
              }, 3000);
              setNoFaceTimeout(timeout);
            }
          }
        }
      }, 300); // Detect every 300ms
    }
    
    return () => {
      if (detectionInterval) {
        clearInterval(detectionInterval);
      }
    };
  }, [isModelLoaded, cameraActive, onMoodUpdate, emotionHistory]);
  
  // Get emotion trend analysis
  const getEmotionTrend = () => {
    if (emotionHistory.length < 3) return null;
    
    // Analyze the trend of the primary emotion over time
    const emotions = emotionHistory.map(data => data.primaryEmotion);
    const mostFrequentEmotion = emotions.reduce((acc, emotion) => {
      acc[emotion] = (acc[emotion] || 0) + 1;
      return acc;
    }, {});
    
    // Get the most frequent emotion
    const dominantEmotion = Object.entries(mostFrequentEmotion)
      .reduce((max, [emotion, count]) => 
        count > max[1] ? [emotion, count] : max, 
        ['neutral', 0]
      )[0];
    
    // Calculate average scores for each emotion
    const averageScores = {};
    emotionHistory.forEach(data => {
      Object.entries(data.allEmotions).forEach(([emotion, score]) => {
        averageScores[emotion] = (averageScores[emotion] || 0) + score / emotionHistory.length;
      });
    });
    
    return {
      dominantEmotion,
      averageScores,
      emotionCounts: mostFrequentEmotion,
      sessionDuration: emotionHistory.length > 0 
        ? Date.now() - (emotionHistory[0].timestamp || Date.now())
        : 0
    };
  };
  
  return (
    <div className="webcam-component">
      {!isModelLoaded ? (
        <div className="loading-container">
          <p>Loading face detection models...</p>
          <div className="loading-spinner"></div>
        </div>
      ) : permissionDenied ? (
        <div className="error-container">
          <p>Camera access denied. Please enable camera access to use mood detection.</p>
        </div>
      ) : (
        <div className="webcam-wrapper">
          <Webcam
            audio={false}
            ref={webcamRef}
            className="webcam"
            mirrored={true}
          />
          <canvas ref={canvasRef} className="detection-canvas" />
        </div>
      )}
      {!faceDetected && cameraActive && (
        <div className="face-detection-message">
          <p>No face clearly detected. Please adjust your position or lighting for better detection.</p>
        </div>
      )}
    </div>
  );
};

export default WebcamComponent; 