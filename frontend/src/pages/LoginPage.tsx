import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Button, Card, Form, Input, Typography } from 'antd'
import { LockOutlined, UserOutlined } from '@ant-design/icons'
import { login } from '../api/auth'
import { isAuthenticated, setAuthSession } from '../auth/session'
import type { LoginPayload } from '../types/auth'

const { Text } = Typography

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  if (isAuthenticated()) {
    return <Navigate to="/dashboard" replace />
  }

  const onFinish = async (values: LoginPayload) => {
    setLoading(true)
    try {
      const result = await login(values)
      setAuthSession(result.accessToken, result.user)
      navigate('/dashboard', { replace: true })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-bg">
      <Card className="login-card">
        <div className="login-brand">
          <div className="brand-name">DeepexiOS</div>
          <div className="brand-sub">AI 级企业操作系统</div>
        </div>

        <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginBottom: 24 }}>
          请输入账号和密码继续访问系统
        </Text>

        <Form<LoginPayload>
          layout="vertical"
          autoComplete="off"
          onFinish={onFinish}
        >
          <Form.Item name="username" rules={[{ required: true, message: '请输入账号' }]}>
            <Input
              size="large"
              prefix={<UserOutlined style={{ color: '#94a3b8' }} />}
              placeholder="账号"
            />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password
              size="large"
              prefix={<LockOutlined style={{ color: '#94a3b8' }} />}
              placeholder="密码"
            />
          </Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            size="large"
            block
            loading={loading}
            style={{ height: 44, fontWeight: 600, fontSize: 15 }}
          >
            登录
          </Button>
        </Form>
      </Card>
    </div>
  )
}
