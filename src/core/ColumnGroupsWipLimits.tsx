// src/core/ColumnGroupsWipLimits.tsx
import React, { useState, useEffect } from 'react';
import { settingsManager } from './SettingsManager';
import { columnManager } from './ColumnManager';
import styles from '../column-limits/BoardPage/styles.module.css';

interface ColumnGroupWipLimit {
  id: string;
  name: string;             // "В разработке", "На проверке"
  columnIds: string[];      // ID колонок
  columnNames: string[];    // Названия колонок
  limit: number;            // Лимит задач
  baseColor: string;        // Базовый цвет фона (#E3F2FD)
  warningColor?: string;    // Цвет при превышении
}

interface Column {
  id: string;
  name: string;
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

export const ColumnGroupsWipLimits: React.FC = () => {
  const [limits, setLimits] = useState<ColumnGroupWipLimit[]>([]);
  const [columns, setColumns] = useState<Column[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [groupName, setGroupName] = useState<string>('');
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [limitValue, setLimitValue] = useState<number>(10);
  const [baseColor, setBaseColor] = useState<string>('#E3F2FD');
  const [warningColor, setWarningColor] = useState<string>('#FF0000');
  const [showBaseColorPicker, setShowBaseColorPicker] = useState<boolean>(false);
  const [showWarningColorPicker, setShowWarningColorPicker] = useState<boolean>(false);
  const [editingGroup, setEditingGroup] = useState<ColumnGroupWipLimit | null>(null);

  // Загрузка данных при монтировании
  useEffect(() => {
    loadData();
    // Добавить миграцию после загрузки колонок
    setTimeout(() => {
      migrateGroupColumns();
      updateVisualization();
    }, 1000);
  }, []);

  const loadData = () => {
    const settings = settingsManager.getSettings();
    setLimits(settings.columnGroupWipLimits?.limits || []);
    loadColumns();
  };

  const migrateGroupColumns = () => {
    const settings = settingsManager.getSettings();
    const groups = settings.columnGroupWipLimits?.limits || [];
    
    if (groups.length === 0) return;
    
    // Получаем актуальные колонки
    const currentColumns = columnManager.getColumns();
    const columnMap = new Map(currentColumns.map(col => [col.name, col.id]));
    
    let needsUpdate = false;
    const updatedGroups = groups.map(group => {
      // Пробуем найти новые ID по названиям колонок
      const newColumnIds = group.columnNames
        .map(name => {
          const col = currentColumns.find(c => c.name === name);
          return col?.id;
        })
        .filter(Boolean) as string[];
      
      if (newColumnIds.length === group.columnIds.length) {
        needsUpdate = true;
        return {
          ...group,
          columnIds: newColumnIds
        };
      }
      return group;
    });
    
    if (needsUpdate) {
      console.log('[ColumnGroups] Обновляем ID колонок в группах');
      settingsManager.updateSettings({
        columnGroupWipLimits: {
          enabled: true,
          limits: updatedGroups
        }
      });
      setLimits(updatedGroups);
    }
  };

  const loadColumns = () => {
    try {
      const columnsData = columnManager.getColumns();
      setColumns(columnsData.map(col => ({
        id: col.id,
        name: col.name
      })));
      console.log('[Jira Helper] Загружено колонок для групп:', columnsData.length);
    } catch (error) {
      console.error('[Jira Helper] Ошибка загрузки колонок:', error);
    }
  };

  const handleAddGroup = () => {
    if (!groupName.trim() || selectedColumns.length === 0) {
      alert('Пожалуйста, введите название группы и выберите хотя бы одну колонку');
      return;
    }

    const selectedColumnObjs = columns.filter(col => selectedColumns.includes(col.id));
    
    const newGroup: ColumnGroupWipLimit = {
      id: `group_${Date.now()}`,
      name: groupName,
      columnIds: selectedColumns,
      columnNames: selectedColumnObjs.map(col => col.name),
      limit: limitValue,
      baseColor: baseColor,
      warningColor: warningColor
    };
    
    const updatedLimits = [...limits, newGroup];
    
    // Сохраняем в настройки
    settingsManager.updateSettings({
      columnGroupWipLimits: {
        enabled: true,
        limits: updatedLimits
      }
    });

    setLimits(updatedLimits);
    setShowAddForm(false);
    resetForm();
    updateVisualization();
  };

  const handleEditGroup = () => {
    if (!editingGroup) return;
    
    const selectedColumnObjs = columns.filter(col => selectedColumns.includes(col.id));
    
    const updatedLimits = limits.map(group =>
      group.id === editingGroup.id
        ? {
            ...group,
            name: groupName,
            columnIds: selectedColumns,
            columnNames: selectedColumnObjs.map(col => col.name),
            limit: limitValue,
            baseColor: baseColor,
            warningColor: warningColor
          }
        : group
    );
    
    settingsManager.updateSettings({
      columnGroupWipLimits: {
        enabled: true,
        limits: updatedLimits
      }
    });

    setLimits(updatedLimits);
    setShowAddForm(false);
    setEditingGroup(null);
    resetForm();
    updateVisualization();
  };

  const handleRemoveGroup = (groupId: string) => {
    const updatedLimits = limits.filter(limit => limit.id !== groupId);
    
    settingsManager.updateSettings({
      columnGroupWipLimits: {
        enabled: updatedLimits.length > 0,
        limits: updatedLimits
      }
    });

    setLimits(updatedLimits);
    updateVisualization();
  };

  const updateVisualization = () => {
    if (window.JiraHelper?.GroupWipLimitsManager) {
      window.JiraHelper.GroupWipLimitsManager.update();
    }
  };

  const resetForm = () => {
    setGroupName('');
    setSelectedColumns([]);
    setLimitValue(10);
    setBaseColor('#E3F2FD');
    setWarningColor('#FF0000');
    setShowBaseColorPicker(false);
    setShowWarningColorPicker(false);
    setEditingGroup(null);
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
      <h4>WIP-Limits для групп колонок</h4>
      
      {!showAddForm ? (
        <>
          <button
            type="button"
            onClick={() => {
              resetForm();
              setShowAddForm(true);
            }}
            className={styles['jh-add-wip-btn']}
          >
            ➕ Добавить группу колонок
          </button>

          {limits.length > 0 ? (
            <div className={styles['wip-limits-list']}>
              <h5>Установленные группы:</h5>
              {limits.map(group => (
                <div key={group.id} className={styles['wip-limit-item']}>
                  <div className={styles['wip-limit-info']}>
                    <strong>{group.name}</strong> - не более {group.limit} задач в колонках: 
                    {group.columnNames.join(', ')}
                    <div style={{ 
                      display: 'inline-block',
                      marginLeft: '8px',
                      width: '12px',
                      height: '12px',
                      backgroundColor: group.baseColor,
                      border: '1px solid #ccc',
                      borderRadius: '2px',
                      verticalAlign: 'middle'
                    }} title={`Базовый цвет: ${group.baseColor}`} />
                    <div style={{ 
                      display: 'inline-block',
                      marginLeft: '4px',
                      width: '12px',
                      height: '12px',
                      backgroundColor: group.warningColor || '#FF0000',
                      border: '1px solid #ccc',
                      borderRadius: '2px',
                      verticalAlign: 'middle'
                    }} title={`Цвет при превышении: ${group.warningColor || '#FF0000'}`} />
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingGroup(group);
                        setGroupName(group.name);
                        setSelectedColumns(group.columnIds);
                        setLimitValue(group.limit);
                        setBaseColor(group.baseColor);
                        setWarningColor(group.warningColor || '#FF0000');
                        setShowAddForm(true);
                      }}
                      className={styles['jh-edit-btn']}
                      style={{ marginRight: '4px' }}
                    >
                      ✏️ Редактировать
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveGroup(group.id)}
                      className={styles['jh-remove-btn']}
                    >
                      ❌ Удалить
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className={styles['wip-empty-message']}>
              Группы колонок не настроены. Нажмите "Добавить группу колонок", чтобы создать.
            </p>
          )}
        </>
      ) : (
        <div className={styles['wip-add-form']}>
          <h5>{editingGroup ? 'Редактировать группу' : 'Создать новую группу колонок'}</h5>
          
          <div className={styles['wip-input-section']}>
            <h6>Название группы:</h6>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className={styles['wip-text-input']}
              placeholder="Например: В разработке, На проверке"
            />
          </div>

          <div className={styles['wip-columns-section']}>
            <h6>Выберите колонки для группы:</h6>
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

          <div className={styles['wip-limit-section']}>
            <h6>Лимит задач в группе:</h6>
            <input
              type="number"
              min="1"
              max="50"
              value={limitValue === 0 ? '' : limitValue}
              onChange={(e) => {
                const value = e.target.value;
                if (value === '') {
                  setLimitValue(0);
                } else {
                  const num = parseInt(value);
                  if (!isNaN(num) && num > 0 && num <= 50) {
                    setLimitValue(num);
                  }
                }
              }}
              className={styles['wip-limit-input']}
              placeholder="Например: 12"
            />
            <p className={styles['wip-limit-description']}>
              Не более {limitValue} задач во всех выбранных колонках
            </p>
          </div>

          {/* Блок выбора базового цвета */}
          <div className={styles['wip-color-section']}>
            <h6>Базовый цвет фона колонок:</h6>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <div
                style={{
                  width: '30px',
                  height: '30px',
                  backgroundColor: baseColor,
                  border: '2px solid #ccc',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
                onClick={() => setShowBaseColorPicker(!showBaseColorPicker)}
                title="Выбрать цвет"
              />
              <button
                type="button"
                onClick={() => setShowBaseColorPicker(!showBaseColorPicker)}
                style={{
                  padding: '5px 10px',
                  backgroundColor: '#f6f8fa',
                  border: '1px solid #d0d7de',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                {showBaseColorPicker ? 'Скрыть палитру' : 'Показать палитру'}
              </button>
              <span style={{ fontSize: '12px', color: '#666' }}>
                {COLOR_OPTIONS.find(c => c.value === baseColor)?.name || 'Пользовательский'}
              </span>
            </div>

            {showBaseColorPicker && (
              <div style={{
                padding: '10px',
                backgroundColor: '#f6f8fa',
                borderRadius: '6px',
                marginBottom: '15px',
                border: '1px solid #e1e4e8'
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                  {COLOR_OPTIONS.map(color => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => {
                        setBaseColor(color.value);
                        setShowBaseColorPicker(false);
                      }}
                      style={{
                        width: '40px',
                        height: '40px',
                        backgroundColor: color.value,
                        border: baseColor === color.value ? '3px solid #0969da' : '1px solid #ccc',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        padding: 0
                      }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Блок выбора цвета при превышении */}
          <div className={styles['wip-color-section']}>
            <h6>Цвет при превышении лимита:</h6>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <div
                style={{
                  width: '30px',
                  height: '30px',
                  backgroundColor: warningColor,
                  border: '2px solid #ccc',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
                onClick={() => setShowWarningColorPicker(!showWarningColorPicker)}
                title="Выбрать цвет"
              />
              <button
                type="button"
                onClick={() => setShowWarningColorPicker(!showWarningColorPicker)}
                style={{
                  padding: '5px 10px',
                  backgroundColor: '#f6f8fa',
                  border: '1px solid #d0d7de',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                {showWarningColorPicker ? 'Скрыть палитру' : 'Показать палитру'}
              </button>
              <span style={{ fontSize: '12px', color: '#666' }}>
                {COLOR_OPTIONS.find(c => c.value === warningColor)?.name || 'Пользовательский'}
              </span>
            </div>

            {showWarningColorPicker && (
              <div style={{
                padding: '10px',
                backgroundColor: '#f6f8fa',
                borderRadius: '6px',
                marginBottom: '15px',
                border: '1px solid #e1e4e8'
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                  {COLOR_OPTIONS.map(color => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => {
                        setWarningColor(color.value);
                        setShowWarningColorPicker(false);
                      }}
                      style={{
                        width: '40px',
                        height: '40px',
                        backgroundColor: color.value,
                        border: warningColor === color.value ? '3px solid #0969da' : '1px solid #ccc',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        padding: 0
                      }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className={styles['wip-form-actions']}>
            <button
              type="button"
              onClick={editingGroup ? handleEditGroup : handleAddGroup}
              className={styles['jh-save-btn']}
            >
              {editingGroup ? '💾 Обновить группу' : '💾 Сохранить группу'}
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