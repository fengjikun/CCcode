import { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Button, Layout, Menu } from 'antd'
import {
  LogoutOutlined,
  UserOutlined,
  ProjectOutlined,
  RobotOutlined,
  SearchOutlined,
  ToolOutlined,
} from '@ant-design/icons'
import { clearAuthSession, getAuthUser } from '../../auth/session'

const { Sider, Content, Header } = Layout

const menuItems = [
  { key: '/projects', icon: <ProjectOutlined />, label: '本体管理' },
  { key: '/graph', icon: <SearchOutlined />, label: '图谱检索' },
  { key: '/diagnosis', icon: <ToolOutlined />, label: '故障诊断' },
  { key: '/digital-human', icon: <RobotOutlined />, label: '数字人' },
]

const PAGE_TITLES: Record<string, string> = {
  '/projects': '本体管理',
  '/graph': '图谱检索',
  '/diagnosis': '故障诊断',
  '/digital-human': '数字人管理',
}

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const currentUser = getAuthUser()
  const selectedMenu = menuItems.find(item =>
    location.pathname === item.key || location.pathname.startsWith(`${item.key}/`),
  )
  const pageTitle = location.pathname.startsWith('/projects/') && location.pathname.endsWith('/graph')
    ? '本体图谱展示'
    : location.pathname.startsWith('/projects/')
      ? '本体工作台'
    : (PAGE_TITLES[selectedMenu?.key || location.pathname] || '')

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
      >
        <div style={{
          height: 48,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontWeight: 700,
          fontSize: collapsed ? 16 : 14,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
        }}>
          {collapsed ? '⚙' : '⚙ FastData Foil'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedMenu?.key || location.pathname]}
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
