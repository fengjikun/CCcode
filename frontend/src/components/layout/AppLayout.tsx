import { useEffect, useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Button, Dropdown, Layout, Menu, Tooltip } from 'antd'
import type { MenuProps } from 'antd'
import {
  LogoutOutlined,
  UserOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  ApartmentOutlined,
  RobotOutlined,
  TeamOutlined,
  ExperimentOutlined,
  ApiOutlined,
  AppstoreOutlined,
  FileSearchOutlined,
  FolderOpenOutlined,
  SearchOutlined,
  SolutionOutlined,
  DesktopOutlined,
  ProjectOutlined,
  LineChartOutlined,
  CloudServerOutlined,
  SyncOutlined,
  SafetyCertificateOutlined,
  BellOutlined,
  SettingOutlined,
  QuestionCircleOutlined,
  RightOutlined,
} from '@ant-design/icons'
import { clearAuthSession, getAuthUser } from '../../auth/session'
import { MODEL_CENTER_PAGE_LABELS, MODEL_GATEWAY_PAGE_LABELS } from '../../types/modelCenter'

const { Sider, Content, Header } = Layout

type MenuItem = Required<MenuProps>['items'][number]

const menuItems: MenuItem[] = [
  {
    key: '/dashboard',
    icon: <DashboardOutlined />,
    label: '总览',
  },
  {
    key: 'digital-worker',
    icon: <TeamOutlined />,
    label: 'AI员工管理',
    children: [
      { key: '/digital-worker/business', icon: <SolutionOutlined />, label: '业务AI员工' },
      { key: '/digital-worker/dic', icon: <DesktopOutlined />, label: '技术AI员工' },
    ],
  },
  {
    key: 'studio',
    icon: <RobotOutlined />,
    label: 'Workspace 工作台',
    children: [
      { key: '/studio/agents', icon: <RobotOutlined />, label: '智能体编排' },
      { key: '/studio/skills', icon: <AppstoreOutlined />, label: 'Skills Hub' }
    ],
  },
  {
    key: 'ontology',
    icon: <ApartmentOutlined />,
    label: 'Deepology',
    children: [
      { key: '/ontology/projects', icon: <ProjectOutlined />, label: '本体管理' },
      { key: '/ontology/graph', icon: <SearchOutlined />, label: '图谱检索' },
    ],
  },
  {
    key: 'model-lab',
    icon: <ExperimentOutlined />,
    label: '模型中心',
    children: [
      {
        key: 'model-lab-gateway',
        icon: <ApiOutlined />,
        label: MODEL_CENTER_PAGE_LABELS.gateway,
        children: [
          { key: '/model-lab/gateway/models', icon: <CloudServerOutlined />, label: MODEL_GATEWAY_PAGE_LABELS.models },
          { key: '/model-lab/gateway/api-keys', icon: <SafetyCertificateOutlined />, label: MODEL_GATEWAY_PAGE_LABELS.apiKeys },
          { key: '/model-lab/gateway/usage', icon: <LineChartOutlined />, label: MODEL_GATEWAY_PAGE_LABELS.usage },
        ],
      },
      { key: '/model-lab/training', icon: <ExperimentOutlined />, label: MODEL_CENTER_PAGE_LABELS.training },
      { key: '/model-lab/evaluation', icon: <LineChartOutlined />, label: MODEL_CENTER_PAGE_LABELS.evaluation },
      { key: '/model-lab/datasets', icon: <FolderOpenOutlined />, label: MODEL_CENTER_PAGE_LABELS.datasets },
    ],
  },
  {
    key: 'data-platform',
    icon: <DatabaseOutlined />,
    label: '数据中心',
    children: [
      { key: '/datasource', icon: <DatabaseOutlined />, label: '数据源' },
      { key: '/data-platform/ingestion-jobs', icon: <SyncOutlined />, label: '数据接入任务' },
      { key: '/transform', icon: <FileSearchOutlined />, label: '数据集准备' },
    ],
  },
]

