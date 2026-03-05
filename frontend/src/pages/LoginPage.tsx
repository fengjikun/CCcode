import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Button, Card, Form, Input, Typography } from 'antd'
import { login } from '../api/auth'
import { isAuthenticated, setAuthSession } from '../auth/session'
import type { LoginPayload } from '../types/auth'

const { Title, Text } = Typography

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  if (isAuthenticated()) {
    return <Navigate to="/ontology" replace />
  }

  const onFinish = async (values: LoginPayload) => {
    setLoading(true)
    try {
      const result = await login(values)
      setAuthSession(result.accessToken, result.user)
      navigate('/ontology', { replace: true })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        background: 'linear-gradient(135deg, #f8fafc 0%, #dbeafe 100%)',
      }}
    >
      <Card
        style={{
          width: '100%',
          maxWidth: 420,
          borderRadius: 14,
          boxShadow: '0 16px 48px rgba(15, 23, 42, 0.12)',
        }}
      >
        <Title level={3} style={{ marginBottom: 8 }}>
          系统登录
        </Title>
        <Text type="secondary">请输入账号和密码继续访问系统</Text>
        <Form<LoginPayload>
          layout="vertical"
          autoComplete="off"
          style={{ marginTop: 24 }}
          onFinish={onFinish}
        >
          <Form.Item name="username" label="账号" rules={[{ required: true, message: '请输入账号' }]}>
            <Input size="large" placeholder="请输入账号" />
          </Form.Item>
          <Form.Item name="password" label="密码" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password size="large" placeholder="请输入密码" />
          </Form.Item>
          <Button type="primary" htmlType="submit" size="large" block loading={loading}>
            登录
          </Button>
        </Form>
      </Card>
    </div>
  )
}
