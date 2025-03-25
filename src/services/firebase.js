import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs,
  where,
  query,
  orderBy,
  connectFirestoreEmulator
} from 'firebase/firestore';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
};

console.log("Initializing Firebase with config:", 
  { ...firebaseConfig, apiKey: 'HIDDEN' });

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Initialize Firestore with memory-only caching for development
const db = getFirestore(app);

// Use in-memory mode only - no persistence 
// We'll implement local storage backup instead

// Auth services
export const loginWithEmail = async (email, password) => {
  try {
    return await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    console.error('Error logging in with email and password:', error);
    throw error;
  }
};

export const registerWithEmail = async (email, password) => {
  try {
    return await createUserWithEmailAndPassword(auth, email, password);
  } catch (error) {
    console.error('Error registering with email and password:', error);
    throw error;
  }
};

export const logoutUser = async () => {
  try {
    await signOut(auth);
    return true;
  } catch (error) {
    console.error('Error signing out:', error);
    return false;
  }
};

export const getCurrentUser = () => {
  return auth.currentUser;
};

export const onAuthChange = (callback) => {
  return onAuthStateChanged(auth, callback);
};

// Local backup instead of Firestore
const getLocalConversations = (userId) => {
  try {
    const storedConversations = localStorage.getItem(`conversations_${userId}`);
    return storedConversations ? JSON.parse(storedConversations) : [];
  } catch (error) {
    console.error('Error getting local conversations:', error);
    return [];
  }
};

const saveLocalConversation = (userId, conversation) => {
  try {
    const conversations = getLocalConversations(userId);
    conversations.unshift(conversation); // Add to beginning
    localStorage.setItem(`conversations_${userId}`, JSON.stringify(conversations));
    return true;
  } catch (error) {
    console.error('Error saving local conversation:', error);
    return false;
  }
};

// Firestore services for conversation history with local fallback
export const saveConversation = async (userId, transcript, aiResponse, mood) => {
  if (!userId) {
    console.warn('No user ID provided for saving conversation');
    return false;
  }
  
  const timestamp = new Date();
  const conversation = {
    userId,
    transcript,
    aiResponse,
    mood,
    timestamp,
    id: `local_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  };
  
  // Save locally regardless of Firestore success
  saveLocalConversation(userId, conversation);
  
  try {
    const conversationsRef = collection(db, 'conversations');
    
    // Try to save to Firestore but don't block on failure
    await addDoc(conversationsRef, {
      userId,
      transcript,
      aiResponse,
      mood,
      timestamp,
    });
    
    return true;
  } catch (error) {
    console.error('Error saving conversation to Firestore:', error);
    // We already saved locally, so this is still a partial success
    return true;
  }
};

export const getUserConversations = async (userId) => {
  if (!userId) {
    console.warn('No user ID provided for getting conversations');
    return [];
  }
  
  try {
    // Try to get from Firestore first
    const conversationsRef = collection(db, 'conversations');
    const q = query(
      conversationsRef, 
      where('userId', '==', userId),
      orderBy('timestamp', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const conversations = [];
    
    querySnapshot.forEach((doc) => {
      conversations.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    if (conversations.length > 0) {
      return conversations;
    }
    
    // Fall back to local storage if Firestore fails or returns empty
    return getLocalConversations(userId);
  } catch (error) {
    console.error('Error getting user conversations from Firestore:', error);
    // Fall back to local storage
    return getLocalConversations(userId);
  }
};

export { app, auth, db }; 