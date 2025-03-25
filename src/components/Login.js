import React, { useState, useEffect } from 'react';
import { loginWithEmail, registerWithEmail, loginWithGoogle, getGoogleRedirectResult } from '../services/firebase';
import '../styles/Login.css';

const Login = ({ onLoginSuccess, onClose }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Check for Google redirect result on component mount
  useEffect(() => {
    const checkRedirectResult = async () => {
      try {
        const result = await getGoogleRedirectResult();
        if (result?.user) {
          onLoginSuccess(result.user);
        }
      } catch (error) {
        console.error('Error with Google redirect login:', error);
        setError('Google sign-in failed. Please try again.');
      }
    };
    
    checkRedirectResult();
  }, [onLoginSuccess]);
  
  const handleAuth = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      let userCredential;
      
      if (isRegistering) {
        userCredential = await registerWithEmail(email, password);
      } else {
        userCredential = await loginWithEmail(email, password);
      }
      
      if (userCredential.user) {
        onLoginSuccess(userCredential.user);
      }
    } catch (error) {
      console.error('Authentication error:', error);
      
      // Handle specific error codes
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        setError('Invalid email or password');
      } else if (error.code === 'auth/email-already-in-use') {
        setError('This email is already registered');
      } else if (error.code === 'auth/weak-password') {
        setError('Password should be at least 6 characters');
      } else {
        setError(error.message || 'An error occurred during authentication');
      }
    } finally {
      setLoading(false);
    }
  };
  
  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Detect if on mobile for better UX
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );
      
      const result = await loginWithGoogle(isMobile);
      if (result?.user) {
        onLoginSuccess(result.user);
      }
      // If using redirect (mobile), the result will be handled in the useEffect
    } catch (error) {
      console.error('Google sign-in error:', error);
      
      if (error.code === 'auth/popup-closed-by-user') {
        setError('Sign-in cancelled. Please try again.');
      } else if (error.code === 'auth/cancelled-popup-request') {
        // This is expected when a new popup is opened before the old one is closed
        console.log('Popup request cancelled, likely due to multiple clicks');
      } else {
        setError('Google sign-in failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };
  
  const toggleMode = () => {
    setIsRegistering(!isRegistering);
    setError('');
  };
  
  return (
    <div className="login-overlay">
      <div className="login-modal card">
        <button className="close-button" onClick={onClose}>×</button>
        
        <h2>{isRegistering ? 'Create an Account' : 'Login to SerenityPod'}</h2>
        
        <form onSubmit={handleAuth}>
          {error && <div className="error-message">{error}</div>}
          
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>
          
          <button
            type="submit"
            className="btn login-button"
            disabled={loading}
          >
            {loading 
              ? 'Processing...' 
              : isRegistering 
                ? 'Create Account' 
                : 'Login'
            }
          </button>
        </form>
        
        <div className="auth-separator">
          <span>OR</span>
        </div>
        
        <button
          type="button"
          className="btn google-signin-button"
          onClick={handleGoogleSignIn}
          disabled={loading}
        >
          <img 
            src="/google-icon.svg" 
            alt="Google logo" 
            className="google-icon" 
          />
          Sign in with Google
        </button>
        
        <div className="auth-toggle">
          <p>
            {isRegistering 
              ? 'Already have an account?' 
              : 'Don\'t have an account?'
            }
            <button 
              className="toggle-button" 
              onClick={toggleMode}
              type="button"
            >
              {isRegistering ? 'Login' : 'Register'}
            </button>
          </p>
        </div>
        
        <div className="privacy-note">
          <p>By using SerenityPod, you agree to our Privacy Policy and Terms of Service. Your conversations will be encrypted and stored securely.</p>
        </div>
      </div>
    </div>
  );
};

export default Login; 