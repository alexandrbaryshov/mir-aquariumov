import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MotionConfig } from 'motion/react'
import App from './App.jsx'
import './fonts.css'
import './styles.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* reducedMotion="user": transforms and layout animations turn off for
        people who asked the OS for less motion; opacity fades stay. */}
    <MotionConfig reducedMotion="user">
      <App />
    </MotionConfig>
  </StrictMode>,
)
