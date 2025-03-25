import React, { useState } from 'react';
import { loginWithEmail, registerWithEmail } from '../services/firebase';
import '../styles/Login.css';

const Login = ({ onLoginSuccess, onClose }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
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