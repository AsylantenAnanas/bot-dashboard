import React, { useState } from 'react';
import { Card, Form, Input, Button, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { fetchWithAuth } from '../utils/fetchWithAuth';

const LoginPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(
        '/login', 
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values)
        },
        navigate
      );
      if (res.status === 401) {
        message.error('Falsche Login-Daten');
      } else if (res.ok) {
        message.success('Eingeloggt');
        navigate('/dashboard');
      } else {
        message.error('Fehler beim Login');
      }
    } catch (err) {
      console.error(err);
      message.error('Netzwerkfehler');
    }
    setLoading(false);
  };

  return (
    <div style={{
      display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f0f2f5'
    }}>
      <Card title="Login" style={{ width: 300 }}>
        <Form onFinish={onFinish} layout="vertical">
          <Form.Item name="username" label="Benutzername" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="password" label="Passwort" rules={[{ required: true }]}>
            <Input.Password />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} block>
            Login
          </Button>
        </Form>
      </Card>
    </div>
  );
};

export default LoginPage;
