import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#1c2b21',
            color: '#e8f0ea',
            border: '1px solid #2a3d30',
            fontFamily: "'DM Sans', sans-serif",
            fontSize: '0.9rem',
          },
          success: { iconTheme: { primary: '#22c55e', secondary: '#0a0f0d' } },
          error:   { iconTheme: { primary: '#ef4444', secondary: '#0a0f0d' } },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
)
