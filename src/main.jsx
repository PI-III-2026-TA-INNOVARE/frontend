import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import './styles/index.scss'

const storedTheme = window.localStorage.getItem('pdconnect.theme')
document.documentElement.dataset.theme = storedTheme === 'dark' ? 'dark' : 'light'
document.documentElement.style.colorScheme = document.documentElement.dataset.theme

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>
)
