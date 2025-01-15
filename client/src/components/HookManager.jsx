import React, { useEffect, useState } from 'react';
import {
  Button, Modal, Form, Select, Input, InputNumber, Space, Table, Popconfirm, message, Collapse,
  Divider, Tooltip, Card, Alert
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, ScheduleOutlined, SettingOutlined,
  ArrowDownOutlined, ExclamationCircleOutlined
} from '@ant-design/icons';
import { fetchWithAuth } from '../utils/fetchWithAuth';

const { Option } = Select;
const { Panel } = Collapse;
const { confirm } = Modal;

const HookItem = ({
  field,               // Feld-Index (Form.List)
  form,                // Ant-Design-Form-Instance
  hookEvents,          // Liste der verfügbaren Events
  actionTypes,         // Liste der verfügbaren Action-Typen
  parentPath,          // Pfad in der Form-Struktur (z. B. ["hooks", 0, "data", "nestedHooks"])
  remove               // remove-Funktion von Form.List
}) => {

  const [availableVariables, setAvailableVariables] = useState([]);    // Event-Variablen-Placeholder
  const [typeFields, setTypeFields] = useState({});                    // Dynamische Felder für Action
  const [selectedEvent, setSelectedEvent] = useState(null);            // Merkt sich das aktuell gewählte Event

  const handleEventChange = (value) => {
    const foundEvent = hookEvents.find(e => e.name === value) || null;
    setSelectedEvent(foundEvent);

    if (foundEvent) {
      const placeholders = (foundEvent.params || []).map(p => `{{${p}}}`);
      setAvailableVariables(placeholders);

      form.setFieldsValue({
        [field.name]: {
          ...form.getFieldsValue()[field.name],
          type: undefined,
          actions: [],
          nestedHooks: [],
        }
      });

      setTypeFields({});
    } else {
      setAvailableVariables([]);
      setSelectedEvent(null);
      setTypeFields({});
    }
  };

  const handleActionTypeChange = (value) => {
    const foundActionType = actionTypes.find(a => a.name === value);
    if (foundActionType) {
      const dynamicFields = foundActionType.fields.reduce((acc, f) => {
        acc[f.key] = {
          label: f.label,
          component: (f.type === 'string')
            ? <Input placeholder={`Enter ${f.label}`} />
            : (f.type === 'number')
              ? <InputNumber placeholder={`Enter ${f.label}`} style={{ width: '100%' }} />
              : <Input placeholder={`Enter ${f.label}`} />
        };
        return acc;
      }, {});
      setTypeFields(dynamicFields);
    } else {
      setTypeFields({});
    }
  };

  const confirmDeleteHook = () => {
    confirm({
      title: 'Are you sure you want to delete this hook?',
      icon: <ExclamationCircleOutlined />,
      content: 'This action cannot be undone.',
      okText: 'Yes',
      okType: 'danger',
      cancelText: 'No',
      onOk() {
        remove(field.name);
      }
    });
  };

  return (
    <Collapse defaultActiveKey={['mainHook']} style={{ marginBottom: 16 }}>
      <Panel
        key="mainHook"
        header={
          <Space>
            <SettingOutlined />
            <span>Hook</span>
          </Space>
        }
        extra={
          <DeleteOutlined style={{ color: 'red' }} onClick={confirmDeleteHook} />
        }
      >
        <Form.Item
          name={[field.name, 'name']}
          label={<Space><ScheduleOutlined /><span>Event</span></Space>}
          rules={[{ required: true, message: 'Please select an event' }]}
        >
          <Select
            placeholder="Select an event"
            onChange={handleEventChange}
          >
            {hookEvents.map(ev => (
              <Option key={ev.name} value={ev.name}>
                {ev.name}
              </Option>
            ))}
          </Select>
        </Form.Item>

        {availableVariables.length > 0 && (
          <Alert
            style={{ marginBottom: 16 }}
            type="info"
            showIcon
            message="Available Variables"
            description={
              <div>
                You can use the following variables in your Actions:
                <ul>
                  {availableVariables.map((v) => (
                    <li key={v}>{v}</li>
                  ))}
                </ul>
              </div>
            }
          />
        )}

        <Form.Item
          name={[field.name, 'type']}
          label={<Space><SettingOutlined /><span>Action Type</span></Space>}
          rules={[{ required: false }]}
        >
          <Select
            placeholder="(optional) Select main action type"
            onChange={handleActionTypeChange}
            allowClear
          >
            {actionTypes.map(a => (
              <Option key={a.name} value={a.name}>
                {a.name}
              </Option>
            ))}
          </Select>
        </Form.Item>

        {Object.keys(typeFields).length > 0 && (
          <Card size="small" title="Main Action Parameters" style={{ marginBottom: 16 }}>
            {Object.entries(typeFields).map(([key, cfg]) => (
              <Form.Item
                key={key}
                name={[field.name, 'data', 'typeData', key]}
                label={cfg.label}
                rules={[{ required: false }]}
              >
                {cfg.component}
              </Form.Item>
            ))}
          </Card>
        )}

        <Divider orientation="left">Actions</Divider>
        <Form.List name={[field.name, 'data', 'actions']}>
          {(actionFields, { add: addAction, remove: removeAction }) => (
            <>
              {actionFields.map((actionField, idx) => (
                <Collapse key={actionField.key} defaultActiveKey={[`action-${actionField.key}`]} style={{ marginBottom: 8 }}>
                  <Panel
                    key={`action-${actionField.key}`}
                    header={
                      <Space>
                        <SettingOutlined />
                        <span>Action {idx + 1}</span>
                      </Space>
                    }
                    extra={
                      <Popconfirm
                        title="Are you sure to delete this action?"
                        onConfirm={() => removeAction(actionField.name)}
                        okText="Yes"
                        cancelText="No"
                      >
                        <DeleteOutlined style={{ color: 'red' }} />
                      </Popconfirm>
                    }
                  >
                    <Form.Item
                      name={[actionField.name, 'type']}
                      label={<Space><SettingOutlined /><span>Action Type</span></Space>}
                      rules={[{ required: true, message: 'Please select an action type' }]}
                    >
                      <Select
                        placeholder="Select an action type"
                        onChange={() => { }}
                      >
                        {actionTypes.map(a => (
                          <Option key={a.name} value={a.name}>
                            {a.name}
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>

                    <Form.List name={[actionField.name, 'conditions']}>
                      {(condFields, { add: addCond, remove: removeCond }) => (
                        <>
                          <Divider orientation="left">Conditions</Divider>
                          {condFields.map((condField, cIdx) => (
                            <Card
                              key={condField.key}
                              size="small"
                              title={`Condition ${cIdx + 1}`}
                              style={{ marginBottom: 8 }}
                              extra={
                                <Popconfirm
                                  title="Are you sure to delete this condition?"
                                  onConfirm={() => removeCond(condField.name)}
                                  okText="Yes"
                                  cancelText="No"
                                >
                                  <DeleteOutlined style={{ color: 'red' }} />
                                </Popconfirm>
                              }
                            >
                              <Form.Item
                                name={[condField.name, 'field']}
                                label="Field"
                                rules={[{ required: true, message: 'Select variable to compare' }]}
                              >
                                <Select placeholder="e.g., {{username}}">
                                  {availableVariables.map((v) => (
                                    <Option key={v} value={v}>{v}</Option>
                                  ))}
                                </Select>
                              </Form.Item>
                              <Form.Item
                                name={[condField.name, 'operator']}
                                label="Operator"
                                rules={[{ required: true, message: 'Select operator' }]}
                              >
                                <Select placeholder="Select operator">
                                  <Option value="equals">equals</Option>
                                  <Option value="not_equals">not equals</Option>
                                  <Option value="contains">contains</Option>
                                  <Option value="startsWith">starts with</Option>
                                  <Option value="endsWith">ends with</Option>
                                </Select>
                              </Form.Item>
                              <Form.Item
                                name={[condField.name, 'compareValue']}
                                label="Compare Value"
                                rules={[{ required: true, message: 'Enter value to compare' }]}
                              >
                                <Input placeholder="Enter value or variable" />
                              </Form.Item>
                            </Card>
                          ))}
                          <Button
                            type="dashed"
                            onClick={() => addCond()}
                            icon={<PlusOutlined />}
                            block
                          >
                            Add Condition
                          </Button>
                        </>
                      )}
                    </Form.List>

                    <Form.Item shouldUpdate>
                      {({ getFieldValue }) => {
                        const currentActionType = getFieldValue([
                          ...parentPath,
                          field.name,
                          'data',
                          'actions',
                          actionField.name,
                          'type'
                        ]);
                        const foundType = actionTypes.find(a => a.name === currentActionType);
                        if (foundType && foundType.fields.length > 0) {
                          return (
                            <Card size="small" title="Action Parameters" style={{ marginTop: 8 }}>
                              {foundType.fields.map(ft => (
                                <Form.Item
                                  key={ft.key}
                                  name={[actionField.name, 'typeData', ft.key]}
                                  label={ft.label}
                                  rules={[{ required: false }]}
                                >
                                  {ft.type === 'string' ? (
                                    <Input placeholder={`Enter ${ft.label}`} />
                                  ) : ft.type === 'number' ? (
                                    <InputNumber placeholder={`Enter ${ft.label}`} style={{ width: '100%' }} />
                                  ) : (
                                    <Input placeholder={`Enter ${ft.label}`} />
                                  )}
                                </Form.Item>
                              ))}
                            </Card>
                          );
                        }
                        return null;
                      }}
                    </Form.Item>
                  </Panel>
                </Collapse>
              ))}
              <Button
                type="dashed"
                onClick={() => addAction()}
                block
                icon={<PlusOutlined />}
                style={{ marginBottom: 16 }}
              >
                Add Action
              </Button>
            </>
          )}
        </Form.List>

        <Divider orientation="left">Nested Hooks</Divider>
        <Form.List name={[field.name, 'data', 'nestedHooks']}>
          {(nestedFields, { add: addNested, remove: removeNested }) => (
            <>
              {nestedFields.map(nestedField => (
                <HookItem
                  key={nestedField.key}
                  field={nestedField}
                  form={form}
                  hookEvents={hookEvents}
                  actionTypes={actionTypes}
                  parentPath={[...parentPath, 'nestedHooks']}
                  remove={removeNested}
                />
              ))}
              <Button
                type="dashed"
                onClick={() => addNested()}
                block
                icon={<PlusOutlined />}
              >
                Add Nested Hook
              </Button>
            </>
          )}
        </Form.List>
      </Panel>
    </Collapse>
  );
};

const HookManager = ({ clientId }) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [hooks, setHooks] = useState([]);
  const [form] = Form.useForm();
  const [editingHook, setEditingHook] = useState(null);
  const [hookEvents, setHookEvents] = useState([]);
  const [actionTypes, setActionTypes] = useState([]);

  const loadHookEvents = async () => {
    try {
      const res = await fetchWithAuth('/hooks/events', {}, null);
      if (!res.ok) {
        throw new Error('Failed to fetch hook events');
      }
      const data = await res.json();
      setHookEvents(data);
    } catch (error) {
      console.error(error);
      message.error('Error loading hook events');
    }
  };

  const loadActionTypes = async () => {
    try {
      const res = await fetchWithAuth('/hooks/types', {}, null);
      if (!res.ok) {
        throw new Error('Failed to fetch action types');
      }
      const data = await res.json();
      setActionTypes(data);
    } catch (error) {
      console.error(error);
      message.error('Error loading action types');
    }
  };

  const loadHooks = async () => {
    try {
      const res = await fetchWithAuth(`/clients/${clientId}/hooks`, {}, null);
      if (!res.ok) {
        throw new Error('Failed to fetch hooks');
      }
      const data = await res.json();
      console.log("Fetched Hooks Data:", data, "Is Array:", Array.isArray(data));

      if (Array.isArray(data)) {
        setHooks(data);
      } else if (data.hooks && Array.isArray(data.hooks)) {
        setHooks(data.hooks);
      } else {
        console.error("Invalid hooks data format:", data);
        message.error("Invalid hooks data format.");
        setHooks([]);
      }
    } catch (error) {
      console.error(error);
      message.error('Error loading hooks');
      setHooks([]);
    }
  };

  useEffect(() => {
    loadHookEvents();
    loadActionTypes();
    loadHooks();
    // eslint-disable-next-line
  }, [clientId]);


  const showModal = () => {
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    setEditingHook(null);
    form.resetFields();
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      let updatedHooks = [...hooks];

      if (editingHook) {
        const idx = updatedHooks.findIndex(h => h.id === editingHook.id);
        if (idx !== -1) {
          updatedHooks[idx] = { ...editingHook, ...values.hooks[0] };
        }
      } else {
        const newHook = {
          id: Date.now(),
          ...values.hooks[0]
        };
        updatedHooks.push(newHook);
      }

      const res = await fetchWithAuth(`/clients/${clientId}/hooks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hooks: updatedHooks })
      }, null);

      if (res.ok) {
        message.success(`Hook ${editingHook ? 'updated' : 'added'} successfully`);
        setHooks(updatedHooks);
        handleCancel();
      } else {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to save hooks');
      }

    } catch (error) {
      console.error(error);
      message.error(error.message || 'Error saving hook');
    }
  };

  const handleDelete = async (hookId) => {
    try {
      const updatedHooks = hooks.filter(h => h.id !== hookId);
      const res = await fetchWithAuth(`/clients/${clientId}/hooks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hooks: updatedHooks })
      }, null);

      if (res.ok) {
        message.success('Hook deleted successfully');
        setHooks(updatedHooks);
      } else {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to delete hook');
      }
    } catch (error) {
      console.error(error);
      message.error(error.message || 'Error deleting hook');
    }
  };

  const columns = [
    {
      title: 'Event',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type'
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="middle">
          <Tooltip title="Edit Hook">
            <Button
              icon={<EditOutlined />}
              onClick={() => {
                setEditingHook(record);
                form.setFieldsValue({
                  hooks: [record]
                });
                setIsModalVisible(true);
              }}
            />
          </Tooltip>
          <Popconfirm
            title="Are you sure to delete this hook?"
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Tooltip title="Delete Hook">
              <Button icon={<DeleteOutlined />} danger />
            </Tooltip>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <Card
      title="Hook Manager"
      extra={
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={showModal}
        >
          Create Hook
        </Button>
      }
    >
      <Table
        columns={columns}
        dataSource={hooks}
        rowKey="id"
        pagination={{ pageSize: 5 }}
        style={{ marginBottom: 16 }}
      />

      <Modal
        title={editingHook ? 'Edit Hook' : 'Add New Hook'}
        open={isModalVisible}
        onOk={handleOk}
        onCancel={handleCancel}
        width={1200}
        destroyOnClose
        footer={[
          <Button key="cancel" onClick={handleCancel}>
            Cancel
          </Button>,
          <Button key="ok" type="primary" onClick={handleOk}>
            {editingHook ? 'Update' : 'Add'} Hook
          </Button>,
        ]}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            hooks: [{}]
          }}
        >
          <Form.List name="hooks">
            {(fields, { add, remove }) => (
              <>
                {fields.map((mainField) => (
                  <HookItem
                    key={mainField.key}
                    field={mainField}
                    form={form}
                    hookEvents={hookEvents}
                    actionTypes={actionTypes}
                    parentPath={['hooks']}
                    remove={remove}
                  />
                ))}
                <Form.Item>
                  <Button
                    type="dashed"
                    onClick={() => add()}
                    block
                    icon={<PlusOutlined />}
                  >
                    Add Hook
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>
        </Form>
      </Modal>
    </Card>
  );
};

export default HookManager;