// Flat lookup: route path → [parent label, page title]
const PAGE_TITLES: Record<string, [string, string]> = {
  '/dashboard': ['', '总览'],
  '/digital-worker/business': ['数字员工应用', '业务数字员工空间'],
  '/digital-worker/dic': ['数字员工应用', '技术AI员工空间'],
  '/studio/agents': ['workspace 工作台', '智能体编排'],
  '/studio/agents/logs': ['workspace 工作台', '智能体日志'],
  '/studio/skills': ['workspace 工作台', 'Skills Hub'],
  '/ontology/projects': ['Deepology', '本体管理'],
  '/ontology/graph': ['Deepology', '图谱检索'],
  '/data-platform/ingestion-jobs': ['数据中心', '数据接入任务'],
  '/transform': ['数据中心', '数据集准备'],
  '/model-lab/gateway': ['大模型Lab', MODEL_CENTER_PAGE_LABELS.gateway],
  '/model-lab/gateway/models': [MODEL_CENTER_PAGE_LABELS.gateway, MODEL_GATEWAY_PAGE_LABELS.models],
  '/model-lab/gateway/api-keys': [MODEL_CENTER_PAGE_LABELS.gateway, MODEL_GATEWAY_PAGE_LABELS.apiKeys],
  '/model-lab/gateway/usage': [MODEL_CENTER_PAGE_LABELS.gateway, MODEL_GATEWAY_PAGE_LABELS.usage],
  '/model-lab/training': ['大模型Lab', MODEL_CENTER_PAGE_LABELS.training],
  '/model-lab/evaluation': ['大模型Lab', MODEL_CENTER_PAGE_LABELS.evaluation],
  '/model-lab/datasets': ['大模型Lab', MODEL_CENTER_PAGE_LABELS.datasets],
  '/datasource': ['数据中心', '数据源管理'],
}

function getAllLeafKeys(items: MenuItem[]): string[] {
  const keys: string[] = []
  for (const item of items) {
    if (item && 'children' in item && item.children) {
      keys.push(...getAllLeafKeys(item.children as MenuItem[]))
    } else if (item && 'key' in item) {
      keys.push(item.key as string)
    }
  }
  return keys
}

const allLeafKeys = getAllLeafKeys(menuItems)

function findSelectedKey(pathname: string): string {
  if (allLeafKeys.includes(pathname)) return pathname
  const sorted = [...allLeafKeys].sort((a, b) => b.length - a.length)
  for (const key of sorted) {
    if (pathname.startsWith(key + '/')) {
      return key
    }
  }
  return '/dashboard'
}

function findPageInfo(pathname: string): [string, string] {
  if (pathname.match(/^\/ontology\/projects\/.+\/graph$/)) return ['Deepology', '本体图谱展示']
  if (pathname.match(/^\/ontology\/projects\/.+$/)) return ['Deepology', '本体工作台']
  if (pathname.match(/^\/digital-worker\/business\/.+$/)) return ['数字员工应用', 'AI员工配置']
  if (pathname.match(/^\/digital-worker\/dic\/.+$/)) return ['数字员工应用', '技术AI员工配置']
  return PAGE_TITLES[pathname] || ['', '']
}

function findParentTrail(items: MenuItem[], target: string, parents: string[] = []): string[] {
  for (const item of items) {
    if (!item || !('key' in item)) continue
    const key = item.key as string
    if (key === target) return parents
    if ('children' in item && item.children) {
      const trail = findParentTrail(item.children as MenuItem[], target, [...parents, key])
      if (trail.length > 0) return trail
    }
  }
  return []
}

function findOpenKeys(pathname: string): string[] {
  const selected = findSelectedKey(pathname)
  return findParentTrail(menuItems, selected)
}

