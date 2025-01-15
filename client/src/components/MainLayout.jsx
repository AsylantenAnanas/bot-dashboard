/***********************************************
 * client/src/components/MainLayout.jsx
 ***********************************************/
import React from 'react'
import { Layout, Menu, Button } from 'antd'
import { useNavigate } from 'react-router-dom'

const { Header, Content } = Layout

const MainLayout = ({ children, defaultKey = 'dashboard' }) => {
  const navigate = useNavigate()

  const logout = async () => {
    await fetch('https://bot-dashboard.meinserver.dev/api/logout', {
      method: 'POST',
      credentials: 'include'
    })
    navigate('/login')
  }

  // Navbar-Items
  const items = [
    { key: 'dashboard', label: 'Dashboard', onClick: () => navigate('/dashboard') },
    { key: 'accounts', label: 'Accounts', onClick: () => navigate('/accounts') },
    /*{ key: 'servers', label: 'Servers', onClick: () => navigate('/servers') },*/
    { key: 'clients', label: 'Clients', onClick: () => navigate('/clients') }
  ]

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header className="main-header">
        {/* Titel */}
        <div className="title">
          Bot Dashboard
        </div>

        {/* Menü-Wrapper */}
        <div className="menu-wrapper">
          <Menu
            mode="horizontal"
            defaultSelectedKeys={[defaultKey]}
            items={items}
            className="main-menu"
          />
        </div>

        {/* Logout-Button */}
        <Button className="logout-button" onClick={logout}>
          Logout
        </Button>
      </Header>

      <Content style={{ margin: '16px' }}>
        {children}
      </Content>
    </Layout>
  )
}

export default MainLayout
