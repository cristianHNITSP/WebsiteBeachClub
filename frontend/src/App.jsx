import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import WebsiteApp from './website/WebsiteApp'
import AdminApp from './admin/AdminApp'

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/admin/*" element={<AdminApp />} />
          <Route path="/*"       element={<WebsiteApp />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}
