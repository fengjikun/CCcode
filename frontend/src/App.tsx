import { Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'
import RequireAuth from './components/auth/RequireAuth'
import OntologyPage from './pages/OntologyPage'
import DiagnosisPage from './pages/DiagnosisPage'
import GraphPage from './pages/GraphPage'
import LoginPage from './pages/LoginPage'
import ProjectsPage from './pages/ProjectsPage'
import ProjectWorkspacePage from './pages/ProjectWorkspacePage'
import ProjectGraphPage from './pages/ProjectGraphPage'

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
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/:projectId" element={<ProjectWorkspacePage />} />
        <Route path="/projects/:projectId/graph" element={<ProjectGraphPage />} />
        <Route path="/ontology" element={<OntologyPage />} />
        <Route path="/diagnosis" element={<DiagnosisPage />} />
        <Route path="/graph" element={<GraphPage />} />
        <Route path="/" element={<Navigate to="/projects" replace />} />
      </Route>
    </Routes>
  )
}
