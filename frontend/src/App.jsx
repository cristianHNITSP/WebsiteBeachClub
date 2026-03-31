import { BrowserRouter, Routes, Route } from 'react-router-dom'
import WebsiteApp from './website/WebsiteApp'
import AdminApp from './admin/AdminApp'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin/*" element={<AdminApp />} />
        <Route path="/*" element={<WebsiteApp />} />
      </Routes>
    </BrowserRouter>
  )
}
