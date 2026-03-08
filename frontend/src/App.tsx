import { Routes, Route, Navigate, useParams } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'
import RequireAuth from './components/auth/RequireAuth'
import ErrorBoundary from './components/ErrorBoundary'
import LoginPage from './pages/LoginPage'
import NotFoundPage from './pages/NotFoundPage'

// L7 数字员工应用
import DigitalHumanListPage from './pages/DigitalHumanListPage'
import DeviceFaultMonitorPage from './pages/DeviceFaultMonitorPage'
import DICWorkerPage from './pages/platform/DICWorkerPage'

// L4 Co-worker 平台
import AgentStudioPage from './pages/platform/AgentStudioPage'
import AgentLogsPage from './pages/platform/AgentLogsPage'
import SkillsMarketPage from './pages/platform/SkillsMarketPage'

// L3 Deepology 本体
import OntologyOverviewPage from './pages/platform/OntologyOverviewPage'
import ProjectsPage from './pages/ProjectsPage'
import ProjectWorkspacePage from './pages/ProjectWorkspacePage'
import ProjectGraphPage from './pages/ProjectGraphPage'
import GraphPage from './pages/GraphPage'

// L2 数据转换
import TransformPage from './pages/platform/TransformPage'

// L5+L6 大模型 Lab
import ModelGatewayPage from './pages/platform/ModelGatewayPage'
import ModelTrainingPage from './pages/platform/ModelTrainingPage'
import TrainingDatasetsPage from './pages/platform/TrainingDatasetsPage'

// L1 数据源
import DataSourcePage from './pages/platform/DataSourcePage'

// 总览
import DashboardPage from './pages/platform/DashboardPage'

// 旧路由重定向辅助组件（保留路径参数）
function RedirectWithProjectId() {
  const { projectId } = useParams()
  return <Navigate to={`/ontology/projects/${projectId}`} replace />
}

function RedirectWithDigitalWorkerId() {
  const { id } = useParams()
  return <Navigate to={`/digital-worker/business/${id}`} replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={(
          <RequireAuth>
            <ErrorBoundary>
              <AppLayout />
            </ErrorBoundary>
          </RequireAuth>
        )}
      >
        {/* 总览 */}
        <Route path="/dashboard" element={<DashboardPage />} />

        {/* L7 数字员工应用 */}
        <Route path="/digital-worker/business" element={<DigitalHumanListPage />} />
        <Route path="/digital-worker/business/:id" element={<DeviceFaultMonitorPage />} />
        <Route path="/digital-worker/dic" element={<DICWorkerPage />} />

        {/* L4 Co-worker 平台 */}
        <Route path="/coworker/agents" element={<AgentStudioPage />} />
        <Route path="/coworker/agents/logs" element={<AgentLogsPage />} />
        <Route path="/coworker/skills" element={<SkillsMarketPage />} />

        {/* L3 Deepology 本体 */}
        <Route path="/ontology/overview" element={<OntologyOverviewPage />} />
        <Route path="/ontology/projects" element={<ProjectsPage />} />
        <Route path="/ontology/projects/:projectId" element={<ProjectWorkspacePage />} />
        <Route path="/ontology/projects/:projectId/graph" element={<ProjectGraphPage />} />
        <Route path="/ontology/graph" element={<GraphPage />} />

        {/* L2 数据转换 */}
        <Route path="/transform" element={<TransformPage />} />

        {/* L5+L6 大模型 Lab */}
        <Route path="/model-lab/gateway" element={<ModelGatewayPage />} />
        <Route path="/model-lab/training" element={<ModelTrainingPage />} />
        <Route path="/model-lab/datasets" element={<TrainingDatasetsPage />} />

        {/* L1 数据源 */}
        <Route path="/datasource" element={<DataSourcePage />} />

        {/* 兼容旧路由 */}
        <Route path="/projects" element={<Navigate to="/ontology/projects" replace />} />
        <Route path="/projects/:projectId" element={<RedirectWithProjectId />} />
        <Route path="/graph" element={<Navigate to="/ontology/graph" replace />} />
        <Route path="/ontology" element={<Navigate to="/ontology/projects" replace />} />
        <Route path="/digital-human" element={<Navigate to="/digital-worker/business" replace />} />
        <Route path="/digital-human/:id" element={<RedirectWithDigitalWorkerId />} />

        {/* 默认跳转 */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* 404 兜底 */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
