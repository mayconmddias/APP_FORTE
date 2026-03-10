
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
console.log("React: Checking root element...", rootElement);

if (!rootElement) {
  console.error("🚨 ERRO CRÍTICO REACT: Elemento 'root' não encontrado no DOM!");
  throw new Error("Could not find root element to mount to");
}

console.log("APP FORTE: Starting render...");
const root = ReactDOM.createRoot(rootElement);
root.render(
  <App />
);
