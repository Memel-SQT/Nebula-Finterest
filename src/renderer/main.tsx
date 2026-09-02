import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './styles.css';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    {/* Ambient Nebula glow, painted behind every screen (splash, gate, dashboard). */}
    <div className="bg-glow" aria-hidden="true" />
    <App />
  </React.StrictMode>,
);
