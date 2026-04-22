// src/cloud/features/person-limits/PersonLimitsSettings.tsx
// React-компонент настроек персональных WIP-лимитов (Ant Design)

import React, { useState, useEffect } from 'react';
import { Checkbox, Select, InputNumber, Button, Table, Space, Switch, ColorPicker, Typography } from 'antd';
import type { Color } from 'antd/es/color-picker';
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { cloudContainer } from '../../shared/di';
import { settingsServiceToken, assigneeServiceToken, columnServiceToken } from '../../shared/di/tokens';
import type { Settings } from '../../shared/SettingsService';
import type { Assignee } from '../../shared/AssigneeService';
import type { ColumnInfo } from '../../shared/ColumnService';
import settingsStyles from '../../ui/settings.module.css';
import styles from './settings.module.css';

const { Title } = Typography;
const { Option } = Select;

interface PersonLimitRow {
  id: string;
  userId: string;
  userName: string;
  columnIds: string[];
  columnNames: string[];
  limit: number;
  color: string;
}

export const PersonLimitsSettings: React.FC = () => {
  const [enabled, setEnabled] = useState(false);
  const [limits, setLimits] = useState<PersonLimitRow[]>([]);
  const [availableAssignees, setAvailableAssignees] = useState<Assignee[]>([]);
  const [availableColumns, setAvailableColumns] = useState<ColumnInfo[]>([]);
  const [newLimit, setNewLimit] = useState({
    userId: '',
    userName: '',
    columnIds: [] as string[],
    limit: 3,
    color: '#FF0000',
  });

  useEffect(() => {
    loadSettings();
    loadData();
  }, []);

  const loadSettings = () => {
    const settingsService = cloudContainer.inject(settingsServiceToken);
    const settings = settingsService.getSettings();
    setEnabled(settings.personalWipLimits?.enabled || false);
    setLimits(settings.personalWipLimits?.limits || []);
  };

  const loadData = () => {
    const assigneeService = cloudContainer.inject(assigneeServiceToken);
    const columnService = cloudContainer.inject(columnServiceToken);
    setAvailableAssignees(assigneeService.getAllAssigneesFromCards());
    setAvailableColumns(columnService.getColumns());
  };

  const handleToggleEnabled = (checked: boolean) => {
    const settingsService = cloudContainer.inject(settingsServiceToken);
    setEnabled(checked);
    settingsService.updateSettings({
      personalWipLimits: {
        enabled: checked,
        limits,
      },
    });
  };

  const handleAddLimit = () => {
    const settingsService = cloudContainer.inject(settingsServiceToken);
    if (!newLimit.userId || newLimit.columnIds.length === 0) return;

    const selectedUser = availableAssignees.find(a => a.id === newLimit.userId);
    if (!selectedUser) return;

    const selectedColumns = availableColumns.filter(c => newLimit.columnIds.includes(c.id));

    const newLimitRow: PersonLimitRow = {
      id: `limit-${Date.now()}`,
      userId: newLimit.userId,
      userName: selectedUser.name,
      columnIds: newLimit.columnIds,
      columnNames: selectedColumns.map(c => c.name),
      limit: newLimit.limit,
      color: newLimit.color,
    };

    const updatedLimits = [...limits, newLimitRow];
    setLimits(updatedLimits);
    settingsService.updateSettings({
      personalWipLimits: {
        enabled,
        limits: updatedLimits,
      },
    });

    setNewLimit({
      userId: '',
      userName: '',
      columnIds: [],
      limit: 3,
      color: '#FF0000',
    });
  };

  const handleDeleteLimit = (id: string) => {
    const settingsService = cloudContainer.inject(settingsServiceToken);
    const updatedLimits = limits.filter(l => l.id !== id);
    setLimits(updatedLimits);
    settingsService.updateSettings({
      personalWipLimits: {
        enabled,
        limits: updatedLimits,
      },
    });
  };

  const handleEditLimit = (id: string) => {
    console.log('Редактирование лимита:', id);
  };

  const handleUpdateLimit = (id: string, field: keyof PersonLimitRow, value: any) => {
    const settingsService = cloudContainer.inject(settingsServiceToken);
    const updatedLimits = limits.map(l => {
      if (l.id === id) {
        return { ...l, [field]: value };
      }
      return l;
    });
    setLimits(updatedLimits);
    settingsService.updateSettings({
      personalWipLimits: {
        enabled,
        limits: updatedLimits,
      },
    });
  };

  const handleColumnToggle = (columnId: string) => {
    const newColumnIds = newLimit.columnIds.includes(columnId)
      ? newLimit.columnIds.filter(id => id !== columnId)
      : [...newLimit.columnIds, columnId];
    setNewLimit({ ...newLimit, columnIds: newColumnIds });
  };

  const handleColorChange = (color: Color) => {
    const hex = color.toHexString();
    setNewLimit({ ...newLimit, color: hex });
  };

  const handleLimitColorChange = (id: string, color: Color) => {
    handleUpdateLimit(id, 'color', color.toHexString());
  };

  // Колонки таблицы
  const columns = [
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
          min={0}
          value={record.limit}
          onChange={(val) => handleUpdateLimit(record.id, 'limit', val || 0)}
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
          onChange={(color) => handleLimitColorChange(record.id, color)}
          size="small"
        />
      ),
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (_: any, record: PersonLimitRow) => (
        <Space>
          <Button
            icon={<EditOutlined />}
            size="small"
            onClick={() => handleEditLimit(record.id)}
          >
            Редактировать
          </Button>
          <Button
            icon={<DeleteOutlined />}
            size="small"
            danger
            onClick={() => handleDeleteLimit(record.id)}
          >
            Удалить
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className={settingsStyles.panel} style={{ padding: '20px' }}>
      <Title level={2}>Персональные WIP-лимиты</Title>

      <div style={{ marginBottom: '20px' }}>
        <Switch
          checked={enabled}
          onChange={handleToggleEnabled}
          checkedChildren="Включено"
          unCheckedChildren="Выключено"
        />
        <span style={{ marginLeft: '8px' }}>Включить персональные WIP-лимиты</span>
      </div>

      {enabled && (
        <>
          <div style={{ marginBottom: '30px', padding: '15px', border: '1px solid #d9d9d9', borderRadius: '8px' }}>
            <Title level={4}>Добавить новый лимит</Title>

            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <div>
                <label>Исполнитель:</label>
                <Select
                  value={newLimit.userId}
                  onChange={(value) => {
                    const selectedUser = availableAssignees.find(a => a.id === value);
                    setNewLimit({
                      ...newLimit,
                      userId: value,
                      userName: selectedUser?.name || '',
                    });
                  }}
                  style={{ marginLeft: '10px', width: 200 }}
                  placeholder="Выберите исполнителя"
                >
                  {availableAssignees.map(assignee => (
                    <Option key={assignee.id} value={assignee.id}>
                      {assignee.name}
                    </Option>
                  ))}
                </Select>
              </div>

              <div>
                <label>Колонки:</label>
                <div style={{ marginTop: '8px' }}>
                  <Space wrap>
                    {availableColumns.map(column => (
                      <Checkbox
                        key={column.id}
                        checked={newLimit.columnIds.includes(column.id)}
                        onChange={() => handleColumnToggle(column.id)}
                      >
                        {column.name}
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
                  onChange={(val) => setNewLimit({ ...newLimit, limit: val || 0 })}
                  style={{ marginLeft: '10px', width: 80 }}
                />
              </div>

              <div>
                <label>Цвет:</label>
                <ColorPicker
                  value={newLimit.color}
                  onChange={handleColorChange}
                  style={{ marginLeft: '10px' }}
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
            <Title level={4}>Текущие лимиты</Title>
            {limits.length === 0 ? (
              <p>Лимиты не настроены</p>
            ) : (
              <Table
                dataSource={limits}
                columns={columns}
                rowKey="id"
                size="middle"
                scroll={{ x: 800 }}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default PersonLimitsSettings;
