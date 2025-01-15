import React, { useEffect, useState, useRef } from 'react';
import AnsiToHtml from 'ansi-to-html';
import socket from '../socket';
import MainLayout from '../components/MainLayout';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Button, Card, Input, Row, Col, Typography, message, Switch, Popconfirm, Modal, Table, Space, Popover
} from 'antd'; // Import Popover
import {
  PlayCircleOutlined, StopOutlined, ReloadOutlined,
  DeleteOutlined, FileTextOutlined, SendOutlined,
  EyeOutlined, SearchOutlined
} from '@ant-design/icons';
import { fetchWithAuth } from '../utils/fetchWithAuth';
import { formatDisplayName } from '../utils/formatDisplayName'; // Import the utility function
import HookManager from '../components/HookManager'; // Import HookManager

const { Text } = Typography;
const ansiToHtmlConverter = new AnsiToHtml();

const ClientDetailsPage = () => {
  const { clientId } = useParams();
  const navigate = useNavigate();

  const [client, setClient] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [blacklistField, setBlacklistField] = useState('');

  // Autorestart
  const [autoRestart, setAutoRestart] = useState(false);

  // MODULE: ChatGPT
  const [chatGptEnabled, setChatGptEnabled] = useState(false);
  const [chatGptApiKey, setChatGptApiKey] = useState('');
  const [chatGptPrompt, setChatGptPrompt] = useState('');

  // MODULE: AutoShop
  const [autoShopEnabled, setAutoShopEnabled] = useState(false);
  const [autoShopChests, setAutoShopChests] = useState([]);

  const terminalRef = useRef(null);

  // State-Flag to track initial loading
  const [isInitialLoad, setIsInitialLoad] = useState(false);

  // Modal and Gallery States
  const [isGalleryVisible, setIsGalleryVisible] = useState(false);
  const [galleryImages, setGalleryImages] = useState([]);

  // Capture Button State
  const [isCapturing, setIsCapturing] = useState(false);

  // Player Count States
  const [playerCount, setPlayerCount] = useState(0);

  // Player List Modal States
  const [isPlayerListVisible, setIsPlayerListVisible] = useState(false);
  const [players, setPlayers] = useState([]);
  const [playersLoading, setPlayersLoading] = useState(false);

  // Search States for Table
  const [searchText, setSearchText] = useState('');
  const [searchedColumn, setSearchedColumn] = useState('');
  const searchInput = useRef(null);

  const isFirstRender = useRef(true); // Ref to track initial render

  const getColumnSearchProps = (dataIndex, columnName) => ({
    filterDropdown: ({
      setSelectedKeys,
      selectedKeys,
      confirm,
      clearFilters,
    }) => (
      <div style={{ padding: 8 }}>
        <Input
          placeholder={`Search ${columnName}`}
          value={selectedKeys[0]}
          onChange={(e) =>
            setSelectedKeys(e.target.value ? [e.target.value] : [])
          }
          onPressEnter={() =>
            handleSearch(selectedKeys, confirm, dataIndex)
          }
          style={{ marginBottom: 8, display: 'block' }}
          ref={searchInput}
        />
        <Space>
          <Button
            type="primary"
            onClick={() => handleSearch(selectedKeys, confirm, dataIndex)}
            icon={<SearchOutlined />}
            size="small"
            style={{ width: 90 }}
          >
            Search
          </Button>
          <Button onClick={() => handleReset(clearFilters)} size="small" style={{ width: 90 }}>
            Reset
          </Button>
        </Space>
      </div>
    ),
    filterIcon: (filtered) => (
      <SearchOutlined style={{ color: filtered ? '#1890ff' : undefined }} />
    ),
    onFilter: (value, record) =>
      record[dataIndex]
        ? record[dataIndex].toString().toLowerCase().includes(value.toLowerCase())
        : '',
    onFilterDropdownVisibleChange: (visible) => {
      if (visible) {
        setTimeout(() => {
          searchInput.current?.select();
        }, 100);
      }
    },
    render: text => text,
  });

  const handleSearch = (selectedKeys, confirm, dataIndex) => {
    confirm();
    setSearchText(selectedKeys[0]);
    setSearchedColumn(dataIndex);
  };

  const handleReset = (clearFilters) => {
    clearFilters();
    setSearchText('');
  };

  const playerColumns = [
    {
      title: 'Username',
      dataIndex: 'username',
      key: 'username',
      sorter: (a, b) => a.username.localeCompare(b.username),
      ...getColumnSearchProps('username', 'Username'),
    },
    {
      title: 'Display Name',
      dataIndex: 'displayName',
      key: 'displayName',
      sorter: (a, b) => a.displayName.localeCompare(b.displayName),
      ...getColumnSearchProps('displayName', 'Display Name'),
    },
    {
      title: 'Gamemode',
      dataIndex: 'gamemode',
      key: 'gamemode',
      sorter: (a, b) => a.gamemode - b.gamemode,
      filters: [
        { text: 'Survival', value: 0 },
        { text: 'Creative', value: 1 },
        // Add other gamemodes as necessary
      ],
      onFilter: (value, record) => record.gamemode === value,
      render: gamemode => {
        switch (gamemode) {
          case 0:
            return 'Survival';
          case 1:
            return 'Creative';
          // Add other gamemodes as necessary
          default:
            return 'Unknown';
        }
      },
    },
    {
      title: 'Ping',
      dataIndex: 'ping',
      key: 'ping',
      sorter: (a, b) => a.ping - b.ping,
    },
    {
      title: 'Entity Status',
      dataIndex: 'entity',
      key: 'entity',
      filters: [
        { text: 'Active', value: true },
        { text: 'Inactive', value: false },
      ],
      onFilter: (value, record) => {
        if (value) {
          return record.entity !== null;
        }
        return record.entity === null;
      },
      render: entity => (entity ? 'Active' : 'Inactive'),
    },
    {
      title: 'Position',
      dataIndex: 'entity',
      key: 'position',
      responsive: ['md'],
      render: entity => {
        if (entity && entity.position) {
          const { x, y, z } = entity.position;
          return `(${x.toFixed(2)}, ${y}, ${z.toFixed(2)})`;
        }
        return 'N/A';
      },
    },
    {
      title: 'Velocity',
      dataIndex: 'entity',
      key: 'velocity',
      responsive: ['lg'],
      render: entity => {
        if (entity && entity.velocity) {
          const { x, y, z } = entity.velocity;
          return `(${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)})`;
        }
        return 'N/A';
      },
    },
    {
      title: 'Health',
      dataIndex: ['entity', 'attributes', 'minecraft:generic.max_health', 'value'],
      key: 'health',
      sorter: (a, b) => a.entity?.attributes?.['minecraft:generic.max_health']?.value - b.entity?.attributes?.['minecraft:generic.max_health']?.value,
      responsive: ['xl'],
      render: (text, record) => record.entity?.attributes?.['minecraft:generic.max_health']?.value || 'N/A',
    },
    {
      title: 'Additional Info',
      key: 'additionalInfo',
      render: (text, record) => (
        <Popover
          content={
            <div>
              <p><strong>UUID:</strong> {record.uuid}</p>
              <p><strong>Yaw:</strong> {record.entity?.yaw.toFixed(2)}</p>
              <p><strong>Pitch:</strong> {record.entity?.pitch.toFixed(2)}</p>
              {/* Add more fields as needed */}
            </div>
          }
          title="Player Details"
          trigger="hover"
        >
          <Button type="link">View Details</Button>
        </Popover>
      ),
      responsive: ['xl'],
    },
  ];

  const scrollToBottom = () => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  };

  // Load client data and messages when clientId changes
  useEffect(() => {
    loadClient();
    loadMessages();
    loadGalleryImages();
    // eslint-disable-next-line
  }, [clientId]);

  // Subscribe to terminal and receive messages
  useEffect(() => {
    // Subscribe to terminal for this client
    socket.emit('subscribeToTerminal', clientId);

    // Receive initial messages
    socket.on('terminalMessages', (initialMessages) => {
      setMessages(initialMessages);
      setIsInitialLoad(true); // Mark initial load
    });

    // Receive new messages
    socket.on('terminalMessagesUpdate', (newMessage) => {
      setMessages((prev) => [...prev, newMessage]);
    });

    return () => {
      socket.off('terminalMessages');
      socket.off('terminalMessagesUpdate');
    };
  }, [clientId]);

  // Subscribe to player updates
  useEffect(() => {
    // Subscribe to player updates for this client
    socket.emit('subscribeToPlayerUpdates', clientId);

    // Handle player updates
    const handlePlayerUpdate = (data) => {
      if (data.type === 'initial') {
        setPlayerCount(data.playerCount);
      } else {
        setPlayerCount(data.playerCount);
      }
    };

    socket.on('playerUpdate', handlePlayerUpdate);

    // Cleanup on unmount
    return () => {
      socket.emit('unsubscribeFromPlayerUpdates');
      socket.off('playerUpdate', handlePlayerUpdate);
    };
  }, [clientId]);

  // Scroll to bottom after initial load
  useEffect(() => {
    if (isInitialLoad) {
      // Use setTimeout to ensure DOM updates
      setTimeout(() => {
        scrollToBottom();
        setIsInitialLoad(false); // Reset flag to prevent further scrolling
      }, 0);
    }
  }, [messages, isInitialLoad]);

  const loadClient = async () => {
    const res = await fetchWithAuth(`/clients/${clientId}`, {}, navigate);
    if (!res.ok) return;
    const data = await res.json();
    setClient(data);
    setBlacklistField(data.blacklist || '');
    setAutoRestart(data.autorestart === 1);

    // Load modules
    if (data.modules) {
      if (data.modules.chatgpt) {
        setChatGptEnabled(data.modules.chatgpt.enabled);
        setChatGptApiKey(data.modules.chatgpt.apiKey || '');
        setChatGptPrompt(data.modules.chatgpt.prompt || '');
      }
      if (data.modules.autoshop) {
        setAutoShopEnabled(data.modules.autoshop.enabled);
        setAutoShopChests(data.modules.autoshop.chests || []);
      }
    }
  };

  const loadMessages = async () => {
    const res = await fetchWithAuth(`/clients/${clientId}/messages`, {}, navigate);
    if (!res.ok) return;
    const data = await res.json();
    setMessages(data);
    setIsInitialLoad(true); // Mark initial load
  };

  const loadGalleryImages = async () => {
    const res = await fetchWithAuth(`/bots/${clientId}/images`, {}, navigate);
    if (!res.ok) {
      console.error('Error loading images');
      return;
    }
    const data = await res.json();
    setGalleryImages(data.images.map(url => ({ src: url })));
  };

  // Start/Stop/Rejoin Functions
  const startBot = async () => {
    const res = await fetchWithAuth(`/clients/${clientId}/start`, { method: 'POST' }, navigate);
    if (res.ok) {
      message.success('Bot started');
      loadClient();
      loadMessages();
    }
  };

  const stopBot = async () => {
    const res = await fetchWithAuth(`/clients/${clientId}/stop`, { method: 'POST' }, navigate);
    if (res.ok) {
      message.info('Bot stopped');
      loadClient();
      loadMessages();
    }
  };

  const rejoinBot = async () => {
    const res = await fetchWithAuth(`/clients/${clientId}/rejoin`, { method: 'POST' }, navigate);
    if (res.ok) {
      message.info('Bot rejoined');
      loadClient();
      loadMessages();
    }
  };

  // Chat Function
  const sendChat = async () => {
    const msg = inputValue.trim();
    if (!msg) return;
    const res = await fetchWithAuth(`/clients/${clientId}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: msg })
    }, navigate);
    if (res.ok) {
      setInputValue('');
      loadMessages();
    }
  };

  // Clear Terminal
  const clearTerminal = () => {
    setMessages([]);
  };

  // Delete and Export Client
  const handleDelete = async () => {
    const res = await fetchWithAuth(`/clients/${clientId}/delete`, {
      method: 'POST'
    }, navigate);
    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        message.success('Client deleted');
        navigate('/clients');
      }
    }
  };

  const handleExport = () => {
    window.open(`/clients/${clientId}/export`, '_blank');
  };

  // Auto-Save Settings with Debounce
  useEffect(() => {
    // Skip saving on initial load
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // Debounce mechanism
    const handler = setTimeout(() => {
      saveSettings();
    }, 1000); // 1000ms debounce

    // Cleanup timeout if dependencies change before timeout
    return () => {
      clearTimeout(handler);
    };
    // Dependencies include all fields that need to be saved
  }, [
    blacklistField,
    autoRestart,
    chatGptEnabled,
    chatGptApiKey,
    chatGptPrompt,
    autoShopEnabled,
    autoShopChests
  ]);

  const saveSettings = async () => {
    const body = {
      blacklist: blacklistField,
      autorestart: autoRestart,
      modules: {
        chatgpt: {
          enabled: chatGptEnabled,
          apiKey: chatGptApiKey,
          prompt: chatGptPrompt
        },
        autoshop: {
          enabled: autoShopEnabled,
          chests: autoShopChests
        },
      }
    };
    try {
      const res = await fetchWithAuth(`/clients/${clientId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }, navigate);
      if (!res.ok) {
        const errorData = await res.json();
        message.error(errorData.error || 'Failed to auto-save settings');
      }
    } catch (error) {
      console.error(error);
      message.error('Error saving settings');
    }
  };

  // Toggle Autorestart and let useEffect handle saving
  const onToggleAutorestart = (checked) => {
    setAutoRestart(checked);
  };

  // Toggle ChatGPT and let useEffect handle saving
  const onToggleChatGpt = (checked) => {
    setChatGptEnabled(checked);
  };

  // Toggle AutoShop and let useEffect handle saving
  const onToggleAutoShop = (checked) => {
    setAutoShopEnabled(checked);
  };

  // Convert timestamp to German ISO format
  const convertToGermanISO = (timestamp) => {
    const date = new Date(timestamp);
    const d = date.toLocaleDateString('de-DE', { year: '2-digit', month: '2-digit', day: '2-digit' });
    const t = date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    return `${d}, ${t}`;
  };

  // Function to capture the bot's image
  const captureBotImage = async () => {
    setIsCapturing(true);
    try {
      const res = await fetchWithAuth(`/bots/${clientId}/view`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      }, navigate);
      const data = await res.json();
      if (res.ok && data.imageUrl) {
        message.success('Bot image captured successfully');
        // Fetch the new image URL and add it to the gallery
        setGalleryImages(prev => [{ src: data.imageUrl }, ...prev]);
      } else {
        message.error(data.error || 'Error fetching bot image');
      }
    } catch (err) {
      console.error(err);
      message.error('Error fetching bot image');
    } finally {
      setIsCapturing(false);
    }
  };

  // Function to open the gallery modal
  const openGallery = () => {
    setIsGalleryVisible(true);
  };

  // Player List Modal Control Functions
  const fetchPlayers = async () => {
    setPlayersLoading(true);
    try {
      const res = await fetchWithAuth(`/clients/${clientId}/players`, {}, navigate);
      if (!res.ok) {
        throw new Error('Failed to fetch players');
      }
      const data = await res.json();

      console.log(data);

      // Transform the data into an array
      // Assuming data is an object with usernames as keys
      const playersArray = Object.values(data);

      // Format displayName and ensure data integrity
      const formattedData = playersArray.map(player => ({
        ...player,
        displayName: formatDisplayName(player.displayName),
      }));

      setPlayers(formattedData);
    } catch (error) {
      console.error(error);
      message.error('Error fetching player list');
    } finally {
      setPlayersLoading(false);
    }
  };

  const openPlayerList = () => {
    setIsPlayerListVisible(true);
    fetchPlayers();
  };

  const closePlayerList = () => {
    setIsPlayerListVisible(false);
  };

  if (!client) {
    return (
      <MainLayout defaultKey="clients">
        <p>Loading...</p>
      </MainLayout>
    );
  }

  // Status Color Indicator
  const statusColor = client.status === 'running'
    ? 'green'
    : client.status === 'errored'
      ? 'red'
      : 'gray';

  return (
    <MainLayout defaultKey="clients">
      <Row gutter={[16, 16]}>
        {/* Info and Actions Column */}
        <Col
          xs={{ span: 24, order: 1 }}
          md={{ span: 4, order: 2 }}
        >
          <div style={{ position: 'sticky', top: 20 }}>
            <Row gutter={[16, 16]}>
              {/* INFO CARD */}
              <Col xs={24} md={24}>
                <Card style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: '50%',
                        backgroundColor: statusColor
                      }}
                    />
                    <div>
                      <b>{client.account.nickname}</b>
                    </div>
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <b>{client.server.hostname}</b> - {playerCount}/{client.server.maxPlayers}
                  </div>
                  <div style={{ marginTop: 4 }}>
                    <Button
                      type="default"
                      icon={<EyeOutlined />}
                      onClick={openPlayerList} // Ensure this function is called
                      style={{ width: '100%', marginBottom: 8 }}
                    >
                      Spielerliste
                    </Button>
                  </div>
                </Card>
              </Col>

              {/* ACTION CARDS */}
              <Col xs={12} md={24}>
                <Card style={{ marginBottom: 16 }}>
                  {(client.status === 'stopped' || client.status === 'errored') && (
                    <Button
                      icon={<PlayCircleOutlined />}
                      type="primary"
                      onClick={startBot}
                      style={{ width: '100%' }}
                    >
                      Start
                    </Button>
                  )}
                  {client.status === 'running' && (
                    <>
                      <Button
                        type="default"
                        icon={<EyeOutlined />}
                        onClick={openGallery}
                        style={{ width: '100%', marginBottom: 8 }}
                      >
                        Viewer
                      </Button>
                      <Button
                        icon={<StopOutlined />}
                        danger
                        onClick={stopBot}
                        style={{ width: '100%' }}
                      >
                        Stop
                      </Button>
                    </>
                  )}
                  {(client.status === 'running' || client.status === 'errored') && (
                    <Button
                      icon={<ReloadOutlined />}
                      onClick={rejoinBot}
                      style={{ width: '100%', marginTop: 8 }}
                    >
                      Rejoin
                    </Button>
                  )}
                </Card>
              </Col>

              {/* Additional Action Cards */}
              <Col xs={12} md={24}>
                <Card>
                  <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Switch
                      checked={autoRestart}
                      onChange={onToggleAutorestart}
                    />
                    <span>Autorestart</span>
                  </div>

                  <Popconfirm
                    title="Are you sure you want to delete this client?"
                    onConfirm={handleDelete}
                    okText="Yes"
                    cancelText="No"
                  >
                    <Button
                      icon={<DeleteOutlined />}
                      danger
                      style={{ width: '100%', marginBottom: 8 }}
                    >
                      Delete Client
                    </Button>
                  </Popconfirm>

                  <Button
                    icon={<FileTextOutlined />}
                    onClick={handleExport}
                    style={{ width: '100%' }}
                  >
                    Export Logs
                  </Button>
                </Card>
              </Col>
            </Row>
          </div>
        </Col>

        {/* MAIN CONTENT */}
        <Col
          xs={{ span: 24, order: 2 }}
          md={{ span: 20, order: 1 }}
        >
          {/* TERMINAL */}
          <Card
            style={{
              background: '#000',
              height: 500,
              overflowY: 'auto',
              border: '1px solid #555',
              borderRadius: '8px 8px 0 0',
            }}
            ref={terminalRef}
          >
            {messages.slice(-500).map((m, i) => (
              <div key={i} style={{ display: "flex", marginBottom: 4 }}>
                <div
                  style={{ color: '#fff', marginLeft: 8 }}
                  dangerouslySetInnerHTML={{
                    __html: `<span style='color: #0f0'>${convertToGermanISO(m.timestamp)}:</span> ${ansiToHtmlConverter.toHtml(m.text)}`
                  }}
                />
              </div>
            ))}
          </Card>

          {/* CHAT INPUT */}
          <div style={{ display: 'flex', marginBottom: 16 }}>
            <Input
              style={{
                backgroundColor: '#222',
                color: '#0f0',
                border: '1px solid #555',
                borderRadius: '0 0 0 6px'
              }}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onPressEnter={sendChat}
            />
            <Button
              type="primary"
              onClick={sendChat}
              style={{ borderRadius: '0 0 6px 0' }}
            >
              <SendOutlined />
            </Button>
          </div>

          {/* BLACKLIST */}
          <Card title="Blacklist" style={{ marginBottom: 16 }}>
            <Input.TextArea
              rows={3}
              value={blacklistField}
              onChange={(e) => setBlacklistField(e.target.value)}
            />
          </Card>

          {/* MODULES */}
          <Row gutter={[16, 16]}>
            {/* CHATGPT MODULE */}
            <Col xs={24} sm={24} md={12} lg={12} xl={12}>
              <Card
                title={
                  <Row justify={'space-between'} align={'middle'}>
                    <h3>ChatGPT Module</h3>
                    <Switch checked={chatGptEnabled} onChange={onToggleChatGpt} />
                  </Row>
                }
                bodyStyle={chatGptEnabled ? {} : { display: 'none', padding: 0 }}
              >
                {chatGptEnabled && (
                  <div>
                    <div style={{ marginBottom: 8 }}>
                      <b>API Key:</b><br />
                      <Input
                        value={chatGptApiKey}
                        onChange={(e) => setChatGptApiKey(e.target.value)}
                      />
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <b>Prompt:</b><br />
                      <Input.TextArea
                        rows={2}
                        value={chatGptPrompt}
                        onChange={(e) => setChatGptPrompt(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </Card>
            </Col>

            {/* AUTOSHOP MODULE */}
            <Col xs={24} sm={24} md={12} lg={12} xl={12}>
              <Card
                title={
                  <Row justify={'space-between'} align={'middle'}>
                    <h3>AutoShop Module</h3>
                    <Switch checked={autoShopEnabled} onChange={onToggleAutoShop} />
                  </Row>
                }
                bodyStyle={autoShopEnabled ? {} : { display: 'none', padding: 0 }}
              >
                {autoShopEnabled && (
                  <div>
                    {autoShopChests.map((chest, idx) => (
                      <Card key={idx} style={{ marginBottom: 8 }} title={`Chest #${idx + 1}`}>
                        <div style={{ marginBottom: 8 }}>
                          <b>Plot Number:</b>
                          <Input
                            style={{ width: "100%" }}
                            value={chest.plot}
                            onChange={(e) => {
                              const arr = [...autoShopChests];
                              arr[idx].plot = e.target.value;
                              setAutoShopChests(arr);
                            }}
                          />
                        </div>

                        <Row gutter={[8, 8]} style={{ marginBottom: 8 }}>
                          {/* Label spanning full width */}
                          <Col span={24}>
                            <b>Coordinates (x, y, z):</b>
                          </Col>

                          {/* Input for x */}
                          <Col span={8}>
                            <Input
                              type="number"
                              value={chest.x}
                              onChange={(e) => {
                                const arr = [...autoShopChests];
                                arr[idx].x = Number(e.target.value);
                                setAutoShopChests(arr);
                              }}
                              placeholder="X"
                            />
                          </Col>

                          {/* Input for y */}
                          <Col span={8}>
                            <Input
                              type="number"
                              value={chest.y}
                              onChange={(e) => {
                                const arr = [...autoShopChests];
                                arr[idx].y = Number(e.target.value);
                                setAutoShopChests(arr);
                              }}
                              placeholder="Y"
                            />
                          </Col>

                          {/* Input for z */}
                          <Col span={8}>
                            <Input
                              type="number"
                              value={chest.z}
                              onChange={(e) => {
                                const arr = [...autoShopChests];
                                arr[idx].z = Number(e.target.value);
                                setAutoShopChests(arr);
                              }}
                              placeholder="Z"
                            />
                          </Col>
                        </Row>

                        {/* Items */}
                        {chest.items.map((itm, i2) => (
                          <div
                            key={i2}
                            style={{
                              border: '1px solid #ccc',
                              padding: 8,
                              marginBottom: 8
                            }}
                          >
                            <b>Item Name:</b>
                            <Input
                              style={{ marginLeft: 8, width: 120 }}
                              value={itm.itemName}
                              onChange={(e) => {
                                const arr = [...autoShopChests];
                                arr[idx].items[i2].itemName = e.target.value;
                                setAutoShopChests(arr);
                              }}
                            />
                            <div style={{ marginTop: 4 }}>
                              <b>Price / Piece:</b>
                              <Input
                                type="number"
                                style={{ width: 80, marginLeft: 8 }}
                                value={itm.pricePiece}
                                onChange={(e) => {
                                  const arr = [...autoShopChests];
                                  arr[idx].items[i2].pricePiece = Number(e.target.value);
                                  setAutoShopChests(arr);
                                }}
                              />
                              <b style={{ marginLeft: 16 }}>Price / Stack:</b>
                              <Input
                                type="number"
                                style={{ width: 80, marginLeft: 8 }}
                                value={itm.priceStack}
                                onChange={(e) => {
                                  const arr = [...autoShopChests];
                                  arr[idx].items[i2].priceStack = Number(e.target.value);
                                  setAutoShopChests(arr);
                                }}
                              />
                            </div>
                          </div>
                        ))}
                        <Button
                          onClick={() => {
                            const arr = [...autoShopChests];
                            arr[idx].items.push({
                              itemName: '',
                              pricePiece: 0,
                              priceStack: 0
                            });
                            setAutoShopChests(arr);
                          }}
                        >
                          Add New Item
                        </Button>
                      </Card>
                    ))}
                    <Button
                      onClick={() => {
                        setAutoShopChests([
                          ...autoShopChests,
                          {
                            plot: '',
                            x: 0,
                            y: 64,
                            z: 0,
                            items: []
                          }
                        ]);
                      }}
                    >
                      Add New Chest
                    </Button>
                  </div>
                )}
              </Card>
            </Col>
          </Row>

          {/* Removed the Save All button */}
          {/* <div style={{ marginTop: 16 }}>
            <Button type="primary" onClick={saveAll}>
              Save All
            </Button>
          </div> */}

          {/* Hook Manager Section */}
          <Row gutter={[16, 16]} style={{ marginTop: 32 }}>
            <Col span={24}>
              <HookManager clientId={clientId} />
            </Col>
          </Row>
        </Col>
      </Row>

      {/* Modal for Image Gallery */}
      <Modal
        open={isGalleryVisible}
        footer={null}
        onCancel={() => setIsGalleryVisible(false)}
        width={1000}
        title="Bot Viewer"
      >
        <iframe style={{ width: '100%', height: '600px' }} src={"https://bot-dashboard.meinserver.dev/viewers/" + `${clientId}`} frameBorder="0"></iframe>
      </Modal>

      {/* Modal for Player List */}
      <Modal
        title="Player List"
        visible={isPlayerListVisible}
        onCancel={closePlayerList}
        footer={null}
        width={1000}
        bodyStyle={{ padding: 0 }}
      >
        <Table
          columns={playerColumns}
          dataSource={players}
          rowKey="uuid" // Use 'uuid' assuming it's unique
          loading={playersLoading}
          pagination={{ pageSize: 10 }}
          bordered
          scroll={{ x: 'max-content' }} // Enable horizontal scroll for responsiveness
          size="middle"
        />
      </Modal>
    </MainLayout>
  );
};

export default ClientDetailsPage;
