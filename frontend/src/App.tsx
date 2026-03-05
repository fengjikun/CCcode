import { Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'
import RequireAuth from './components/auth/RequireAuth'
import OntologyPage from './pages/OntologyPage'
import DevicesPage from './pages/DevicesPage'
import DiagnosisPage from './pages/DiagnosisPage'
import GraphPage from './pages/GraphPage'
import LoginPage from './pages/LoginPage'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={(
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        )}
      >
        <Route path="/ontology" element={<OntologyPage />} />
        <Route path="/devices" element={<DevicesPage />} />
        <Route path="/diagnosis" element={<DiagnosisPage />} />
        <Route path="/graph" element={<GraphPage />} />
        <Route path="/" element={<Navigate to="/ontology" replace />} />
      </Route>
    </Routes>
  )
}