export default function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const currentUser = getAuthUser()
  const [collapsed, setCollapsed] = useState(false)
  const [openKeys, setOpenKeys] = useState<string[]>(findOpenKeys(location.pathname))

  useEffect(() => {
    const requiredKeys = findOpenKeys(location.pathname)
    setOpenKeys(prev => {
      const merged = new Set([...prev, ...requiredKeys])
      return [...merged]
    })
  }, [location.pathname])

  const selectedKey = findSelectedKey(location.pathname)
  const [parentLabel, pageTitle] = findPageInfo(location.pathname)

  const handleLogout = () => {
    clearAuthSession()
    navigate('/login', { replace: true })
  }

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '个人设置',
    },
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      danger: true,
      onClick: handleLogout,
    },
  ]

  const username = currentUser?.username || '用户'

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        theme="dark"
        width={240}
        collapsedWidth={68}
        style={{
          background: 'linear-gradient(195deg, #1a1642 0%, #0c1026 50%, #0a0e1f 100%)',
          overflow: 'auto',
          position: 'sticky',
          top: 0,
          height: '100vh',
          borderRight: '1px solid rgba(255,255,255,0.04)',
        }}
        trigger={null}
      >
        <div className="sidebar-wrapper">
          {/* Logo */}
          <div className="sidebar-logo">
            {!collapsed && (
              <>
                <div className="logo-icon">Dx</div>
                <span className="logo-text">DeepexiOS</span>
                <span className="sidebar-version">v2.0</span>
              </>
            )}
            {collapsed && (
              <div className="logo-icon" style={{ margin: 0 }}>Dx</div>
            )}
          </div>

          {/* Menu */}
          <Menu
            className="sidebar-menu"
            theme="dark"
            mode="inline"
            selectedKeys={[selectedKey]}
            openKeys={collapsed ? [] : openKeys}
            onOpenChange={setOpenKeys}
            items={menuItems}
            onClick={({ key }) => navigate(key)}
            style={{ background: 'transparent', borderRight: 'none', padding: '8px 0' }}
          />

          {/* Footer user area */}
          {!collapsed && (
            <div className="sidebar-footer">
              <Dropdown menu={{ items: userMenuItems }} trigger={['click']} placement="topRight">
                <div className="sidebar-footer-content">
                  <div className="sidebar-footer-avatar">
                    {username.charAt(0).toUpperCase()}
                  </div>
                  <div className="sidebar-footer-info">
                    <div className="sidebar-footer-name">{username}</div>
                    <div className="sidebar-footer-role">管理员</div>
                  </div>
                  <LogoutOutlined style={{ color: '#64748b', fontSize: 12 }} />
                </div>
              </Dropdown>
            </div>
          )}

          {collapsed && (
            <div style={{ padding: '12px 0', marginTop: 'auto', textAlign: 'center' }}>
              <Tooltip title={username} placement="right">
                <div className="sidebar-footer-avatar" style={{ margin: '0 auto', cursor: 'pointer' }}>
                  {username.charAt(0).toUpperCase()}
                </div>
              </Tooltip>
            </div>
          )}
        </div>
      </Sider>

      <Layout>
        <Header className="app-header">
          <div className="header-left">
            {/* Collapse toggle */}
            <Button
              type="text"
              size="small"
              onClick={() => setCollapsed(!collapsed)}
              style={{ color: '#5e6687', fontSize: 14, padding: '4px 8px' }}
            >
              {collapsed ? '☰' : '☰'}
            </Button>

            {/* Breadcrumb */}
            <div className="header-breadcrumb">
              {parentLabel && (
                <>
                  <span className="header-breadcrumb-item">{parentLabel}</span>
                  <RightOutlined className="header-breadcrumb-divider" />
                </>
              )}
              <span className="header-breadcrumb-current">{pageTitle}</span>
            </div>
          </div>

          <div className="header-right">
            <Tooltip title="帮助">
              <button className="header-icon-btn">
                <QuestionCircleOutlined />
              </button>
            </Tooltip>
            <Tooltip title="通知">
              <button className="header-icon-btn">
                <BellOutlined />
                <span className="badge-dot" />
              </button>
            </Tooltip>
            <Tooltip title="设置">
              <button className="header-icon-btn">
                <SettingOutlined />
              </button>
            </Tooltip>

            <Dropdown menu={{ items: userMenuItems }} trigger={['click']}>
              <button className="header-user-btn">
                <div className="header-user-avatar">
                  <UserOutlined />
                </div>
                <span className="header-user-name">{username}</span>
              </button>
            </Dropdown>
          </div>
        </Header>

        <Content className="app-content-area">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
