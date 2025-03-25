const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Create the models directory if it doesn't exist
const modelsDir = path.join(__dirname, '../public/models');
if (!fs.existsSync(modelsDir)) {
  fs.mkdirSync(modelsDir, { recursive: true });
  console.log('Created models directory');
}

// Base URL for the face-api.js models
const BASE_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';

// List of models to download
const models = [
  // TinyFaceDetector
  'tiny_face_detector_model-weights_manifest.json',
  'tiny_face_detector_model-shard1',
  
  // FaceLandmark68Net
  'face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model-shard1',
  
  // FaceRecognitionNet
  'face_recognition_model-weights_manifest.json',
  'face_recognition_model-shard1',
  'face_recognition_model-shard2',
  
  // FaceExpressionNet
  'face_expression_model-weights_manifest.json',
  'face_expression_model-shard1'
];

// Download a single file
async function downloadFile(url, destPath) {
  try {
    const response = await axios({
      url,
      method: 'GET',
      responseType: 'arraybuffer'
    });
    
    fs.writeFileSync(destPath, response.data);
    return true;
  } catch (error) {
    console.error(`Error downloading ${url}:`, error.message);
    return false;
  }
}

// Download all models
async function downloadModels() {
  console.log('Downloading face-api.js models...');
  
  let successCount = 0;
  
  for (const model of models) {
    const url = `${BASE_URL}/${model}`;
    const destPath = path.join(modelsDir, model);
    
    console.log(`Downloading ${model}...`);
    const success = await downloadFile(url, destPath);
    
    if (success) {
      successCount++;
      console.log(`Downloaded ${model}`);
    }
  }
  
  console.log(`Downloaded ${successCount}/${models.length} models`);
}

// Run the download
downloadModels()
  .then(() => console.log('All done!'))
  .catch(err => console.error('Error during download:', err)); 