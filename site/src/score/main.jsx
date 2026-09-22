import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './score.css'
import ScoreApp from './ScoreApp.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ScoreApp />
  </StrictMode>,
)
