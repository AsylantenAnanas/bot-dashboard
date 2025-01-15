import React, { useEffect, useState } from 'react';
import MainLayout from '../components/MainLayout';
import { Button, Card, List, Modal, Form, Input, message, Space, Popconfirm, Typography } from 'antd';
import { fetchWithAuth } from '../utils/fetchWithAuth';
import { useNavigate } from 'react-router-dom';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';

const { Title } = Typography;

const AccountsPage = () => {
  const [accounts, setAccounts] = useState([]);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [currentAccount, setCurrentAccount] = useState(null); // Account being edited
  const [form] = Form.useForm();
  const [editForm] = Form.useForm(); // Separate form for editing

  const navigate = useNavigate();

  // Function to load accounts from the server
  const loadAccounts = async () => {
    const res = await fetchWithAuth('https://bot-dashboard.meinserver.dev/api/accounts', {}, navigate);
    if (!res.ok) return;
    const data = await res.json();
    setAccounts(data);
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  // Handlers for Add Modal
  const openAddModal = () => {
    form.resetFields();
    setAddModalVisible(true);
  };
  const closeAddModal = () => {
    setAddModalVisible(false);
  };

  // Handlers for Edit Modal
  const openEditModal = (account) => {
    setCurrentAccount(account);
    editForm.setFieldsValue({
      nickname: account.nickname,
      username: account.username,
    });
    setEditModalVisible(true);
  };
  const closeEditModal = () => {
    setEditModalVisible(false);
    setCurrentAccount(null);
  };

  // Handler for adding a new account
  const onAddFinish = async (values) => {
    const res = await fetchWithAuth('https://bot-dashboard.meinserver.dev/api/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    }, navigate);
    if (!res.ok) return;
    const data = await res.json();
    if (data.success) {
      message.success('Account hinzugefügt');
      closeAddModal();
      loadAccounts();
    } else {
      message.error(data.error || 'Fehler beim Hinzufügen');
    }
  };

  // Handler for editing an existing account
  const onEditFinish = async (values) => {
    if (!currentAccount) {
      message.error('Kein Account zum Bearbeiten ausgewählt');
      return;
    }

    const res = await fetchWithAuth(`https://bot-dashboard.meinserver.dev/api/accounts/${currentAccount.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    }, navigate);
    if (!res.ok) return;
    const data = await res.json();
    if (data.success) {
      message.success('Account aktualisiert');
      closeEditModal();
      loadAccounts();
    } else {
      message.error(data.error || 'Fehler beim Aktualisieren');
    }
  };

  // Handler for deleting an account
  const handleDelete = async (accountId) => {
    const res = await fetchWithAuth(`https://bot-dashboard.meinserver.dev/api/accounts/${accountId}/delete`, {
      method: 'POST',
    }, navigate);
    if (!res.ok) return;
    const data = await res.json();
    if (data.success) {
      message.success('Account gelöscht');
      loadAccounts();
    } else {
      message.error(data.error || 'Fehler beim Löschen');
    }
  };

  return (
    <MainLayout defaultKey="accounts">
      {/* Header: Title and Add Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>Accounts</h1>
        <Button type="primary" onClick={openAddModal}>
          Neuen Account hinzufügen
        </Button>
      </div>

      {/* Accounts List */}
      <div style={{ marginTop: 16 }}>
        {accounts.length === 0 ? (
          <p>Keine Accounts vorhanden.</p>
        ) : (
          <List
            grid={{
              gutter: 16,
              xs: 1,
              sm: 2,
              md: 3,
              lg: 4,
              xl: 4,
            }}
            dataSource={accounts}
            renderItem={(item) => (
              <List.Item key={item.id}>
                <Card
                  actions={[
                    <EditOutlined style={{ color: 'blue' }} key="edit" onClick={() => openEditModal(item)} />,
                    <Popconfirm
                      title="Bist du sicher, dass du diesen Account löschen möchtest?"
                      onConfirm={() => handleDelete(item.id)}
                      okText="Ja"
                      cancelText="Nein"
                    >
                      <DeleteOutlined style={{ color: 'red' }} key="delete" />
                    </Popconfirm>,
                  ]}
                >
                  <Title level={4}>{item.nickname}</Title>
                  <p>{item.username}</p>
                </Card>
              </List.Item>
            )}
          />
        )}
      </div>

      {/* Modal for Adding a New Account */}
      <Modal
        title="Neuen Account hinzufügen"
        open={addModalVisible}
        onCancel={closeAddModal}
        footer={null}
        destroyOnClose
      >
        <Form form={form} onFinish={onAddFinish} layout="vertical">
          <Form.Item
            name="nickname"
            label="Ingame Name"
            rules={[{ required: true, message: 'Ingame Name ist erforderlich' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="username"
            label="E-Mail"
            rules={[
              { required: true, message: 'E-Mail ist erforderlich' },
              { type: 'email', message: 'Bitte eine gültige E-Mail eingeben' },
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                Speichern
              </Button>
              <Button onClick={closeAddModal}>
                Abbrechen
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal for Editing an Existing Account */}
      <Modal
        title="Account bearbeiten"
        open={editModalVisible}
        onCancel={closeEditModal}
        footer={null}
        destroyOnClose
      >
        <Form form={editForm} onFinish={onEditFinish} layout="vertical">
          <Form.Item
            name="nickname"
            label="Ingame Name"
            rules={[{ required: true, message: 'Ingame Name ist erforderlich' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="username"
            label="E-Mail"
            rules={[
              { required: true, message: 'E-Mail ist erforderlich' },
              { type: 'email', message: 'Bitte eine gültige E-Mail eingeben' },
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                Aktualisieren
              </Button>
              <Button onClick={closeEditModal}>
                Abbrechen
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </MainLayout>
  );
};

export default AccountsPage;
