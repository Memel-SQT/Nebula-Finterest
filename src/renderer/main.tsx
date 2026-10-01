import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './styles.css';

// The ambient background (glow, aurora, stars...) is rendered by App itself, since it depends
// on the appearance settings.
const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
