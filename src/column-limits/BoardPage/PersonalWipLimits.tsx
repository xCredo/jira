// src/column-limits/BoardPage/PersonalWipLimits.tsx
import React, { useState, useEffect } from 'react';
import { settingsManager } from '../../core/SettingsManager';
import styles from './styles.module.css';
import { columnManager } from '../../core/ColumnManager';

interface WipLimit {
  id: string;
  userId: string;
  userName: string;
  columnIds: string[];
  columnNames: string[];
  limit: number;
  color?: string;
}

interface Column {
  id: string;
  name: string;
}

interface User {
  id: string;
  name: string;
  displayName: string;
  avatarUrl?: string;
}

export const PersonalWipLimits: React.FC = () => {
  const [limits, setLimits] = useState<WipLimit[]>([]);
  const [columns, setColumns] = useState<Column[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [limitValue, setLimitValue] = useState<number>(2);

  // Загрузка данных при монтировании
  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    // Загружаем существующие лимиты из настроек
    const settings = settingsManager.getSettings();
    setLimits(settings.personalWipLimits?.limits || []);
    
    // Загружаем колонки с доски
    loadColumns();
    
    // Загружаем пользователей
    loadUsers();
  };

  const loadColumns = () => {
    try {
        const columns = columnManager.getColumns();
        
        if (columns.length > 0) {
        setColumns(columns.map(col => ({
            id: col.id,
            name: col.name
        })));
        console.log('[Jira Helper] Загружено колонок:', columns.length);
        } else {
        console.log('[Jira Helper] Колонки не найдены, повтор через 1 сек');
        setTimeout(loadColumns, 1000);
        }
    } catch (error) {
        console.error('[Jira Helper] Ошибка загрузки колонок:', error);
    }
    };


  const loadUsers = () => {
    try {
      const assigneeManager = (window as any).JiraHelper?.AssigneeManager;
      if (assigneeManager) {
        const allUsers = assigneeManager.getAllAssigneesFromCards();
        setUsers(allUsers);
      }
    } catch (error) {
      console.error('[Jira Helper] Ошибка загрузки пользователей:', error);
    }
  };

  const handleAddLimit = () => {
    if (!selectedUser || selectedColumns.length === 0) {
      alert('Пожалуйста, выберите пользователя и хотя бы одну колонку');
      return;
    }

    const user = users.find(u => u.id === selectedUser);
    if (!user) return;

    const selectedColumnObjs = columns.filter(col => selectedColumns.includes(col.id));
    
    const newLimit: WipLimit = {
      id: `wip_${Date.now()}`,
      userId: selectedUser,
      userName: user.displayName,
      columnIds: selectedColumns,
      columnNames: selectedColumnObjs.map(col => col.name),
      limit: limitValue
    };

    const updatedLimits = [...limits, newLimit];
    
    // Сохраняем в настройки
    settingsManager.updateSettings({
      personalWipLimits: {
        enabled: true,
        limits: updatedLimits
      }
    });

    setLimits(updatedLimits);
    setShowAddForm(false);
    resetForm();
    
    // Обновляем визуализацию
    updateVisualization();
  };

  const handleRemoveLimit = (limitId: string) => {
    const updatedLimits = limits.filter(limit => limit.id !== limitId);
    
    settingsManager.updateSettings({
      personalWipLimits: {
        enabled: updatedLimits.length > 0,
        limits: updatedLimits
      }
    });

    setLimits(updatedLimits);
    updateVisualization();
  };

  const updateVisualization = () => {
    if (window.JiraHelper?.WipLimitsManager) {
      window.JiraHelper.WipLimitsManager.update();
    }
  };

  const resetForm = () => {
    setSelectedUser('');
    setSelectedColumns([]);
    setLimitValue(2);
  };

  const toggleColumnSelection = (columnId: string) => {
    setSelectedColumns(prev => 
      prev.includes(columnId)
        ? prev.filter(id => id !== columnId)
        : [...prev, columnId]
    );
  };

  return (
    <div className={styles['wip-limits-container']}>
      <h4>Personal WIP-Limits</h4>
      
      {!showAddForm ? (
        <>
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className={styles['jh-add-wip-btn']}
          >
            ➕ Добавить лимиты пользователям
          </button>

          {limits.length > 0 ? (
            <div className={styles['wip-limits-list']}>
              <h5>Установленные лимиты:</h5>
              {limits.map(limit => (
                <div key={limit.id} className={styles['wip-limit-item']}>
                  <div className={styles['wip-limit-info']}>
                    <strong>{limit.userName}</strong> - не более {limit.limit} задач в колонках: {limit.columnNames.join(', ')}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveLimit(limit.id)}
                    className={styles['jh-remove-btn']}
                  >
                    ❌ Удалить
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className={styles['wip-empty-message']}>
              Лимиты не установлены. Нажмите "Добавить лимиты пользователям", чтобы настроить.
            </p>
          )}
        </>
      ) : (
        <div className={styles['wip-add-form']}>
          <h5>Добавить новый лимит</h5>
          
          <div className={styles['wip-columns-section']}>
            <div className={styles['wip-column']}>
              <h6>Колонки:</h6>
              <div className={styles['wip-columns-list']}>
                {columns.map(column => (
                  <label key={column.id} className={styles['wip-column-item']}>
                    <input
                      type="checkbox"
                      checked={selectedColumns.includes(column.id)}
                      onChange={() => toggleColumnSelection(column.id)}
                    />
                    {column.name}
                  </label>
                ))}
              </div>
            </div>

            <div className={styles['wip-column']}>
              <h6>Пользователи:</h6>
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className={styles['wip-user-select']}
              >
                <option value="">Выберите пользователя</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.displayName} ({user.name})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles['wip-limit-section']}>
            <h6>Количество задач:</h6>
            <input
              type="number"
              min="1"
              max="20"
              value={limitValue}
              onChange={(e) => setLimitValue(parseInt(e.target.value) || 1)}
              className={styles['wip-limit-input']}
            />
            <p className={styles['wip-limit-description']}>
              Не более {limitValue} задач в сумме со всех выбранных колонок
            </p>
          </div>

          <div className={styles['wip-form-actions']}>
            <button
              type="button"
              onClick={handleAddLimit}
              className={styles['jh-save-btn']}
            >
              💾 Сохранить
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                resetForm();
              }}
              className={styles['jh-cancel-btn']}
            >
              ↩️ Назад
            </button>
          </div>
        </div>
      )}
    </div>
  );
};