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
  enableIndexedDbPersistence,
  CACHE_SIZE_UNLIMITED,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Initialize Firestore with better offline persistence settings
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

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

// Firestore services for conversation history
export const saveConversation = async (userId, transcript, aiResponse, mood) => {
  try {
    if (!userId) {
      console.warn('No user ID provided for saving conversation');
      return false;
    }
    
    const conversationsRef = collection(db, 'conversations');
    const timestamp = new Date();
    
    await addDoc(conversationsRef, {
      userId,
      transcript,
      aiResponse,
      mood,
      timestamp,
      // Encrypt sensitive data in production
    });
    
    return true;
  } catch (error) {
    console.error('Error saving conversation:', error);
    return false;
  }
};

export const getUserConversations = async (userId) => {
  try {
    if (!userId) {
      console.warn('No user ID provided for getting conversations');
      return [];
    }
    
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
    
    return conversations;
  } catch (error) {
    console.error('Error getting user conversations:', error);
    return [];
  }
};

export { app, auth, db }; 