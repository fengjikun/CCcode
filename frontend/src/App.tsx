import { Routes, Route, Navigate, useParams } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'
import RequireAuth from './components/auth/RequireAuth'
import ErrorBoundary from './components/ErrorBoundary'
import LoginPage from './pages/LoginPage'
import NotFoundPage from './pages/NotFoundPage'

// L7 数字员工应用
import DigitalHumanListPage from './pages/DigitalHumanListPage'
import DigitalWorkerConfigPage from './pages/DigitalWorkerConfigPage'
import DICWorkerConfigPage from './pages/DICWorkerConfigPage'
import DICWorkerPage from './pages/platform/DICWorkerPage'

// L4 workspace 工作台
import AgentStudioPage from './pages/platform/AgentStudioPage'
import AgentLogsPage from './pages/platform/AgentLogsPage'
import SkillsMarketPage from './pages/platform/SkillsMarketPage'

// L3 Deepology 本体
import ProjectsPage from './pages/ProjectsPage'
import ProjectWorkspacePage from './pages/ProjectWorkspacePage'
import ProjectGraphPage from './pages/ProjectGraphPage'
import GraphPage from './pages/GraphPage'

// L2 数据集准备
import TransformPage from './pages/platform/TransformPage'
import DataIngestionPage from './pages/platform/DataIngestionPage'

// L5+L6 大模型 Lab
import GatewayModelsPage from './pages/platform/GatewayModelsPage'
import GatewayApiKeysPage from './pages/platform/GatewayApiKeysPage'
import GatewayUsagePage from './pages/platform/GatewayUsagePage'
import ModelTrainingPage from './pages/platform/ModelTrainingPage'
import TrainingDatasetsPage from './pages/platform/TrainingDatasetsPage'
import ModelEvaluationPage from './pages/platform/ModelEvaluationPage'

// L1 数据源
import DataSourcePage from './pages/platform/DataSourcePage'
import BucketBrowserPage from './pages/platform/BucketBrowserPage'

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
        <Route path="/digital-worker/business/:id" element={<DigitalWorkerConfigPage />} />
        <Route path="/digital-worker/dic" element={<DICWorkerPage />} />
        <Route path="/digital-worker/dic/:id" element={<DICWorkerConfigPage />} />

        {/* L4 workspace 工作台 */}
        <Route path="/studio/agents" element={<AgentStudioPage />} />
        <Route path="/studio/agents/logs" element={<AgentLogsPage />} />
        <Route path="/studio/skills" element={<SkillsMarketPage />} />

        {/* L3 Deepology 本体 */}
        <Route path="/ontology/projects" element={<ProjectsPage />} />
        <Route path="/ontology/projects/:projectId" element={<ProjectWorkspacePage />} />
        <Route path="/ontology/projects/:projectId/graph" element={<ProjectGraphPage />} />
        <Route path="/ontology/graph" element={<GraphPage />} />

        {/* L2 数据集准备 */}
        <Route path="/data-platform/ingestion-jobs" element={<DataIngestionPage />} />
        <Route path="/transform" element={<TransformPage />} />

        {/* L5+L6 大模型 Lab */}
        <Route path="/model-lab/gateway" element={<Navigate to="/model-lab/gateway/models" replace />} />
        <Route path="/model-lab/gateway/models" element={<GatewayModelsPage />} />
        <Route path="/model-lab/gateway/api-keys" element={<GatewayApiKeysPage />} />
        <Route path="/model-lab/gateway/usage" element={<GatewayUsagePage />} />
        <Route path="/model-lab/training" element={<ModelTrainingPage />} />
        <Route path="/model-lab/evaluation" element={<ModelEvaluationPage />} />
        <Route path="/model-lab/datasets" element={<TrainingDatasetsPage />} />

        {/* L1 数据源 */}
        <Route path="/datasource" element={<DataSourcePage />} />
        <Route path="/datasource/:id/browser" element={<BucketBrowserPage />} />

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
