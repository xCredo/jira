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
  color: string; // ← Обязательное поле теперь
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

// Цвета для выбора
const COLOR_OPTIONS = [
  { name: 'Серый', value: '#808080' },
  { name: 'Красный', value: '#FF0000' },
  { name: 'Оранжевый', value: '#FF7F00' },
  { name: 'Жёлтый', value: '#FFFF00' },
  { name: 'Зелёный', value: '#00FF00' },
  { name: 'Синий', value: '#0000FF' },
  { name: 'Фиолетовый', value: '#8B00FF' },
  { name: 'Чёрный', value: '#000000' },
];

export const PersonalWipLimits: React.FC = () => {
  const [limits, setLimits] = useState<WipLimit[]>([]);
  const [columns, setColumns] = useState<Column[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [limitValue, setLimitValue] = useState<number>(2);
  const [selectedColor, setSelectedColor] = useState<string>('#808080'); // Серый по умолчанию
  const [showColorPicker, setShowColorPicker] = useState<boolean>(false);
  const [editingLimit, setEditingLimit] = useState<WipLimit | null>(null);

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
      // Добавьте проверку и повторные попытки
      if (!window.JiraHelper?.AssigneeManager) {
        console.log('[Jira Helper] AssigneeManager не загружен, повтор через 500ms');
        setTimeout(loadUsers, 500);
        return;
      }
      
      const assigneeManager = window.JiraHelper.AssigneeManager;
      const allUsers = assigneeManager.getAllAssigneesFromCards();
      
      if (allUsers.length === 0) {
        console.log('[Jira Helper] Пользователи не найдены, повтор через 500ms');
        setTimeout(loadUsers, 500);
        return;
      }
      
      setUsers(allUsers);
      console.log('[Jira Helper] Загружено пользователей:', allUsers.length);
    } catch (error) {
      console.error('[Jira Helper] Ошибка загрузки пользователей:', error);
      setTimeout(loadUsers, 1000);
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
      limit: limitValue,
      color: selectedColor, // ← Сохраняем выбранный цвет
    };

    console.log('Создаётся лимит с цветом:', selectedColor);
    
    const updatedLimits = [...limits, newLimit];
    
    // Сохраняем в настройки
    settingsManager.updateSettings({
      personalWipLimits: {
        enabled: true,
        limits: updatedLimits,
      },
    });

    setLimits(updatedLimits);
    setShowAddForm(false);
    resetForm();
    
    // Обновляем визуализацию
    updateVisualization();
  };

  const handleEditLimit = () => {
    if (!selectedUser || selectedColumns.length === 0) return;
    
    const updatedLimits = limits.map(limit => 
      limit.id === editingLimit?.id
        ? {
            ...limit,
            userId: selectedUser,
            userName: users.find(u => u.id === selectedUser)?.displayName || limit.userName,
            columnIds: selectedColumns,
            columnNames: columns.filter(col => selectedColumns.includes(col.id)).map(col => col.name),
            limit: limitValue,
            color: selectedColor
          }
        : limit
    );
    
    settingsManager.updateSettings({
      personalWipLimits: {
        enabled: true,
        limits: updatedLimits
      }
    });
    
    setLimits(updatedLimits);
    setShowAddForm(false);
    setEditingLimit(null);
    resetForm();
    updateVisualization();
  };

  const handleRemoveLimit = (limitId: string) => {
    const updatedLimits = limits.filter(limit => limit.id !== limitId);
    
    settingsManager.updateSettings({
      personalWipLimits: {
        enabled: updatedLimits.length > 0,
        limits: updatedLimits,
      }
    });

    setLimits(updatedLimits);
    updateVisualization();
  };

  const updateVisualization = () => {
    console.log('if (window.JiraHelper?.WipLimitsManager)')
    if (window.JiraHelper?.WipLimitsManager) {
      console.log('window.JiraHelper.WipLimitsManager.update()')
      window.JiraHelper.WipLimitsManager.update();
    }
  };

  const resetForm = () => {
    setSelectedUser('');
    setSelectedColumns([]);
    setLimitValue(2);
    setSelectedColor('#808080');
    setShowColorPicker(false);
    setEditingLimit(null)
  };

  const toggleColumnSelection = (columnId: string) => {
    console.log('Toggle column:', columnId, 'Current selected:', selectedColumns);
    setSelectedColumns(prev => {
      const newSelection = prev.includes(columnId)
        ? prev.filter(id => id !== columnId)
        : [...prev, columnId];
      console.log('New selection:', newSelection);
      return newSelection;
    });
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
                    <div style={{ 
                      display: 'inline-block',
                      marginLeft: '8px',
                      width: '12px',
                      height: '12px',
                      backgroundColor: limit.color,
                      border: '1px solid #ccc',
                      borderRadius: '2px',
                      verticalAlign: 'middle'
                    }} title={`Цвет: ${limit.color}`} />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingLimit(limit);
                      setSelectedUser(limit.userId);
                      setSelectedColumns(limit.columnIds);
                      setLimitValue(limit.limit);
                      setSelectedColor(limit.color);
                      setShowAddForm(true);
                    }}
                    className={styles['jh-edit-btn']}
                    style={{ marginRight: '4px' }}
                  >
                    ✏️ Редактировать
                  </button>
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
          <h5>{editingLimit ? 'Редактировать лимит' : 'Добавить новый лимит'}</h5>
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
              <div className={styles['wip-user-select-custom']}>
                <h6>Пользователи:</h6>
                <div
                  style={{
                    border: '1px solid #e1e4e8',
                    borderRadius: '6px',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    padding: '4px',
                  }}
                >
                  <div
                    onClick={() => setSelectedUser('')}
                    style={{
                      padding: '8px',
                      cursor: 'pointer',
                      backgroundColor: selectedUser === '' ? '#e6f7ff' : 'transparent',
                      borderRadius: '4px',
                      marginBottom: '2px',
                    }}
                  >
                    <span style={{ fontSize: '14px' }}>❌ Не выбрано</span>
                  </div>
                  
                  {users.map(user => (
                    <div
                      key={user.id}
                      onClick={() => setSelectedUser(user.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px',
                        cursor: 'pointer',
                        backgroundColor: selectedUser === user.id ? '#e6f7ff' : 'transparent',
                        borderRadius: '4px',
                        marginBottom: '2px',
                      }}
                    >
                      {user.avatarUrl ? (
                        <img
                          src={user.avatarUrl}
                          alt={user.displayName}
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            objectFit: 'cover',
                            border: '1px solid #ccc',
                          }}
                        />
                      ) : user.id === 'unassigned' ? (
                        <div
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            backgroundColor: '#f0f0f0',
                            border: '1px solid #ccc',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px',
                          }}
                        >
                          👤
                        </div>
                      ) : (
                        <div
                          style={{
                            width: '24px',
                            height: '24px',
                            backgroundColor: '#808080',
                            border: '1px solid #ccc',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '10px',
                            fontWeight: 'bold',
                            color: '#fff',
                          }}
                        >
                          {user.displayName?.charAt(0) || '?'}
                        </div>
                      )}
                      <span style={{ fontSize: '14px' }}>
                        {user.displayName} ({user.name})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className={styles['wip-limit-section']}>
            <h6>Количество задач:</h6>
            <input
              type="number"
              min="1"
              max="20"
              value={limitValue === 0 ? '' : limitValue} // Показываем пустую строку вместо 0
              onChange={(e) => {
                const value = e.target.value;
                if (value === '') {
                  setLimitValue(0);
                } else {
                  const num = parseInt(value);
                  if (!isNaN(num) && num > 0 && num <= 20) {
                    setLimitValue(num);
                  }
                }
              }}
              className={styles['wip-limit-input']}
              placeholder="Введите число"
            />
            <p className={styles['wip-limit-description']}>
              Не более {limitValue} задач в сумме со всех выбранных колонок
            </p>
          </div>

          {/* БЛОК ВЫБОРА ЦВЕТА */}
          <div className={styles['wip-color-section']}>
            <h6>Цвет подсветки при превышении:</h6>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <div
                style={{
                  width: '30px',
                  height: '30px',
                  backgroundColor: selectedColor,
                  border: '2px solid #ccc',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
                onClick={() => setShowColorPicker(!showColorPicker)}
                title="Выбрать цвет"
              />
              <button
                type="button"
                onClick={() => setShowColorPicker(!showColorPicker)}
                style={{
                  padding: '5px 10px',
                  backgroundColor: '#f6f8fa',
                  border: '1px solid #d0d7de',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                {showColorPicker ? 'Скрыть палитру' : 'Показать палитру'}
              </button>
              <span style={{ fontSize: '12px', color: '#666' }}>
                {COLOR_OPTIONS.find(c => c.value === selectedColor)?.name || 'Пользовательский'}
              </span>
            </div>

            {showColorPicker && (
              <div style={{
                padding: '10px',
                backgroundColor: '#f6f8fa',
                borderRadius: '6px',
                marginBottom: '15px',
                border: '1px solid #e1e4e8'
              }}>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                  Выберите цвет для WIP-подсветки:
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '6px'
                }}>
                  {COLOR_OPTIONS.map(color => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => {
                        setSelectedColor(color.value);
                        setShowColorPicker(false);
                      }}
                      style={{
                        width: '40px',
                        height: '40px',
                        backgroundColor: color.value,
                        border: selectedColor === color.value ? '3px solid #0969da' : '1px solid #ccc',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        padding: 0
                      }}
                      title={color.name}
                    />
                  ))}
                </div>
                <div style={{ fontSize: '11px', color: '#888', marginTop: '8px' }}>
                  Цвет будет применяться всеми тремя типами подсветки
                </div>
              </div>
            )}
          </div>

          <div className={styles['wip-form-actions']}>
            <button
              type="button"
              onClick={editingLimit ? handleEditLimit : handleAddLimit}
              className={styles['jh-save-btn']}
            >
              {editingLimit ? '💾 Обновить' : '💾 Сохранить'}
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