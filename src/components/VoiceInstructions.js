import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInfoCircle, faTimes, faMicrophone, faVolumeUp } from '@fortawesome/free-solid-svg-icons';

/**
 * Component that displays tips for better voice recording
 */
const VoiceInstructions = ({ onClose }) => {
  const [isVisible, setIsVisible] = useState(true);
  
  const handleClose = () => {
    setIsVisible(false);
    if (onClose) {
      onClose();
    }
  };
  
  if (!isVisible) {
    return null;
  }
  
  return (
    <div className="voice-instructions-container card">
      <button className="close-button" onClick={handleClose}>
        <FontAwesomeIcon icon={faTimes} />
      </button>
      
      <div className="instructions-header">
        <FontAwesomeIcon icon={faInfoCircle} className="info-icon" />
        <h3>Tips for Better Voice Recognition</h3>
      </div>
      
      <div className="instructions-content">
        <ul>
          <li>
            <FontAwesomeIcon icon={faMicrophone} />
            <span>Speak clearly and at a normal pace</span>
          </li>
          <li>
            <FontAwesomeIcon icon={faVolumeUp} />
            <span>Speak loudly enough - watch the volume meter while speaking</span>
          </li>
          <li>
            <FontAwesomeIcon icon={faInfoCircle} />
            <span>Minimize background noise</span>
          </li>
          <li>
            <FontAwesomeIcon icon={faInfoCircle} />
            <span>Wait for the recording to start before speaking</span>
          </li>
          <li>
            <FontAwesomeIcon icon={faInfoCircle} />
            <span>Position your microphone closer to your mouth if possible</span>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default VoiceInstructions; 