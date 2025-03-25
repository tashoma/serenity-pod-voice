import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs,
  where,
  query,
  orderBy,
  connectFirestoreEmulator,
  enableIndexedDbPersistence,
  CACHE_SIZE_UNLIMITED,
  initializeFirestore,
  enableMultiTabIndexedDbPersistence
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

// Firestore connection state
let firestoreConnectionState = {
  isOnline: navigator.onLine,
  hasConnectionError: false,
  lastError: null,
  errorCount: 0,
  lastSuccessfulOperation: null
};

// Update connection state based on network status
window.addEventListener('online', () => {
  firestoreConnectionState.isOnline = true;
});

window.addEventListener('offline', () => {
  firestoreConnectionState.isOnline = false;
});

console.log("Initializing Firebase with config:", 
  { ...firebaseConfig, apiKey: 'HIDDEN' });

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Configure Google provider
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Initialize Firestore with optimized settings for offline use
const db = initializeFirestore(app, {
  cacheSizeBytes: CACHE_SIZE_UNLIMITED
});

// Try to enable offline persistence but don't block on failure
try {
  enableIndexedDbPersistence(db)
    .then(() => {
      console.log('Offline persistence enabled successfully');
    })
    .catch((err) => {
      if (err.code === 'failed-precondition') {
        console.warn('Multiple tabs open, persistence enabled in first tab only');
      } else if (err.code === 'unimplemented') {
        console.warn('Browser doesn\'t support IndexedDB persistence');
      } else {
        console.error('Error enabling offline persistence:', err);
      }
    });
} catch (error) {
  console.error('Error when setting up offline persistence:', error);
}

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

export const loginWithGoogle = async (useRedirect = false) => {
  try {
    if (useRedirect) {
      // Mobile-friendly approach using redirect
      await signInWithRedirect(auth, googleProvider);
      return null; // Will be handled by getRedirectResult later
    } else {
      // Desktop-friendly popup approach
      return await signInWithPopup(auth, googleProvider);
    }
  } catch (error) {
    console.error('Error signing in with Google:', error);
    throw error;
  }
};

export const getGoogleRedirectResult = async () => {
  try {
    return await getRedirectResult(auth);
  } catch (error) {
    console.error('Error getting redirect result:', error);
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

// Enhanced local storage for backup
const getLocalConversations = (userId) => {
  try {
    const storedConversations = localStorage.getItem(`conversations_${userId}`);
    if (storedConversations) {
      const parsedData = JSON.parse(storedConversations);
      // Ensure the data is valid by checking format
      if (Array.isArray(parsedData)) {
        return parsedData;
      }
    }
    return [];
  } catch (error) {
    console.error('Error getting local conversations:', error);
    return [];
  }
};

const saveLocalConversation = (userId, conversation) => {
  try {
    const conversations = getLocalConversations(userId);
    conversations.unshift(conversation); // Add to beginning
    
    // Limit to the most recent 100 conversations to prevent localStorage overflow
    const limitedConversations = conversations.slice(0, 100);
    
    localStorage.setItem(`conversations_${userId}`, JSON.stringify(limitedConversations));
    return true;
  } catch (error) {
    console.error('Error saving local conversation:', error);
    return false;
  }
};

// Check Firestore connection health
const isFirestoreHealthy = () => {
  // If we've had 3+ errors in succession and no successful operations since, assume unhealthy
  if (firestoreConnectionState.errorCount >= 3 && 
      (!firestoreConnectionState.lastSuccessfulOperation || 
       (Date.now() - firestoreConnectionState.lastSuccessfulOperation > 60000))) {
    return false;
  }
  
  // If we're offline, Firestore isn't healthy for writes
  if (!firestoreConnectionState.isOnline) {
    return false;
  }
  
  return true;
};

const recordFirestoreError = (error) => {
  firestoreConnectionState.hasConnectionError = true;
  firestoreConnectionState.lastError = error;
  firestoreConnectionState.errorCount++;
  console.warn(`Firestore error #${firestoreConnectionState.errorCount}:`, error);
};

const recordFirestoreSuccess = () => {
  firestoreConnectionState.hasConnectionError = false;
  firestoreConnectionState.lastSuccessfulOperation = Date.now();
  firestoreConnectionState.errorCount = 0;
};

// Sanitize data for Firestore - convert any unsupported types to compatible formats
const sanitizeForFirestore = (data) => {
  if (data === null || data === undefined) {
    return data;
  }
  
  // Handle Date objects
  if (data instanceof Date) {
    return data; // Firestore natively supports Date objects
  }
  
  // Handle arrays
  if (Array.isArray(data)) {
    return data.map(item => sanitizeForFirestore(item));
  }
  
  // Handle objects
  if (typeof data === 'object') {
    // Skip special Firestore objects
    if (typeof data.toDate === 'function' || typeof data.toMillis === 'function') {
      return data;
    }
    
    const result = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        // Recursively sanitize each property
        result[key] = sanitizeForFirestore(data[key]);
      }
    }
    return result;
  }
  
  // Return primitives as is
  return data;
};

