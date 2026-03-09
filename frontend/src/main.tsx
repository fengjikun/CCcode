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
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", "Microsoft YaHei", sans-serif',
          fontSize: 14,
          colorBgLayout: '#f5f6fa',
          colorBgContainer: '#ffffff',
          controlHeight: 36,
          colorBorder: '#e2e5f0',
          colorBorderSecondary: '#eef0f5',
          colorText: '#1a1f36',
          colorTextSecondary: '#5e6687',
          colorTextTertiary: '#9ca3c0',
          boxShadow: '0 4px 6px -1px rgba(30, 34, 90, 0.07), 0 2px 4px -1px rgba(30, 34, 90, 0.04)',
        },
        components: {
          Card: {
            borderRadiusLG: 12,
            boxShadowTertiary: '0 1px 3px rgba(30, 34, 90, 0.06), 0 1px 2px rgba(30, 34, 90, 0.04)',
          },
          Button: {
            borderRadius: 8,
            controlHeight: 36,
            primaryShadow: '0 2px 8px rgba(79, 70, 229, 0.25)',
          },
          Table: {
            borderRadius: 8,
            headerBg: '#f8f9fc',
            headerColor: '#5e6687',
            rowHoverBg: '#f8f9fc',
          },
          Menu: {
            darkItemBg: 'transparent',
            darkSubMenuItemBg: 'rgba(0,0,0,0.12)',
            darkItemSelectedBg: 'rgba(79, 70, 229, 0.35)',
            darkItemHoverBg: 'rgba(255,255,255,0.06)',
            itemHeight: 42,
            iconSize: 16,
            darkItemColor: '#94a3b8',
            darkItemSelectedColor: '#e0e7ff',
          },
          Input: {
            borderRadius: 8,
            activeBorderColor: '#4f46e5',
            hoverBorderColor: '#818cf8',
          },
          Select: {
            borderRadius: 8,
          },
          Modal: {
            borderRadiusLG: 16,
          },
          Tag: {
            borderRadiusSM: 6,
          },
          Tabs: {
            itemSelectedColor: '#4f46e5',
            inkBarColor: '#4f46e5',
          },
          Statistic: {
            titleFontSize: 13,
            contentFontSize: 24,
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
