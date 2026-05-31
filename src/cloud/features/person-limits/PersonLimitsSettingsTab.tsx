/* eslint-disable local/no-inline-styles */
import React, { useState, useEffect } from 'react';
import { Button, Space, Checkbox, Select, InputNumber, Table, ColorPicker, Switch, Typography } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { cloudContainer } from '../../shared/di';
import { settingsServiceToken, assigneeServiceToken, columnServiceToken, personLimitsApplierToken } from '../../shared/di/tokens';
import type { Assignee } from '../../shared/AssigneeService';
import type { ColumnInfo } from '../../shared/ColumnService';

const { Title } = Typography;
const { Option } = Select;

interface PersonLimitRow {
  id: string;
  userId: string;
  userName: string;
  columnIds: string[];
  columnNames: string[];
  limit: number | undefined;
  color: string;
}

export const PersonLimitsSettingsTab: React.FC = () => {
  const [enabled, setEnabled] = useState(false);
  const [limits, setLimits] = useState<PersonLimitRow[]>([]);
  const [availableAssignees, setAvailableAssignees] = useState<Assignee[]>([]);
  const [availableColumns, setAvailableColumns] = useState<ColumnInfo[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [newLimit, setNewLimit] = useState({
    userId: '',
    userName: '',
    columnIds: [] as string[],
    limit: 3 as number | undefined,
    color: '#FF0000',
  });

  const settingsService = cloudContainer.inject(settingsServiceToken);
  const assigneeService = cloudContainer.inject(assigneeServiceToken);
  const columnService = cloudContainer.inject(columnServiceToken);

  const loadSettings = () => {
    const settings = settingsService.getSettings();
    setEnabled(settings.personalWipLimits?.enabled || false);
    setLimits((settings.personalWipLimits?.limits || []).map(l => ({ ...l, limit: l.limit ?? undefined })));
  };

  useEffect(() => {
    loadSettings();
    setAvailableAssignees(assigneeService.getAllAssigneesFromCards());
    setAvailableColumns(columnService.getColumns());
  }, []);

  const handleColumnToggle = (columnId: string) => {
    setNewLimit(prev => ({
      ...prev,
      columnIds: prev.columnIds.includes(columnId)
        ? prev.columnIds.filter(id => id !== columnId)
        : [...prev.columnIds, columnId],
    }));
  };

  const handleAddLimit = () => {
    if (!newLimit.userId || newLimit.columnIds.length === 0) return;

    const selectedUser = availableAssignees.find(a => a.id === newLimit.userId);
    if (!selectedUser) return;

    const selectedColumns = availableColumns.filter(c => newLimit.columnIds.includes(c.id));

    const finalLimit = newLimit.limit && newLimit.limit >= 1 ? newLimit.limit : 1;

    const newLimitRow: PersonLimitRow = {
      id: `limit-${Date.now()}`,
      userId: newLimit.userId,
      userName: selectedUser.name,
      columnIds: newLimit.columnIds,
      columnNames: selectedColumns.map(c => c.name),
      limit: finalLimit,
      color: newLimit.color,
    };

    setLimits(prev => [...prev, newLimitRow]);
    setNewLimit({
      userId: '',
      userName: '',
      columnIds: [],
      limit: 3 as number | undefined,
      color: '#FF0000',
    });
  };

  const handleDeleteLimit = (id: string) => {
    setLimits(prev => prev.filter(l => l.id !== id));
  };

  const handleUpdateLimit = (id: string, field: keyof PersonLimitRow, value: any) => {
    setLimits(prev => prev.map(l => (l.id === id ? { ...l, [field]: value } : l)));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const sanitizedLimits = limits.map(l => ({
        ...l,
        limit: l.limit && l.limit >= 1 ? l.limit : 1,
      }));
      await settingsService.updateSettings({
        personalWipLimits: { enabled, limits: sanitizedLimits },
      });
      const applier = cloudContainer.inject(personLimitsApplierToken);
      applier.update();
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    loadSettings();
  };

  const tableColumns = [
    {
      title: 'Исполнитель',
      dataIndex: 'userName',
      key: 'userName',
    },
    {
      title: 'Колонки',
      dataIndex: 'columnNames',
      key: 'columnNames',
      render: (names: string[]) => names.join(', '),
    },
    {
      title: 'Лимит',
      key: 'limit',
      render: (_: any, record: PersonLimitRow) => (
        <InputNumber
          min={1}
          value={record.limit}
          onChange={val => handleUpdateLimit(record.id, 'limit', val ?? undefined)}
          style={{ width: 80 }}
        />
      ),
    },
    {
      title: 'Цвет',
      key: 'color',
      render: (_: any, record: PersonLimitRow) => (
        <ColorPicker
          value={record.color}
          onChange={c => handleUpdateLimit(record.id, 'color', c.toHexString())}
          size="small"
        />
      ),
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (_: any, record: PersonLimitRow) => (
        <Button icon={<DeleteOutlined />} size="small" danger onClick={() => handleDeleteLimit(record.id)}>
          Удалить
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Title level={4} style={{ marginTop: 0 }}>
        Персональные WIP-лимиты
      </Title>

      <div style={{ marginBottom: 16 }}>
        <Switch checked={enabled} onChange={setEnabled} checkedChildren="Включено" unCheckedChildren="Выключено" />
        <span style={{ marginLeft: 8 }}>Включить персональные WIP-лимиты</span>
      </div>

      {enabled && (
        <>
          <div style={{ marginBottom: 24, padding: 16, border: '1px solid #d9d9d9', borderRadius: 8 }}>
            <Title level={5} style={{ marginTop: 0 }}>
              Добавить новый лимит
            </Title>

            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <div>
                <label>Исполнитель:</label>
                <Select
                  value={newLimit.userId || undefined}
                  onChange={value => {
                    const user = availableAssignees.find(a => a.id === value);
                    setNewLimit(prev => ({ ...prev, userId: value, userName: user?.name || '' }));
                  }}
                  style={{ marginLeft: 10, width: 200 }}
                  placeholder="Выберите исполнителя"
                >
                  {availableAssignees.map(a => (
                    <Option key={a.id} value={a.id}>
                      {a.name}
                    </Option>
                  ))}
                </Select>
              </div>

              <div>
                <label>Колонки:</label>
                <div style={{ marginTop: 8 }}>
                  <Space wrap>
                    {availableColumns.map(col => (
                      <Checkbox
                        key={col.id}
                        checked={newLimit.columnIds.includes(col.id)}
                        onChange={() => handleColumnToggle(col.id)}
                      >
                        {col.name}
                      </Checkbox>
                    ))}
                  </Space>
                </div>
              </div>

              <div>
                <label>Лимит:</label>
                <InputNumber
                  min={1}
                  value={newLimit.limit}
                  onChange={val => setNewLimit(prev => ({ ...prev, limit: val ?? undefined }))}
                  style={{ marginLeft: 10, width: 80 }}
                />
              </div>

              <div>
                <label>Цвет:</label>
                <ColorPicker
                  value={newLimit.color}
                  onChange={c => setNewLimit(prev => ({ ...prev, color: c.toHexString() }))}
                  style={{ marginLeft: 10 }}
                />
              </div>

              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAddLimit}
                disabled={!newLimit.userId || newLimit.columnIds.length === 0}
              >
                Добавить лимит
              </Button>
            </Space>
          </div>

          <div>
            <Title level={5}>Текущие лимиты</Title>
            {limits.length === 0 ? (
              <p>Лимиты не настроены</p>
            ) : (
              <Table dataSource={limits} columns={tableColumns} rowKey="id" size="middle" pagination={false} />
            )}
          </div>
        </>
      )}

      <Space style={{ marginTop: 16, width: '100%', display: 'flex', justifyContent: 'flex-end' }}>
        <Button type="primary" onClick={handleSave} loading={isSaving}>
          Сохранить
        </Button>
        <Button onClick={handleCancel} disabled={isSaving}>
          Отмена
        </Button>
      </Space>
    </div>
  );
};
