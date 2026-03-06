import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx' // <--- 여기서 App을 제대로 불러오는지 확인!
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
