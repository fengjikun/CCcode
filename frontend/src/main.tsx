import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import App from './App'
import './styles/global.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#4f46e5',
          colorInfo: '#4f46e5',
          colorSuccess: '#16a34a',
          colorWarning: '#d97706',
          colorError: '#dc2626',
          borderRadius: 8,
          fontFamily: '"Microsoft YaHei", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          fontSize: 14,
          colorBgLayout: '#f0f2f5',
          controlHeight: 36,
        },
        components: {
          Card: {
            borderRadiusLG: 10,
          },
          Button: {
            borderRadius: 8,
            controlHeight: 36,
          },
          Table: {
            borderRadius: 8,
            headerBg: '#fafafa',
          },
          Menu: {
            darkItemBg: 'transparent',
            darkSubMenuItemBg: 'rgba(0,0,0,0.15)',
            darkItemSelectedBg: 'rgba(79, 70, 229, 0.4)',
            darkItemHoverBg: 'rgba(255,255,255,0.06)',
            itemHeight: 40,
            iconSize: 16,
          },
          Input: {
            borderRadius: 8,
          },
          Select: {
            borderRadius: 8,
          },
          Modal: {
            borderRadiusLG: 12,
          },
          Tag: {
            borderRadiusSM: 4,
          },
        },
      }}
    >
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ConfigProvider>
  </React.StrictMode>,
)
