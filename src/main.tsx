import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'  // 여기서 우리가 수정한 App.tsx를 정확히 불러와야 합니다.
import './index.css'     // 만약 index.css가 없어서 에러 나면 이 줄만 지우세요.

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
