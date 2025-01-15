import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/MainLayout';
import { Row, Col, Card, message, Button } from 'antd';
import { fetchWithAuth } from '../utils/fetchWithAuth';

function DashboardPage() {
  const navigate = useNavigate();
  const [accountsCount, setAccountsCount] = useState(0);
  const [clientsCount, setClientsCount] = useState(0);
  const [runningCount, setRunningCount] = useState(0);
  const [stoppedCount, setStoppedCount] = useState(0);
  const [erroredCount, setErroredCount] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [accRes, cliRes] = await Promise.all([
          fetchWithAuth('/accounts', {}, navigate),
          fetchWithAuth('/clients', {}, navigate)
        ]);
        if (accRes.ok && cliRes.ok) {
          const accounts = await accRes.json();
          const clients = await cliRes.json();
          setAccountsCount(accounts.length);
          setClientsCount(clients.length);

          let run = 0, stop = 0, err = 0;
          clients.forEach(c => {
            if (c.status === 'running') run++;
            else if (c.status === 'stopped') stop++;
            else if (c.status === 'errored') err++;
          });
          setRunningCount(run);
          setStoppedCount(stop);
          setErroredCount(err);
        } else {
          message.error('Fehler beim Laden der Dashboard-Daten');
        }
      } catch (err) {
        console.error(err);
        message.error('Netzwerkfehler');
      }
    };
    fetchData();
  }, []);

  const downloadAllLogs = () => {
    window.open('/exportAllLogs', '_blank');
  };

  return (
    <MainLayout defaultKey="dashboard">
      <h1>Dashboard</h1>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={6} lg={6} xl={6}>
          <Card title="Accounts" style={{ textAlign: 'center' }}>
            <h2>{accountsCount}</h2>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6} lg={6} xl={6}>
          <Card title="Clients" style={{ textAlign: 'center' }}>
            <h2>{clientsCount}</h2>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6} lg={6} xl={6}>
          <Card title="Laufend (running)" style={{ textAlign: 'center' }}>
            <h2 style={{ color: 'green' }}>{runningCount}</h2>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6} lg={6} xl={6}>
          <Card title="Gestoppt/Errored" style={{ textAlign: 'center' }}>
            <h2 style={{ color: 'red' }}>{stoppedCount + erroredCount}</h2>
          </Card>
        </Col>
      </Row>

      <Button onClick={downloadAllLogs}>Alle Logs herunterladen</Button>
    </MainLayout>
  );
}

export default DashboardPage;
