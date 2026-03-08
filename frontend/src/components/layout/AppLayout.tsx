import { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Button, Layout, Menu } from 'antd'
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
    label: '数字员工应用',
    children: [
      { key: '/digital-worker/business', label: '业务数字员工' },
      { key: '/digital-worker/dic', label: 'DIC 数字员工' },
    ],
  },
  {
    key: 'coworker',
    icon: <RobotOutlined />,
    label: 'Co-worker平台',
    children: [
      { key: '/coworker/agents', icon: <RobotOutlined />, label: '智能体编排' },
      { key: '/coworker/agents/logs', icon: <FileSearchOutlined />, label: '智能体日志' },
      { key: '/coworker/skills', icon: <AppstoreOutlined />, label: 'Skills 广场' },
    ],
  },
  {
    key: 'ontology',
    icon: <ApartmentOutlined />,
    label: 'Deepology',
    children: [
      { key: '/ontology/overview', label: '本体概览' },
      { key: '/ontology/projects', label: '本体管理' },
      { key: '/ontology/graph', icon: <SearchOutlined />, label: '图谱检索' },
    ],
  },
  {
    key: '/transform',
    icon: <SwapOutlined />,
    label: '数据转换',
  },
  {
    key: 'model-lab',
    icon: <ExperimentOutlined />,
    label: '大模型Lab',
    children: [
      { key: '/model-lab/gateway', icon: <ApiOutlined />, label: '模型网关' },
      { key: '/model-lab/training', icon: <ExperimentOutlined />, label: '模型训练' },
      { key: '/model-lab/datasets', icon: <FolderOpenOutlined />, label: '训练数据集' },
    ],
  },
  {
    key: '/datasource',
    icon: <DatabaseOutlined />,
    label: '数据源',
  },
]

// Flat lookup: route path → page title
const PAGE_TITLES: Record<string, string> = {
  '/dashboard': '总览',
  '/digital-worker/business': '业务数字员工空间',
  '/digital-worker/dic': 'DIC 数字员工空间',
  '/coworker/agents': '智能体编排',
  '/coworker/agents/logs': '智能体日志',
  '/coworker/skills': 'Skills 广场',
  '/ontology/overview': '本体概览',
  '/ontology/projects': '本体管理',
  '/ontology/graph': '图谱检索',
  '/transform': '数据转换',
  '/model-lab/gateway': '模型网关',
  '/model-lab/training': '模型训练',
  '/model-lab/datasets': '训练数据集',
  '/datasource': '数据源管理',
}

// Collect all leaf keys for selectedKeys matching
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
  // Exact match first
  if (allLeafKeys.includes(pathname)) return pathname
  // Prefix match (longest first)
  const sorted = [...allLeafKeys].sort((a, b) => b.length - a.length)
  for (const key of sorted) {
    if (pathname.startsWith(key + '/') || pathname.startsWith(key)) {
      return key
    }
  }
  return '/dashboard'
}

function findPageTitle(pathname: string): string {
  // Special sub-pages
  if (pathname.match(/^\/ontology\/projects\/.+\/graph$/)) return '本体图谱展示'
  if (pathname.match(/^\/ontology\/projects\/.+$/)) return '本体工作台'
  if (pathname.match(/^\/digital-worker\/business\/.+$/)) return '数字员工对话'
  // Direct match
  return PAGE_TITLES[pathname] || ''
}

// Auto-open parent submenus for current route
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

  const selectedKey = findSelectedKey(location.pathname)
  const pageTitle = findPageTitle(location.pathname)

  const handleLogout = () => {
    clearAuthSession()
    navigate('/login', { replace: true })
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        theme="dark"
        width={220}
      >
        <div style={{
          height: 48,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          fontSize: collapsed ? 16 : 15,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          letterSpacing: collapsed ? 0 : 1,
          background: 'linear-gradient(90deg, #4096ff, #36cfc9)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          {collapsed ? 'D' : 'DeepexiOS'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          openKeys={collapsed ? [] : openKeys}
          onOpenChange={setOpenKeys}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header style={{
          background: '#fff',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #f0f0f0',
          height: 48,
        }}>
          <span style={{ fontWeight: 600, fontSize: 16 }}>
            {pageTitle}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ color: '#595959', fontSize: 13 }}>
              <UserOutlined style={{ marginRight: 6 }} />
              {currentUser?.username || '未知用户'}
            </span>
            <Button type="text" icon={<LogoutOutlined />} onClick={handleLogout}>
              退出
            </Button>
          </div>
        </Header>
        <Content style={{ margin: 16, minHeight: 280 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
