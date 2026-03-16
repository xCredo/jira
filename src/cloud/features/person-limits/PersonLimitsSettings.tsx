// src/cloud/features/person-limits/PersonLimitsSettings.tsx
// React-компонент настроек персональных WIP-лимитов

import React, { useState, useEffect } from 'react';
import { cloudContainer } from '../../shared/di';
import { settingsServiceToken, assigneeServiceToken, columnServiceToken } from '../../shared/di/tokens';
import type { Settings } from '../../shared/SettingsService';
import type { Assignee } from '../../shared/AssigneeService';
import type { ColumnInfo } from '../../shared/ColumnService';

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

  const handleToggleEnabled = () => {
    const settingsService = cloudContainer.inject(settingsServiceToken);
    const newEnabled = !enabled;
    setEnabled(newEnabled);
    settingsService.updateSettings({
      personalWipLimits: {
        enabled: newEnabled,
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

  return (
    <div className="person-limits-settings" style={{ padding: '20px' }}>
      <h2>Персональные WIP-лимиты</h2>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input type="checkbox" checked={enabled} onChange={handleToggleEnabled} />
          Включить персональные WIP-лимиты
        </label>
      </div>

      {enabled && (
        <>
          <div style={{ marginBottom: '30px', padding: '15px', border: '1px solid #ccc', borderRadius: '4px' }}>
            <h3>Добавить новый лимит</h3>

            <div style={{ marginBottom: '10px' }}>
              <label>Исполнитель:</label>
              <select
                value={newLimit.userId}
                onChange={e => setNewLimit({ ...newLimit, userId: e.target.value })}
                style={{ marginLeft: '10px' }}
              >
                <option value="">Выберите исполнителя</option>
                {availableAssignees.map(assignee => (
                  <option key={assignee.id} value={assignee.id}>
                    {assignee.name}
                  </option>
                ))}
              </select>
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
                onChange={e => setNewLimit({ ...newLimit, limit: parseInt(e.target.value) || 0 })}
                min={1}
                style={{ marginLeft: '10px', width: '60px' }}
              />
            </div>

            <div style={{ marginBottom: '10px' }}>
              <label>Цвет:</label>
              <input
                type="color"
                value={newLimit.color}
                onChange={e => setNewLimit({ ...newLimit, color: e.target.value })}
                style={{ marginLeft: '10px' }}
              />
            </div>

            <button
              onClick={handleAddLimit}
              disabled={!newLimit.userId || newLimit.columnIds.length === 0}
              style={{
                padding: '8px 16px',
                backgroundColor: '#0052cc',
                color: 'white',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer',
              }}
            >
              Добавить лимит
            </button>
          </div>

          <div>
            <h3>Текущие лимиты</h3>
            {limits.length === 0 ? (
              <p>Лимиты не настроены</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '8px' }}>Исполнитель</th>
                    <th style={{ textAlign: 'left', padding: '8px' }}>Колонки</th>
                    <th style={{ textAlign: 'left', padding: '8px' }}>Лимит</th>
                    <th style={{ textAlign: 'left', padding: '8px' }}>Цвет</th>
                    <th style={{ textAlign: 'left', padding: '8px' }}>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {limits.map(limit => (
                    <tr key={limit.id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '8px' }}>{limit.userName}</td>
                      <td style={{ padding: '8px' }}>{limit.columnNames.join(', ')}</td>
                      <td style={{ padding: '8px' }}>
                        <input
                          type="number"
                          value={limit.limit}
                          onChange={e => handleUpdateLimit(limit.id, 'limit', parseInt(e.target.value) || 0)}
                          min={1}
                          style={{ width: '60px' }}
                        />
                      </td>
                      <td style={{ padding: '8px' }}>
                        <input
                          type="color"
                          value={limit.color}
                          onChange={e => handleUpdateLimit(limit.id, 'color', e.target.value)}
                        />
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

export default PersonLimitsSettings;
