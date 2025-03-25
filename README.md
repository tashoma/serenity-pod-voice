# SerenityPod - AI Therapy Assistant MVP

SerenityPod is a voice-first conversational interface with facial mood analysis designed to provide emotional support and guided therapy sessions. This MVP focuses on creating a natural, empathetic AI assistant that can detect user emotions and respond appropriately.

## Features

- **Voice-First Interaction**: Natural conversation with the AI using microphone input and speech recognition
- **Real-Time Mood Detection**: Facial analysis to detect emotions during conversations
- **Responsive 2D Avatar**: Visual representation that reacts to detected moods
- **Text-to-Speech Output**: AI responses are vocalized for a natural conversational flow
- **Secure Storage**: Conversations are stored securely with encryption in Firebase

## Technology Stack

- React.js for the front-end interface
- Web Speech API for voice recognition
- face-api.js for facial mood detection
- OpenAI API for natural language processing
- Firebase for authentication and data storage

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- NPM or Yarn
- OpenAI API key
- Firebase project with authentication enabled

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/username/serenity-pod-mvp.git
   cd serenity-pod-mvp
   ```

2. Install dependencies:
   ```bash
   npm install
   ```
   
   This will also automatically download the face-api.js models. If the models don't download automatically, you can run:
   ```bash
   npm run download-models
   ```

3. Create a `.env.local` file in the root directory with your API keys:
   ```
   REACT_APP_OPENAI_API_KEY=your_openai_api_key
   REACT_APP_FIREBASE_API_KEY=your_firebase_api_key
   REACT_APP_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
   REACT_APP_FIREBASE_PROJECT_ID=your_firebase_project_id
   REACT_APP_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
   REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
   REACT_APP_FIREBASE_APP_ID=your_firebase_app_id
   REACT_APP_FIREBASE_MEASUREMENT_ID=your_firebase_measurement_id
   ```

4. Start the development server:
   ```bash
   npm start
   ```

5. Open your browser to `http://localhost:3000`

### Face Detection Models

This application uses face-api.js for facial mood detection. The models are automatically downloaded during installation, but should be placed in the `public/models` directory with the following structure:

```
public/models/
├── face_expression_model-shard1
├── face_expression_model-weights_manifest.json
├── face_landmark_68_model-shard1
├── face_landmark_68_model-weights_manifest.json
├── face_recognition_model-shard1
├── face_recognition_model-shard2
├── face_recognition_model-weights_manifest.json
├── tiny_face_detector_model-shard1
└── tiny_face_detector_model-weights_manifest.json
```

If you need to download the models manually, you can:
1. Visit [face-api.js on GitHub](https://github.com/justadudewhohacks/face-api.js)
2. Download the weight files from the `/weights` directory
3. Place them in your project's `public/models` directory

## Usage

1. Allow camera and microphone access when prompted
2. Click the microphone button to start speaking
3. The system will detect your mood via facial expressions
4. The AI will respond with appropriate, empathetic guidance
5. Conversations are securely stored for later reference

## Project Structure

```
serenity-pod-mvp/
├── public/
│   ├── index.html
│   ├── models/           # face-api.js models
│   └── ...
├── src/
│   ├── components/       # React components
│   ├── pages/            # Page components
│   ├── services/         # API services
│   ├── styles/           # CSS styles
│   ├── App.js            # Main App component
│   └── ...
├── .env.local            # Environment variables
└── ...
```

## Future Enhancements

- Enhanced emotion detection with more nuanced categories
- Customizable 3D avatar with more expressive animations
- Voice tone analysis for deeper emotion understanding
- Guided meditation and breathing exercises
- Progress tracking and emotional state visualization

## Privacy and Security

SerenityPod prioritizes user privacy and data security:

- All data is encrypted at rest and in transit
- Voice and video processing happens locally when possible
- Clear data retention policies with user control
- Compliant with healthcare privacy standards

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [OpenAI](https://openai.com) for AI capabilities
- [face-api.js](https://github.com/justadudewhohacks/face-api.js) for facial recognition
- [React Webcam](https://github.com/mozmorris/react-webcam) for camera integration 