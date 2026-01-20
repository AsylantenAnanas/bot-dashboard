import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import MainLayout from '../components/MainLayout';
import { Row, Col, Card, Input, Button, message } from 'antd';
import { SendOutlined } from '@ant-design/icons';
import { fetchWithAuth } from '../utils/fetchWithAuth';
import AnsiToHtml from 'ansi-to-html';

const ansiToHtmlConverter = new AnsiToHtml();

// ─────────────────────────────────────────────────────────────────────────────
// Hilfsfunktion: Mehr-Wege-Aggregation
// Nimmt ein Objekt `allMsgsByClientId`, z.B. { [clientId]: [arrayOfMessages] },
// sortiert pro Client nach Zeit und findet gemeinsame Messages, die in allen
// Clients sind und die (text) + (timestamp +- 1s) gematcht werden.
// Rückgabe: { aggregator: [...], leftovers: { clientId: [...] } }
// ─────────────────────────────────────────────────────────────────────────────
function multiwayAggregate(allMsgsByClientId, clientIds, timeToleranceMs = 1000) {
  // Sortiere pro Client die Nachrichten chronologisch
  const sortedArrays = clientIds.map(id =>
    [...(allMsgsByClientId[id] || [])].sort(
      (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
    )
  );

  // Pointer pro Client
  const pointers = clientIds.map(() => 0);

  const aggregator = [];
  const leftovers = {};
  clientIds.forEach(id => {
    leftovers[id] = [];
  });

  // Definiere den Schwellenwert: Nachrichten in >= 50% der Clients
  const threshold = Math.ceil(clientIds.length * 0.5);

  while (true) {
    // Ermittle alle Clients, die noch Nachrichten haben
    const activeClients = [];
    for (let i = 0; i < clientIds.length; i++) {
      if (pointers[i] < sortedArrays[i].length) {
        activeClients.push(i);
      }
    }
    if (activeClients.length === 0) {
      break;
    }

    // Bestimme die früheste Nachricht unter den aktiven Clients
    let earliestIndex = activeClients[0];
    let candidate = sortedArrays[earliestIndex][pointers[earliestIndex]];
    let candidateTime = new Date(candidate.timestamp).getTime();
    for (let i = 1; i < activeClients.length; i++) {
      const idx = activeClients[i];
      const msg = sortedArrays[idx][pointers[idx]];
      const msgTime = new Date(msg.timestamp).getTime();
      if (msgTime < candidateTime) {
        candidate = msg;
        candidateTime = msgTime;
        earliestIndex = idx;
      }
    }

    // Suche in allen Clients nach einer passenden Nachricht (gleicher Text und timestamp ± timeToleranceMs)
    let matchCount = 0;
    const matchedIndexes = new Array(clientIds.length).fill(-1);
    for (let i = 0; i < clientIds.length; i++) {
      let j = pointers[i];
      while (j < sortedArrays[i].length) {
        const m = sortedArrays[i][j];
        const mTime = new Date(m.timestamp).getTime();
        if (m.text === candidate.text && Math.abs(mTime - candidateTime) <= timeToleranceMs) {
          matchCount++;
          matchedIndexes[i] = j;
          break;
        }
        // Wenn die Zeit zu weit (größer als candidateTime + Toleranz) ist, brechen wir ab
        if (mTime > candidateTime + timeToleranceMs) {
          break;
        }
        j++;
      }
    }

    if (matchCount >= threshold) {
      // Nachricht erscheint in mindestens 50% der Clients – füge sie dem Aggregator hinzu
      aggregator.push(candidate);
      // Für jeden Client, in dem die Nachricht gefunden wurde, wird der Pointer um 1 weitergeschaltet
      for (let i = 0; i < clientIds.length; i++) {
        if (matchedIndexes[i] !== -1) {
          pointers[i] = matchedIndexes[i] + 1;
        }
      }
    } else {
      // Nachricht taucht nicht häufig genug auf – sie bleibt im individuellen Terminal
      const cid = clientIds[earliestIndex];
      leftovers[cid].push(candidate);
      pointers[earliestIndex]++;
    }
  }

  // Alle noch nicht verarbeiteten Nachrichten werden als leftovers hinzugefügt
  for (let i = 0; i < clientIds.length; i++) {
    while (pointers[i] < sortedArrays[i].length) {
      leftovers[clientIds[i]].push(sortedArrays[i][pointers[i]]);
      pointers[i]++;
    }
  }

  // Sortiere Aggregator und Leftovers nochmals nach Zeit
  aggregator.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  clientIds.forEach(id => {
    leftovers[id].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  });

  return { aggregator, leftovers };
}


// ─────────────────────────────────────────────────────────────────────────────
// Gemeinsames (Aggregiertes) Terminal
// Zeigt einfach die per Prop übergebenen aggregatorMessages an
// ─────────────────────────────────────────────────────────────────────────────
function AggregatedTerminal({ messages }) {
  const terminalRef = useRef(null);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <Card
      title="Gemeinsames Terminal"
      bodyStyle={{ padding: 0, margin: 0 }}
      style={{ marginBottom: 16 }}
    >
      <div
        ref={terminalRef}
        style={{
          background: '#000',
          height: 300,
          overflowY: 'auto',
          color: '#0f0',
          fontFamily: 'monospace',
          padding: '0 8px',
          paddingBottom: 8
        }}
      >
        {messages.map((m, i) => (
          <div
            key={i}
            dangerouslySetInnerHTML={{
              __html: `<span style="color: #0f0">${new Date(m.timestamp).toLocaleString('de-DE')}</span>: ${ansiToHtmlConverter.toHtml(m.text)}`
            }}
          />
        ))}
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Einzelnes Client Terminal (nur Anzeige + Chat-Input, keine eigene Fetch-Logik)
// Bekommt seine Nachrichten per Prop und ruft onSendChat(...) auf zum Absenden
// ─────────────────────────────────────────────────────────────────────────────
function ClientTerminal({ client, account, messages, onSendChat }) {
  const [inputValue, setInputValue] = useState('');
  const terminalRef = useRef(null);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    const msg = inputValue.trim();
    if (!msg) return;
    onSendChat(client.id, msg).then(() => {
      setInputValue('');
    });
  };

  return (
    <Card
      title={
        <Link to={`/clients/${client.id}`}>
          {account ? account.nickname : `Client ${client.id}`}
        </Link>
      }
      bodyStyle={{ padding: 0 }}
      style={{ marginBottom: 16 }}
    >
      <div
        ref={terminalRef}
        style={{
          background: '#000',
          height: 200,
          overflowY: 'auto',
          color: '#0f0',
          fontFamily: 'monospace',
          padding: '0 8px',
          paddingBottom: 8
        }}
      >
        {messages.map((m, i) => (
          <div
            key={i}
            dangerouslySetInnerHTML={{
              __html: `<span style="color: #0f0">${new Date(m.timestamp).toLocaleString('de-DE')}</span>: ${ansiToHtmlConverter.toHtml(m.text)}`
            }}
          />
        ))}
      </div>
      {/* Angepasstes Chat-Input ohne zusätzlichen Margin */}
      <div style={{ display: 'flex' }}>
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onPressEnter={handleSend}
          placeholder="Nachricht eingeben..."
          style={{
            backgroundColor: '#222',
            color: '#0f0',
            border: '1px solid #555',
            borderRadius: '0 0 0 6px',
            margin: 0
          }}
        />
        <Button
          type="primary"
          onClick={handleSend}
          style={{ borderRadius: '0 0 6px 0', margin: 0 }}
        >
          <SendOutlined />
        </Button>
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard-Seite
// Holt regelmäßig alle Nachrichten, wendet Aggregation an,
// und verteilt aggregator + leftovers an die Terminals
// ─────────────────────────────────────────────────────────────────────────────
function DashboardPage() {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState([]);
  const [clients, setClients] = useState([]);
  const [accountsCount, setAccountsCount] = useState(0);
  const [clientsCount, setClientsCount] = useState(0);
  const [runningCount, setRunningCount] = useState(0);
  const [nonRunningCount, setNonRunningCount] = useState(0);

  // Speichert pro Client ein Array der geladenen Nachrichten
  const [allMessagesByClient, setAllMessagesByClient] = useState({});

  // Aggregierte Nachrichten + leftover pro Client
  const [aggregatedMessages, setAggregatedMessages] = useState([]);
  const [leftoverMessagesByClient, setLeftoverMessagesByClient] = useState({});

  // Polling-Intervall
  useEffect(() => {
    fetchDashboardData(); // Initiales Laden
    const interval = setInterval(() => {
      fetchDashboardData();
    }, 10000); // alle 10s
    return () => clearInterval(interval);
  }, [navigate]);

  // Lädt Accounts + Clients + alle Messages
  async function fetchDashboardData() {
    try {
      const [accRes, cliRes] = await Promise.all([
        fetchWithAuth('/accounts', {}, navigate),
        fetchWithAuth('/clients', {}, navigate)
      ]);
      if (accRes.ok && cliRes.ok) {
        const accountsData = await accRes.json();
        const clientsData = await cliRes.json();

        setAccounts(accountsData);
        setClients(clientsData);
        setAccountsCount(accountsData.length);
        setClientsCount(clientsData.length);

        const running = clientsData.filter(c => c.status === 'running');
        setRunningCount(running.length);
        setNonRunningCount(clientsData.length - running.length);

        // Anschließend alle Messages für alle laufenden Clients laden
        // (im Parallel-Promise.all)
        const runningIds = running.map(c => c.id);
        const promises = runningIds.map(cid =>
          fetchWithAuth(`/clients/${cid}/messages`, {}, navigate)
            .then(res => res.ok ? res.json() : [])
            .catch(() => [])
        );
        const allMsgArrays = await Promise.all(promises);
        // "allMsgArrays" ist ein Array, das pro Client ein Array von Messages hat,
        // in genau der Reihenfolge von runningIds.

        const newAllMessagesByClient = { ...allMessagesByClient };
        runningIds.forEach((cid, idx) => {
          // Beschränke auf z.B. letzte 500
          newAllMessagesByClient[cid] = allMsgArrays[idx];
        });
        setAllMessagesByClient(newAllMessagesByClient);

        // Jetzt Aggregation durchführen
        const { aggregator, leftovers } = multiwayAggregate(
          newAllMessagesByClient,
          runningIds,
          1000 // 1 Sekunde Toleranz
        );

        // Ggf. noch begrenzen:
        const aggLimited = aggregator.slice(-300); // nur letzte 300 im Aggregator
        const leftoverLimited = {};
        Object.keys(leftovers).forEach(cid => {
          leftoverLimited[cid] = leftovers[cid].slice(-300);
        });

        setAggregatedMessages(aggLimited);
        setLeftoverMessagesByClient(leftoverLimited);

      } else {
        message.error('Fehler beim Laden der Dashboard-Daten');
      }
    } catch (err) {
      console.error(err);
      message.error('Netzwerkfehler');
    }
  }

  // Nur laufende Clients
  const runningClients = clients.filter(client => client.status === 'running');

  // Chat senden (wird von ClientTerminal aufgerufen)
  const handleSendChat = async (clientId, msg) => {
    try {
      const res = await fetchWithAuth(`/clients/${clientId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg })
      }, navigate);
      if (!res.ok) {
        message.error('Fehler beim Senden der Nachricht');
      } else {
        // Nach dem Senden erneut Daten pollen
        await fetchDashboardData();
      }
    } catch (error) {
      console.error(error);
      message.error('Fehler beim Senden der Nachricht');
    }
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
            <h2 style={{ color: 'red' }}>{nonRunningCount}</h2>
          </Card>
        </Col>
      </Row>

      {/* Nur anzeigen, wenn >= 2 laufende Clients */}
      {runningClients.length >= 2 && (
        <AggregatedTerminal messages={aggregatedMessages} />
      )}

      {/* Kleine Terminals für jeden laufenden Client */}
      <Row gutter={[16, 16]}>
        {runningClients.map((client) => {
          const account = accounts.find(acc => acc.id === client.account_id);
          const leftoverMsgs = leftoverMessagesByClient[client.id] || [];
          return (
            <Col xs={24} sm={12} md={8} lg={8} xl={8} key={client.id}>
              <ClientTerminal
                client={client}
                account={account}
                messages={leftoverMsgs}
                onSendChat={handleSendChat}
              />
            </Col>
          );
        })}
      </Row>

      <Button onClick={() => window.open('/exportAllLogs', '_blank')}>
        Alle Logs herunterladen
      </Button>
    </MainLayout>
  );
}

export default DashboardPage;
