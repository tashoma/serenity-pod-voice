import React, { useState, useEffect } from 'react';
import '../styles/AvatarComponent.css';

const AvatarComponent = ({ mood = 'neutral', speaking = false }) => {
  const [expression, setExpression] = useState('neutral');
  
  // Emoticon faces based on mood
  const emoticons = {
    happy: '😊',
    sad: '😔',
    angry: '😠',
    surprised: '😮',
    disgusted: '😖',
    fearful: '😨',
    neutral: '😐'
  };
  
  // Map face-api moods to our set
  useEffect(() => {
    // Normalize the mood
    let normalizedMood = mood.toLowerCase();
    
    // Map similar moods to our available set
    if (normalizedMood === 'happy' || normalizedMood === 'happiness') {
      setExpression('happy');
    } else if (normalizedMood === 'sad' || normalizedMood === 'sadness') {
      setExpression('sad');
    } else if (normalizedMood === 'angry' || normalizedMood === 'anger') {
      setExpression('angry');
    } else if (normalizedMood === 'surprised' || normalizedMood === 'surprise') {
      setExpression('surprised');
    } else if (normalizedMood === 'disgusted' || normalizedMood === 'disgust') {
      setExpression('disgusted');
    } else if (normalizedMood === 'fearful' || normalizedMood === 'fear') {
      setExpression('fearful');
    } else {
      setExpression('neutral');
    }
  }, [mood]);
  
  // In a production version, we'd replace the emoticon with actual SVG or animated characters
  return (
    <div className={`avatar-container ${speaking ? 'speaking' : ''}`}>
      <div className={`avatar ${expression}`}>
        <div className="avatar-face">
          {emoticons[expression]}
        </div>
        {speaking && (
          <div className="speaking-indicator">
            <div className="dot"></div>
            <div className="dot"></div>
            <div className="dot"></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AvatarComponent; 