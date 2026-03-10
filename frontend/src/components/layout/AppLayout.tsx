import { useEffect, useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Button, Dropdown, Layout, Menu, Tooltip } from 'antd'
import type { MenuProps } from 'antd'
import {
  LogoutOutlined,
  UserOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  SwapOutlined,
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
  EyeOutlined,
  ProjectOutlined,
  LineChartOutlined,
  BellOutlined,
  SettingOutlined,
  QuestionCircleOutlined,
  RightOutlined,
} from '@ant-design/icons'
import { clearAuthSession, getAuthUser } from '../../auth/session'

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
    label: 'AI员工',
    children: [
      { key: '/digital-worker/business', icon: <SolutionOutlined />, label: '业务数字员工' },
      { key: '/digital-worker/dic', icon: <DesktopOutlined />, label: 'FDE 数字员工' },
    ],
  },
  {
    key: 'coworker',
    icon: <RobotOutlined />,
    label: 'workspace 工作台',
    children: [
      { key: '/coworker/skills', icon: <AppstoreOutlined />, label: 'Skills Hub' },
      { key: '/coworker/agents', icon: <RobotOutlined />, label: '智能体编排' },
      { key: '/coworker/agents/logs', icon: <FileSearchOutlined />, label: '智能体日志' },
    ],
  },
  {
    key: 'ontology',
    icon: <ApartmentOutlined />,
    label: 'Deepology',
    children: [
      { key: '/ontology/overview', icon: <EyeOutlined />, label: '本体概览' },
      { key: '/ontology/projects', icon: <ProjectOutlined />, label: '本体管理' },
      { key: '/ontology/graph', icon: <SearchOutlined />, label: '图谱检索' },
    ],
  },
  {
    key: 'model-lab',
    icon: <ExperimentOutlined />,
    label: '模型中心',
    children: [
      { key: '/model-lab/gateway', icon: <ApiOutlined />, label: '模型网关' },
      { key: '/model-lab/training', icon: <ExperimentOutlined />, label: '模型训练' },
      { key: '/model-lab/evaluation', icon: <LineChartOutlined />, label: '模型评估' },
      { key: '/model-lab/datasets', icon: <FolderOpenOutlined />, label: '训练数据集' },
    ],
  },
  {
    key: '/transform',
    icon: <SwapOutlined />,
    label: '数据转换',
  },
  {
    key: '/datasource',
    icon: <DatabaseOutlined />,
    label: '数据源',
  },
]

// Flat lookup: route path → [parent label, page title]
const PAGE_TITLES: Record<string, [string, string]> = {
  '/dashboard': ['', '总览'],
  '/digital-worker/business': ['数字员工应用', '业务数字员工空间'],
  '/digital-worker/dic': ['数字员工应用', 'FDE 数字员工空间'],
  '/coworker/agents': ['Co-worker平台', '智能体编排'],
  '/coworker/agents/logs': ['Co-worker平台', '智能体日志'],
  '/coworker/skills': ['Co-worker平台', 'Skills Hub'],
  '/ontology/overview': ['Deepology', '本体概览'],
  '/ontology/projects': ['Deepology', '本体管理'],
  '/ontology/graph': ['Deepology', '图谱检索'],
  '/transform': ['', '数据转换'],
  '/model-lab/gateway': ['大模型Lab', '模型网关'],
  '/model-lab/training': ['大模型Lab', '模型训练'],
  '/model-lab/evaluation': ['大模型Lab', '模型评估'],
  '/model-lab/datasets': ['大模型Lab', '训练数据集'],
  '/datasource': ['', '数据源管理'],
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
  if (pathname.match(/^\/digital-worker\/business\/.+$/)) return ['数字员工应用', '数字员工对话']
  return PAGE_TITLES[pathname] || ['', '']
}

function findOpenKeys(pathname: string): string[] {
  const selected = findSelectedKey(pathname)
  const keys: string[] = []
  for (const item of menuItems) {
    if (item && 'children' in item && item.children) {
      for (const child of item.children as MenuItem[]) {
        if (child && 'key' in child && child.key === selected) {
          keys.push(item.key as string)
        }
      }
    }
  }
  return keys
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
