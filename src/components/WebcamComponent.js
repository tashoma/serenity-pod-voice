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
              
            // Pass the detected mood to parent component
            onMoodUpdate(maxExpression[0]);
          }
        }
      }, 300); // Detect every 300ms
    }
    
    return () => {
      if (detectionInterval) {
        clearInterval(detectionInterval);
      }
    };
  }, [isModelLoaded, cameraActive, onMoodUpdate]);
  
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
    </div>
  );
};

export default WebcamComponent; 