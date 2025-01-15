import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/MainLayout';
import {
  Button, Card, List, Modal, Form, Input, message, InputNumber, Row, Col, Popconfirm
} from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { fetchWithAuth } from '../utils/fetchWithAuth';

const ServersPage = () => {
  const navigate = useNavigate();
  const [servers, setServers] = useState([]);
  const [createVisible, setCreateVisible] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [editingServer, setEditingServer] = useState(null);

  const loadServers = async () => {
    try {
      const res = await fetchWithAuth('/servers', {}, navigate);
      if (res.ok) {
        const data = await res.json();
        setServers(data);
      }
    } catch (err) {
      console.error(err);
      message.error('Fehler beim Laden der Server-Liste.');
    }
  };

  useEffect(() => {
    loadServers();
  }, []);

  const openCreateModal = () => {
    createForm.resetFields();
    setCreateVisible(true);
  };
  const closeCreateModal = () => setCreateVisible(false);

  const openEditModal = (srv) => {
    setEditingServer(srv);
    editForm.setFieldsValue(srv);
    setEditVisible(true);
  };
  const closeEditModal = () => {
    setEditVisible(false);
    setEditingServer(null);
  };

  const onCreateFinish = async (values) => {
    try {
      const res = await fetchWithAuth('/servers', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          message.success('Server angelegt.');
          loadServers();
          closeCreateModal();
        } else {
          message.error(data.error || 'Fehler beim Anlegen.');
        }
      }
    } catch (err) {
      console.error(err);
      message.error('Netzwerkfehler beim Anlegen.');
    }
  };

  const onEditFinish = async (values) => {
    if (!editingServer) return;
    try {
      const res = await fetchWithAuth(
        `/servers/${editingServer.id}`, 
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values)
        },
        navigate
      );
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          message.success('Server aktualisiert.');
          loadServers();
          closeEditModal();
        } else {
          message.error(data.error || 'Fehler beim Aktualisieren.');
        }
      }
    } catch (err) {
      console.error(err);
      message.error('Netzwerkfehler beim Aktualisieren.');
    }
  };

  const deleteServer = async (serverId) => {
    try {
      const res = await fetchWithAuth(`/servers/${serverId}/delete`, {
        method: 'POST',
        credentials: 'include'
      }, navigate);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          message.success('Server gelöscht.');
          loadServers();
        } else {
          message.error(data.error || 'Fehler beim Löschen.');
        }
      }
    } catch (err) {
      console.error(err);
      message.error('Netzwerkfehler beim Löschen.');
    }
  };

  return (
    <MainLayout defaultKey="servers">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>Servers</h1>
        <Button type="primary" onClick={openCreateModal}>
          Neuen Server anlegen
        </Button>
      </div>
      <div style={{ marginTop: 16 }}>
        <List
          grid={{
            gutter: 16,
            xs: 1,
            sm: 2,
            md: 3,
            lg: 4,
            xl: 4,
          }}
          dataSource={servers}
          renderItem={(item) => (
            <List.Item>
              <Card
                title={item.name}
                actions={[
                  <EditOutlined style={{ color: 'blue' }} key="edit" onClick={() => openEditModal(item)} />,
                  <Popconfirm
                    title="Bist du sicher, dass du diese Serverkonfiguration löschen möchtest?"
                    onConfirm={() => deleteServer(item.id)}
                    okText="Ja"
                    cancelText="Nein"
                  >
                    <DeleteOutlined style={{ color: 'red' }} key="delete" />
                  </Popconfirm>,
                ]}
              >
                <p><b>Hostname:</b> {item.hostname}</p>
                <p><b>Version:</b> {item.version}</p>
                <p><b>NPC:</b> {item.npc_name} @ ({item.npc_x}, {item.npc_y}, {item.npc_z})</p>
              </Card>
            </List.Item>
          )}
        />
      </div>

      <Modal
        title="Server anlegen"
        open={createVisible}
        onCancel={closeCreateModal}
        footer={null}
      >
        <Form form={createForm} onFinish={onCreateFinish} layout="vertical">
          <Form.Item name="name" label="Server Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="hostname" label="Hostname" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="version" label="Version">
            <Input placeholder="z.B. 1.20.4" />
          </Form.Item>
          <Form.Item name="npc_name" label="NPC Name">
            <Input placeholder="z.B. modern_server" />
          </Form.Item>
          <Form.Item label="NPC Koordinaten (X, Y, Z)">
            <Row gutter={8}>
              <Col span={8}>
                <Form.Item name="npc_x" noStyle initialValue={0}>
                  <InputNumber style={{ width: '100%' }} placeholder="X" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="npc_y" noStyle initialValue={0}>
                  <InputNumber style={{ width: '100%' }} placeholder="Y" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="npc_z" noStyle initialValue={0}>
                  <InputNumber style={{ width: '100%' }} placeholder="Z" />
                </Form.Item>
              </Col>
            </Row>
          </Form.Item>
          <Button type="primary" htmlType="submit">Speichern</Button>
        </Form>
      </Modal>

      <Modal
        title="Server bearbeiten"
        open={editVisible}
        onCancel={closeEditModal}
        footer={null}
      >
        <Form form={editForm} onFinish={onEditFinish} layout="vertical">
          <Form.Item name="name" label="Server Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="hostname" label="Hostname" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="version" label="Version">
            <Input />
          </Form.Item>
          <Form.Item name="npc_name" label="NPC Name">
            <Input />
          </Form.Item>
          <Form.Item label="NPC Koordinaten (X, Y, Z)">
            <Row gutter={8}>
              <Col span={8}>
                <Form.Item name="npc_x" noStyle>
                  <InputNumber style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="npc_y" noStyle>
                  <InputNumber style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="npc_z" noStyle>
                  <InputNumber style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
          </Form.Item>
          <Button type="primary" htmlType="submit">Aktualisieren</Button>
        </Form>
      </Modal>
    </MainLayout>
  );
};

export default ServersPage;
