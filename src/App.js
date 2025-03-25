import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import Home from './pages/Home';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary showReset showDetails={process.env.NODE_ENV === 'development'}>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={<Home />} />
          </Routes>
        </div>
      </Router>
    </ErrorBoundary>
  );
}

export default App; 