// Improved Firestore services with better error handling and offline support
export const saveConversation = async (userId, transcript, aiResponse, mood, emotionData = {}) => {
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
    emotionData: sanitizeForFirestore(emotionData), // Sanitize before saving
    timestamp,
    id: `local_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  };
  
  // Always save locally first as a backup
  saveLocalConversation(userId, conversation);
  
  // Skip Firestore if we know it's not healthy
  if (!isFirestoreHealthy()) {
    console.warn('Skipping Firestore save due to connection issues, saved locally only');
    return true;
  }
  
  try {
    const conversationsRef = collection(db, 'conversations');
    
    // Create Firestore document without the local ID
    const firestoreDoc = { ...conversation };
    delete firestoreDoc.id;
    
    // Try to save to Firestore with timeout
    const savePromise = addDoc(conversationsRef, firestoreDoc);
    
    // Set a timeout to prevent waiting too long
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Firestore save timeout')), 10000);
    });
    
    await Promise.race([savePromise, timeoutPromise]);
    
    // Record successful operation
    recordFirestoreSuccess();
    return true;
  } catch (error) {
    // Record the error
    recordFirestoreError(error);
    console.error('Error saving conversation to Firestore:', error);
    // Already saved locally, so this is still a partial success
    return true;
  }
};

export const getUserConversations = async (userId) => {
  if (!userId) {
    console.warn('No user ID provided for getting conversations');
    return [];
  }
  
  // If we know Firestore is unhealthy, skip trying it
  if (!isFirestoreHealthy()) {
    console.warn('Skipping Firestore query due to connection issues, using local data only');
    return getLocalConversations(userId);
  }
  
  try {
    // Try to get from Firestore first
    const conversationsRef = collection(db, 'conversations');
    const q = query(
      conversationsRef, 
      where('userId', '==', userId),
      orderBy('timestamp', 'desc')
    );
    
    // Set a timeout for Firestore query
    const queryPromise = getDocs(q);
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Firestore query timeout')), 10000);
    });
    
    const querySnapshot = await Promise.race([queryPromise, timeoutPromise]);
    const conversations = [];
    
    querySnapshot.forEach((doc) => {
      conversations.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // Record successful operation
    recordFirestoreSuccess();
    
    if (conversations.length > 0) {
      // Update local storage with cloud data for offline access
      conversations.forEach(convo => {
        saveLocalConversation(userId, convo);
      });
      return conversations;
    }
    
    // Fall back to local storage if Firestore returns empty
    return getLocalConversations(userId);
  } catch (error) {
    // Record the error
    recordFirestoreError(error);
    console.error('Error getting user conversations from Firestore:', error);
    // Fall back to local storage
    return getLocalConversations(userId);
  }
};

// Export connection state for monitoring
export const getFirestoreConnectionState = () => {
  return { ...firestoreConnectionState };
};

export { app, auth, db }; 