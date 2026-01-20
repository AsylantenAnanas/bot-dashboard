import React, { useEffect, useState } from 'react';
import MainLayout from '../components/MainLayout';
import {
  Button, Card, List, Modal, Form, Input, Select, message, Switch, Tooltip, Row, Col, Pagination, Space
} from 'antd';
import {
  PlayCircleOutlined,
  StopOutlined,
  ReloadOutlined,
  CheckOutlined,
  CloseOutlined
} from '@ant-design/icons';

import { fetchWithAuth } from '../utils/fetchWithAuth';
import { useNavigate } from 'react-router-dom';

const { Meta } = Card;

const ClientsPage = () => {
  const [clients, setClients] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [servers, setServers] = useState([]);

  const [createVisible, setCreateVisible] = useState(false);
  const [createForm] = Form.useForm();
  const navigate = useNavigate();

  // State variables for selection mode
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedClientIds, setSelectedClientIds] = useState([]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  useEffect(() => {
    loadClients();
    loadAccounts();
    loadServers();
  }, []);

  const loadClients = async () => {
    try {
      const res = await fetchWithAuth('/clients', {}, navigate);
      if (!res.ok) {
        throw new Error('Fehler beim Laden der Clients');
      }
      const data = await res.json();
      setClients(data);
    } catch (error) {
      message.error(error.message || 'Unbekannter Fehler beim Laden der Clients');
    }
  };

  const loadAccounts = async () => {
    try {
      const res = await fetchWithAuth('/accounts', {}, navigate);
      if (!res.ok) {
        throw new Error('Fehler beim Laden der Accounts');
      }
      const data = await res.json();
      setAccounts(data);
    } catch (error) {
      message.error(error.message || 'Unbekannter Fehler beim Laden der Accounts');
    }
  };

  const loadServers = async () => {
    try {
      const res = await fetchWithAuth('/servers', {}, navigate);
      if (!res.ok) {
        throw new Error('Fehler beim Laden der Server');
      }
      const data = await res.json();
      setServers(data);
    } catch (error) {
      message.error(error.message || 'Unbekannter Fehler beim Laden der Server');
    }
  };

  const openCreateModal = () => {
    createForm.resetFields();
    setCreateVisible(true);
  };

  const onCreateFinish = async (values) => {
    try {
      const res = await fetchWithAuth('/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values)
      }, navigate);
      if (!res.ok) {
        throw new Error('Fehler beim Anlegen des Clients');
      }
      const data = await res.json();
      if (data.success) {
        message.success('Client erfolgreich erstellt');
        setCreateVisible(false);
        loadClients();
      } else {
        throw new Error(data.error || 'Fehler beim Anlegen des Clients');
      }
    } catch (error) {
      message.error(error.message || 'Unbekannter Fehler beim Anlegen des Clients');
    }
  };

  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const startClients = async (clientIds) => {
    setIsSelectionMode(false);
    message.info(`Starte ${clientIds.length} ausgewählte Bots...`);
    let successCount = 0;

    try {
      for (let i = 0; i < clientIds.length; i++) {
        const id = clientIds[i];
        const client = clients.find(c => c.id === id);
        const account = accounts.find(a => a.id === client.account_id);
        const username = account ? (account.nickname || account.username) : `ID ${id}`;

        message.loading({ content: `Starte Bot ${username}...`, key: 'currentAction' });
        const res = await fetchWithAuth(`/clients/${id}/start`, { method: 'POST' }, navigate);

        if (res.ok) {
          successCount++;
          message.success({ content: `Bot ${username} erfolgreich gestartet!`, key: 'currentAction', duration: 2 });
        } else {
          message.error({ content: `Fehler beim Starten von Bot ${username}`, key: 'currentAction', duration: 2 });
        }

        if (i < clientIds.length - 1) {
          const delaySeconds = 7;
          for (let j = delaySeconds; j > 0; j--) {
            message.loading({ content: `Nächster Bot startet in ${j} Sekunden...`, key: 'countdown' });
            await delay(1000);
          }
          message.destroy('countdown');
        }
      }

      message.success(`${successCount} von ${clientIds.length} Bots wurden gestartet.`);
      loadClients();
      setSelectedClientIds([]);

    } catch (error) {
      message.error('Ein unerwarteter Fehler ist beim Starten der Bots aufgetreten.');
      loadClients();
      setSelectedClientIds([]);
    }
  };

  const stopClients = async (clientIds) => {
    setIsSelectionMode(false);
    message.info(`Stoppe ${clientIds.length} ausgewählte Bots...`);
    let successCount = 0;

    try {
      for (const id of clientIds) {
        const client = clients.find(c => c.id === id);
        const account = accounts.find(a => a.id === client.account_id);
        const username = account ? (account.nickname || account.username) : `ID ${id}`;

        message.loading({ content: `Stoppe Bot ${username}...`, key: 'currentAction' });
        const res = await fetchWithAuth(`/clients/${id}/stop`, { method: 'POST' }, navigate);

        if (res.ok) {
          successCount++;
          message.success({ content: `Bot ${username} erfolgreich gestoppt!`, key: 'currentAction', duration: 2 });
        } else {
          message.error({ content: `Fehler beim Stoppen von Bot ${username}`, key: 'currentAction', duration: 2 });
        }
        await delay(1000); // 1 second delay
      }

      message.success(`${successCount} von ${clientIds.length} Bots wurden gestoppt.`);
      loadClients();
      setSelectedClientIds([]);

    } catch (error) {
      message.error('Ein unerwarteter Fehler ist beim Stoppen der Bots aufgetreten.');
      loadClients();
      setSelectedClientIds([]);
    }
  };

  const rejoinClients = async (clientIds) => {
    setIsSelectionMode(false);
    message.info(`Starte ${clientIds.length} ausgewählte Bots neu...`);
    let successCount = 0;

    try {
      for (let i = 0; i < clientIds.length; i++) {
        const id = clientIds[i];
        const client = clients.find(c => c.id === id);
        const account = accounts.find(a => a.id === client.account_id);
        const username = account ? (account.nickname || account.username) : `ID ${id}`;

        message.loading({ content: `Starte Bot ${username} neu...`, key: 'currentAction' });
        const res = await fetchWithAuth(`/clients/${id}/rejoin`, { method: 'POST' }, navigate);

        if (res.ok) {
          successCount++;
          message.success({ content: `Bot ${username} erfolgreich neu gestartet!`, key: 'currentAction', duration: 2 });
        } else {
          message.error({ content: `Fehler beim Neustarten von Bot ${username}`, key: 'currentAction', duration: 2 });
        }

        if (i < clientIds.length - 1) {
          const delaySeconds = 7;
          for (let j = delaySeconds; j > 0; j--) {
            message.loading({ content: `Nächster Bot startet in ${j} Sekunden...`, key: 'countdown' });
            await delay(1000);
          }
          message.destroy('countdown');
        }
      }

      message.success(`${successCount} von ${clientIds.length} Bots wurden neu gestartet.`);
      loadClients();
      setSelectedClientIds([]);

    } catch (error) {
      message.error('Ein unerwarteter Fehler ist beim Neustarten der Bots aufgetreten.');
      loadClients();
      setSelectedClientIds([]);
    }
  };

  // Helper: colored circle for status
  const renderStatusCircle = (status) => {
    let color = 'gray'; // default
    if (status === 'running') color = 'green';
    if (status === 'errored') color = 'red';
    if (status === 'stopped') color = 'gray';
    return (
      <span style={{
        display: 'inline-block',
        width: 12,
        height: 12,
        borderRadius: '50%',
        backgroundColor: color,
        marginRight: 8
      }} />
    );
  };

  // Toggle selection mode
  const toggleSelectionMode = () => {
    if (isSelectionMode) {
      setSelectedClientIds([]);
    }
    setIsSelectionMode(!isSelectionMode);
  };

  // Handle selecting a client by clicking on the card
  const handleSelectClient = (clientId) => {
    if (selectedClientIds.includes(clientId)) {
      setSelectedClientIds(selectedClientIds.filter(id => id !== clientId));
    } else {
      setSelectedClientIds([...selectedClientIds, clientId]);
    }
  };

  // Select all clients
  const selectAllClients = () => {
    const allIds = clients.map(client => client.id);
    setSelectedClientIds(allIds);
  };

  // Deselect all clients
  const deselectAllClients = () => {
    setSelectedClientIds([]);
  };

  // Handle batch start
  const handleBatchStart = () => {
    if (selectedClientIds.length === 0) {
      message.warning('Keine Clients ausgewählt');
      return;
    }
    startClients(selectedClientIds);
  };

  // Handle batch stop
  const handleBatchStop = () => {
    if (selectedClientIds.length === 0) {
      message.warning('Keine Clients ausgewählt');
      return;
    }
    stopClients(selectedClientIds);
  };

  // Handle batch rejoin
  const handleBatchRejoin = () => {
    if (selectedClientIds.length === 0) {
      message.warning('Keine Clients ausgewählt');
      return;
    }
    rejoinClients(selectedClientIds);
  };

  // Parse modules JSON
  const parseModules = (modulesStr) => {
    try {
      return JSON.parse(modulesStr);
    } catch (error) {
      return {};
    }
  };

  // Individuelle Aktionsfunktionen
  const startClient = async (clientId) => {
    try {
      const res = await fetchWithAuth(`/clients/${clientId}/start`, { method: 'POST' }, navigate);
      if (!res.ok) {
        throw new Error('Fehler beim Starten des Bots');
      }
      message.success('Bot gestartet');
      // Refresh clients list here if necessary
    } catch (error) {
      message.error(error.message || 'Unbekannter Fehler beim Starten des Bots');
    }
  };

  const stopClient = async (clientId) => {
    try {
      const res = await fetchWithAuth(`/clients/${clientId}/stop`, { method: 'POST' }, navigate);
      if (!res.ok) {
        throw new Error('Fehler beim Stoppen des Bots');
      }
      message.info('Bot gestoppt');
      // Refresh clients list here if necessary
    } catch (error) {
      message.error(error.message || 'Unbekannter Fehler beim Stoppen des Bots');
    }
  };

  const rejoinClient = async (clientId) => {
    try {
      const res = await fetchWithAuth(`/clients/${clientId}/rejoin`, { method: 'POST' }, navigate);
      if (!res.ok) {
        throw new Error('Fehler beim Neustarten des Bots');
      }
      message.info('Bot neu gestartet');
      // Refresh clients list here if necessary
    } catch (error) {
      message.error(error.message || 'Unbekannter Fehler beim Neustarten des Bots');
    }
  };

  // Pagination handlers
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // Get current page clients
  const paginatedClients = clients.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <MainLayout defaultKey="clients">
      {/* Header with title and buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
        <h1 style={{ margin: '0 0 16px 0' }}>Clients</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button type="default" onClick={toggleSelectionMode}>
            {isSelectionMode ? 'Auswahlmodus deaktivieren' : 'Auswahlmodus aktivieren'}
          </Button>
          <Button type="primary" onClick={openCreateModal}>
            Neuen Client erstellen
          </Button>
        </div>
      </div>

      {/* Batch action toolbar visible only in selection mode */}
      {isSelectionMode && (
        <div style={{ marginBottom: 16 }}>
          <Row justify="space-between" align="middle">
            <Row style={{ gap: 8 }}>
              <Button onClick={selectAllClients}>Alle auswählen</Button>
              <Tooltip title="Auswahl aufheben">
                <Button onClick={deselectAllClients}>Auswahl aufheben</Button>
              </Tooltip>
            </Row>
            <Row style={{ gap: 8 }}>
              <Button style={{ color: 'green' }} icon={<PlayCircleOutlined />} onClick={handleBatchStart}>Gewählte starten</Button>
              <Button style={{ color: 'orange' }} icon={<ReloadOutlined />} onClick={handleBatchRejoin}>Gewählte neu starten</Button>
              <Button style={{ color: 'red' }} icon={<StopOutlined />} onClick={handleBatchStop}>Gewählte stoppen</Button>
            </Row>
          </Row>
        </div>
      )}

      {/* Client list */}
      <div>
        <List
          grid={{
            gutter: 16,
            xs: 1,
            sm: 2,
            md: 3,
            lg: 4,
            xl: 4,
          }}
          dataSource={paginatedClients}
          renderItem={item => {
            const acc = accounts.find(a => a.id === item.account_id);
            const srv = servers.find(s => s.id === item.server_id);
            const status = item.status;
            const isSelected = selectedClientIds.includes(item.id);
            const modules = parseModules(item.modules);

            return (
              <List.Item>
                <Card
                  hoverable
                  onClick={() => isSelectionMode && handleSelectClient(item.id)}
                  title={(
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      {renderStatusCircle(status)}
                      <span>{srv ? srv.name : `ID ${item.server_id}`}</span>
                    </div>
                  )}
                  extra={<a href={`/clients/${item.id}`}>Details</a>}
                  actions={!isSelectionMode ? [
                    (status === 'stopped' || status === 'errored') && (
                      <Tooltip title="Starten" key="start">
                        <PlayCircleOutlined
                          style={{ color: 'green' }}
                          onClick={(e) => { e.stopPropagation(); startClient(item.id); }}
                        />
                      </Tooltip>
                    ),
                    (status === 'running' || status === 'errored') && (
                      <Tooltip title="Rejoin" key="rejoin">
                        <ReloadOutlined
                          style={{ color: 'orange' }}
                          onClick={(e) => { e.stopPropagation(); rejoinClient(item.id); }}
                        />
                      </Tooltip>
                    ),
                    status === 'running' && (
                      <Tooltip title="Stoppen" key="stop">
                        <StopOutlined
                          style={{ color: 'red' }}
                          onClick={(e) => { e.stopPropagation(); stopClient(item.id); }}
                        />
                      </Tooltip>
                    )
                  ] : []}
                  style={{
                    border: isSelected ? '2px solid #1890ff' : undefined,
                    boxShadow: isSelected ? '0 0 10px rgba(24, 144, 255, 0.5)' : undefined,
                    transition: 'border 0.3s, box-shadow 0.3s',
                    cursor: isSelectionMode ? 'pointer' : 'default',
                  }}
                >
                  <Meta
                    title={<strong>{acc ? (acc.nickname || acc.username) : 'Unbekannter Account'}</strong>}
                    description={
                      <div>
                        <p><strong>Server:</strong> {srv ? srv.name : `ID ${item.server_id}`}</p>
                        <p><strong>Autorestart:</strong> {item.autorestart ? 'Aktiviert' : 'Deaktiviert'}</p>
                        <p><strong>Module:</strong> {Object.keys(modules).length > 0 ?
                          Object.keys(modules).map((mod, index) => (
                            <span key={mod} style={{
                              display: 'inline-block',
                              marginRight: '4px',
                              padding: '2px 6px',
                              backgroundColor: modules[mod].enabled ? '#52c41a' : '#f5222d',
                              color: '#fff',
                              borderRadius: '4px',
                              fontSize: '12px'
                            }}>
                              {mod}
                            </span>
                          ))
                          : 'Keine'}
                        </p>
                      </div>
                    }
                  />
                </Card>
              </List.Item>
            );
          }}
        />
      </div>

      {/* Pagination */}
      {clients.length > pageSize && (
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Pagination
            current={currentPage}
            pageSize={pageSize}
            total={clients.length}
            onChange={handlePageChange}
            showSizeChanger={false}
          />
        </div>
      )}

      {/* Create Client Modal */}
      <Modal
        title="Neuen Client erstellen"
        visible={createVisible}
        onCancel={() => setCreateVisible(false)}
        footer={null}
      >
        <Form form={createForm} onFinish={onCreateFinish} layout="vertical">
          <Form.Item name="accountId" label="Wähle Account" rules={[{ required: true }]}>
            <Select placeholder="Bitte wähle einen Account">
              {accounts.map(a => (
                <Select.Option key={a.id} value={a.id}>
                  {a.nickname || a.username}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="serverId" label="Wähle Server" rules={[{ required: true }]}>
            <Select placeholder="Bitte wähle einen Server">
              {servers.map(s => (
                <Select.Option key={s.id} value={s.id}>
                  {s.name} ({s.hostname})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="modules" label="Module">
            <Input.TextArea rows={3} placeholder='JSON-Format der Module' />
          </Form.Item>
          <Form.Item name="autorestart" valuePropName="checked">
            <Switch />
            <span style={{ marginLeft: 8 }}>Autorestart</span>
          </Form.Item>
          <Button type="primary" htmlType="submit" block>
            Speichern
          </Button>
        </Form>
      </Modal>
    </MainLayout>
  );
};

export default ClientsPage;
