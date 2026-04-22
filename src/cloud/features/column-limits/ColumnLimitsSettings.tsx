// src/cloud/features/column-limits/ColumnLimitsSettings.tsx
// React-компонент настроек групповых WIP-лимитов (Ant Design)

import React, { useState, useEffect } from 'react';
import { Checkbox, Input, InputNumber, Button, Table, Space, Switch, ColorPicker, Typography, Card } from 'antd';
import type { Color } from 'antd/es/color-picker';
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { cloudContainer } from '../../shared/di';
import { settingsServiceToken, columnServiceToken } from '../../shared/di/tokens';
import type { ColumnInfo } from '../../shared/ColumnService';
import settingsStyles from '../../ui/settings.module.css';

const { Title } = Typography;

interface ColumnGroupLimitRow {
  id: string;
  name: string;
  columnIds: string[];
  columnNames: string[];
  limit: number;
  baseColor: string;
  warningColor?: string;
}

export const ColumnLimitsSettings: React.FC = () => {
  const [enabled, setEnabled] = useState(false);
  const [limits, setLimits] = useState<ColumnGroupLimitRow[]>([]);
  const [availableColumns, setAvailableColumns] = useState<ColumnInfo[]>([]);
  const [newLimit, setNewLimit] = useState({
    name: '',
    columnIds: [] as string[],
    limit: 10,
    baseColor: '#E3F2FD',
    warningColor: '#FF0000',
  });

  useEffect(() => {
    loadSettings();
    loadData();
  }, []);

  const loadSettings = () => {
    const settingsService = cloudContainer.inject(settingsServiceToken);
    const settings = settingsService.getSettings();
    setEnabled(settings.columnGroupWipLimits?.enabled || false);
    setLimits(settings.columnGroupWipLimits?.limits || []);
  };

  const loadData = () => {
    const columnService = cloudContainer.inject(columnServiceToken);
    setAvailableColumns(columnService.getColumns());
  };

  const handleToggleEnabled = (checked: boolean) => {
    const settingsService = cloudContainer.inject(settingsServiceToken);
    setEnabled(checked);
    settingsService.updateSettings({
      columnGroupWipLimits: {
        enabled: checked,
        limits,
      },
    });
  };

  const handleAddLimit = () => {
    const settingsService = cloudContainer.inject(settingsServiceToken);
    if (!newLimit.name || newLimit.columnIds.length === 0) return;

    const selectedColumns = availableColumns.filter(c => newLimit.columnIds.includes(c.id));

    const newLimitRow: ColumnGroupLimitRow = {
      id: `group-${Date.now()}`,
      name: newLimit.name,
      columnIds: newLimit.columnIds,
      columnNames: selectedColumns.map(c => c.name),
      limit: newLimit.limit,
      baseColor: newLimit.baseColor,
      warningColor: newLimit.warningColor,
    };

    const updatedLimits = [...limits, newLimitRow];
    setLimits(updatedLimits);
    settingsService.updateSettings({
      columnGroupWipLimits: {
        enabled,
        limits: updatedLimits,
      },
    });

    setNewLimit({
      name: '',
      columnIds: [],
      limit: 10,
      baseColor: '#E3F2FD',
      warningColor: '#FF0000',
    });
  };

  const handleDeleteLimit = (id: string) => {
    const settingsService = cloudContainer.inject(settingsServiceToken);
    const updatedLimits = limits.filter(l => l.id !== id);
    setLimits(updatedLimits);
    settingsService.updateSettings({
      columnGroupWipLimits: {
        enabled,
        limits: updatedLimits,
      },
    });
  };

  const handleEditLimit = (id: string) => {
    console.log('Редактирование группы:', id);
  };

  const handleUpdateLimit = (id: string, field: keyof ColumnGroupLimitRow, value: any) => {
    const settingsService = cloudContainer.inject(settingsServiceToken);
    const updatedLimits = limits.map(l => {
      if (l.id === id) {
        return { ...l, [field]: value };
      }
      return l;
    });
    setLimits(updatedLimits);
    settingsService.updateSettings({
      columnGroupWipLimits: {
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

  const handleBaseColorChange = (color: Color) => {
    setNewLimit({ ...newLimit, baseColor: color.toHexString() });
  };

  const handleWarningColorChange = (color: Color) => {
    setNewLimit({ ...newLimit, warningColor: color.toHexString() });
  };

  const handleLimitBaseColorChange = (id: string, color: Color) => {
    handleUpdateLimit(id, 'baseColor', color.toHexString());
  };

  const handleLimitWarningColorChange = (id: string, color: Color) => {
    handleUpdateLimit(id, 'warningColor', color.toHexString());
  };

  // Колонки таблицы
  const columns = [
    {
      title: 'Название',
      dataIndex: 'name',
      key: 'name',
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
      render: (_: any, record: ColumnGroupLimitRow) => (
        <InputNumber
          min={1}
          value={record.limit}
          onChange={(val) => handleUpdateLimit(record.id, 'limit', val || 0)}
          style={{ width: 80 }}
        />
      ),
    },
    {
      title: 'Базовый цвет',
      key: 'baseColor',
      render: (_: any, record: ColumnGroupLimitRow) => (
        <ColorPicker
          value={record.baseColor}
          onChange={(color) => handleLimitBaseColorChange(record.id, color)}
          size="small"
        />
      ),
    },
    {
      title: 'Цвет при превышении',
      key: 'warningColor',
      render: (_: any, record: ColumnGroupLimitRow) => (
        <ColorPicker
          value={record.warningColor || '#FF0000'}
          onChange={(color) => handleLimitWarningColorChange(record.id, color)}
          size="small"
        />
      ),
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (_: any, record: ColumnGroupLimitRow) => (
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
      <Title level={2}>Групповые WIP-лимиты</Title>

      <div style={{ marginBottom: '20px' }}>
        <Switch
          checked={enabled}
          onChange={handleToggleEnabled}
          checkedChildren="Включено"
          unCheckedChildren="Выключено"
        />
        <span style={{ marginLeft: '8px' }}>Включить групповые WIP-лимиты</span>
      </div>

      {enabled && (
        <>
          <Card title="Добавить новую группу" style={{ marginBottom: '30px' }}>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <div>
                <label>Название группы:</label>
                <Input
                  value={newLimit.name}
                  onChange={(e) => setNewLimit({ ...newLimit, name: e.target.value })}
                  placeholder="Например: В разработке"
                  style={{ marginLeft: '10px', width: 250 }}
                />
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
                <label>Базовый цвет:</label>
                <ColorPicker
                  value={newLimit.baseColor}
                  onChange={handleBaseColorChange}
                  style={{ marginLeft: '10px' }}
                />
              </div>

              <div>
                <label>Цвет при превышении:</label>
                <ColorPicker
                  value={newLimit.warningColor}
                  onChange={handleWarningColorChange}
                  style={{ marginLeft: '10px' }}
                />
              </div>

              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAddLimit}
                disabled={!newLimit.name || newLimit.columnIds.length === 0}
              >
                Добавить группу
              </Button>
            </Space>
          </Card>

          <div>
            <Title level={4}>Текущие группы</Title>
            {limits.length === 0 ? (
              <p>Группы не настроены</p>
            ) : (
              <Table
                dataSource={limits}
                columns={columns}
                rowKey="id"
                size="middle"
                scroll={{ x: 900 }}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ColumnLimitsSettings;
