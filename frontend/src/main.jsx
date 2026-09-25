import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './exam.css';
import './home.css';
import './history.css';
import './notes.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
