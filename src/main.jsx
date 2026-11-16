import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import I18nProvider from './i18n/I18nProvider.jsx'
import { initialLocale, loadMessages } from './i18n/index.js'
import './styles.css'

// The first render waits for the interface language so text never flashes in English.
loadMessages(initialLocale()).then((initial) => {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <I18nProvider initial={initial}>
        <App />
      </I18nProvider>
    </StrictMode>,
  )
})
