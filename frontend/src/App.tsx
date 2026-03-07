import { Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'
import RequireAuth from './components/auth/RequireAuth'
import LoginPage from './pages/LoginPage'
import ProjectsPage from './pages/ProjectsPage'
import ProjectWorkspacePage from './pages/ProjectWorkspacePage'
import ProjectGraphPage from './pages/ProjectGraphPage'
import DigitalHumanListPage from './pages/DigitalHumanListPage'
import DeviceFaultMonitorPage from './pages/DeviceFaultMonitorPage'

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
        <Route path="/ontology" element={<Navigate to="/projects" replace />} />
        <Route path="/digital-human" element={<DigitalHumanListPage />} />
        <Route path="/digital-human/:id" element={<DeviceFaultMonitorPage />} />
        <Route path="/" element={<Navigate to="/projects" replace />} />
      </Route>
    </Routes>
  )
}
