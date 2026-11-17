import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/inter'
// Display fonts for the text tool (SIL Open Font License, latin subset only)
import '@fontsource/orbitron/latin-800.css'
import '@fontsource/russo-one/latin-400.css'
import '@fontsource/audiowide/latin-400.css'
import '@fontsource/black-ops-one/latin-400.css'
import '@fontsource/bebas-neue/latin-400.css'
import '@fontsource/anton/latin-400.css'
import '@fontsource/oswald/latin-700.css'
import '@fontsource/teko/latin-600.css'
import '@fontsource/press-start-2p/latin-400.css'
import './index.css'
import { App } from './app/App'
import { startHistory } from './state/history'
import { useStudio } from './state/studio'

/** Pick performance mode automatically on obviously low-power devices. */
function detectLowPower(): boolean {
  const nav = navigator as Navigator & { deviceMemory?: number }
  if ((nav.hardwareConcurrency ?? 8) <= 2) return true
  if (nav.deviceMemory !== undefined && nav.deviceMemory <= 2) return true
  try {
    const gl = document.createElement('canvas').getContext('webgl')
    const ext = gl?.getExtension('WEBGL_debug_renderer_info')
    const r = ext && gl ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : ''
    if (/swiftshader|llvmpipe|software/i.test(r)) return true
  } catch {
    /* ignore */
  }
  return false
}

function boot() {
  // Privacy: nothing is read from or written to browser storage. Work lives in
  // memory only; students keep it by downloading a .merchforge project file.
  if (detectLowPower()) {
    useStudio.getState().setQuality('low')
    useStudio.getState().toast('Performance mode is on for this computer. You can change it in Help.', 'info')
  }
  startHistory()
  window.addEventListener('beforeunload', (e) => {
    if (!useStudio.getState().dirty) return
    e.preventDefault()
    e.returnValue = ''
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
boot()
