import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Override default Date formatting to MM-DD-YYYY for the entire platform
Date.prototype.toLocaleDateString = function (
  _locales?: Intl.LocalesArgument,
  _options?: Intl.DateTimeFormatOptions
) {
  const month = String(this.getMonth() + 1).padStart(2, '0')
  const day = String(this.getDate()).padStart(2, '0')
  const year = this.getFullYear()
  return `${month}-${day}-${year}`
}

Date.prototype.toLocaleString = function (
  _locales?: Intl.LocalesArgument,
  _options?: Intl.DateTimeFormatOptions
) {
  const month = String(this.getMonth() + 1).padStart(2, '0')
  const day = String(this.getDate()).padStart(2, '0')
  const year = this.getFullYear()
  const hours = String(this.getHours()).padStart(2, '0')
  const minutes = String(this.getMinutes()).padStart(2, '0')
  const seconds = String(this.getSeconds()).padStart(2, '0')
  return `${month}-${day}-${year} ${hours}:${minutes}:${seconds}`
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
