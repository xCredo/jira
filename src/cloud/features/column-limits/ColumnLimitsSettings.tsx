// src/cloud/features/column-limits/ColumnLimitsSettings.tsx
// React-компонент настроек групповых WIP-лимитов

import React, { useState, useEffect } from 'react';
import { settingsService, ColumnGroupWipLimitSettings } from '../../shared/SettingsService';
import { columnService, ColumnInfo } from '../../shared/ColumnService';

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
    const settings = settingsService.getSettings();
    setEnabled(settings.columnGroupWipLimits?.enabled || false);
    setLimits(settings.columnGroupWipLimits?.limits || []);
  };

  const loadData = () => {
    setAvailableColumns(columnService.getColumns());
  };

  const handleToggleEnabled = () => {
    const newEnabled = !enabled;
    setEnabled(newEnabled);
    settingsService.updateSettings({
      columnGroupWipLimits: {
        enabled: newEnabled,
        limits: limits,
      },
    });
  };

  const handleAddLimit = () => {
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
    const updatedLimits = limits.filter(l => l.id !== id);
    setLimits(updatedLimits);
    settingsService.updateSettings({
      columnGroupWipLimits: {
        enabled,
        limits: updatedLimits,
      },
    });
  };

  const handleUpdateLimit = (id: string, field: keyof ColumnGroupLimitRow, value: any) => {
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

  return (
    <div className="column-limits-settings" style={{ padding: '20px' }}>
      <h2>Групповые WIP-лимиты</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="checkbox"
            checked={enabled}
            onChange={handleToggleEnabled}
          />
          Включить групповые WIP-лимиты
        </label>
      </div>

      {enabled && (
        <>
          <div style={{ marginBottom: '30px', padding: '15px', border: '1px solid #ccc', borderRadius: '4px' }}>
            <h3>Добавить новую группу</h3>
            
            <div style={{ marginBottom: '10px' }}>
              <label>Название группы:</label>
              <input
                type="text"
                value={newLimit.name}
                onChange={(e) => setNewLimit({ ...newLimit, name: e.target.value })}
                placeholder="Например: В разработке"
                style={{ marginLeft: '10px', width: '200px' }}
              />
            </div>

            <div style={{ marginBottom: '10px' }}>
              <label>Колонки:</label>
              <div style={{ marginTop: '5px' }}>
                {availableColumns.map(column => (
                  <label key={column.id} style={{ marginRight: '15px', display: 'inline-block' }}>
                    <input
                      type="checkbox"
                      checked={newLimit.columnIds.includes(column.id)}
                      onChange={() => handleColumnToggle(column.id)}
                    />
                    {column.name}
                  </label>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '10px' }}>
              <label>Лимит:</label>
              <input
                type="number"
                value={newLimit.limit}
                onChange={(e) => setNewLimit({ ...newLimit, limit: parseInt(e.target.value) || 0 })}
                min={1}
                style={{ marginLeft: '10px', width: '60px' }}
              />
            </div>

            <div style={{ marginBottom: '10px' }}>
              <label>Базовый цвет:</label>
              <input
                type="color"
                value={newLimit.baseColor}
                onChange={(e) => setNewLimit({ ...newLimit, baseColor: e.target.value })}
                style={{ marginLeft: '10px' }}
              />
            </div>

            <div style={{ marginBottom: '10px' }}>
              <label>Цвет при превышении:</label>
              <input
                type="color"
                value={newLimit.warningColor}
                onChange={(e) => setNewLimit({ ...newLimit, warningColor: e.target.value })}
                style={{ marginLeft: '10px' }}
              />
            </div>

            <button
              onClick={handleAddLimit}
              disabled={!newLimit.name || newLimit.columnIds.length === 0}
              style={{
                padding: '8px 16px',
                backgroundColor: '#0052cc',
                color: 'white',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer',
              }}
            >
              Добавить группу
            </button>
          </div>

          <div>
            <h3>Текущие группы</h3>
            {limits.length === 0 ? (
              <p>Группы не настроены</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '8px' }}>Название</th>
                    <th style={{ textAlign: 'left', padding: '8px' }}>Колонки</th>
                    <th style={{ textAlign: 'left', padding: '8px' }}>Лимит</th>
                    <th style={{ textAlign: 'left', padding: '8px' }}>Цвета</th>
                    <th style={{ textAlign: 'left', padding: '8px' }}>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {limits.map(limit => (
                    <tr key={limit.id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '8px' }}>{limit.name}</td>
                      <td style={{ padding: '8px' }}>{limit.columnNames.join(', ')}</td>
                      <td style={{ padding: '8px' }}>
                        <input
                          type="number"
                          value={limit.limit}
                          onChange={(e) => handleUpdateLimit(limit.id, 'limit', parseInt(e.target.value) || 0)}
                          min={1}
                          style={{ width: '60px' }}
                        />
                      </td>
                      <td style={{ padding: '8px' }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <div>
                            <label style={{ fontSize: '10px' }}>Базовый:</label>
                            <input
                              type="color"
                              value={limit.baseColor}
                              onChange={(e) => handleUpdateLimit(limit.id, 'baseColor', e.target.value)}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: '10px' }}>Превышение:</label>
                            <input
                              type="color"
                              value={limit.warningColor || '#FF0000'}
                              onChange={(e) => handleUpdateLimit(limit.id, 'warningColor', e.target.value)}
                            />
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '8px' }}>
                        <button
                          onClick={() => handleDeleteLimit(limit.id)}
                          style={{
                            padding: '4px 8px',
                            backgroundColor: '#de350b',
                            color: 'white',
                            border: 'none',
                            borderRadius: '3px',
                            cursor: 'pointer',
                          }}
                        >
                          Удалить
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ColumnLimitsSettings;
