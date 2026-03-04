// src/column-limits/BoardPage/RandomColorButton.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { restoreOriginalColors } from '../shared/colorCards';
import { applyColumnColors, removeColumnColors } from '../columnColors';
import { settingsManager } from '../../core/SettingsManager';
import styles from './styles.module.css';
import { visualizationManager } from '../../core/VisualizationManager';
import { PersonalWipLimits } from './PersonalWipLimits';
import { ColumnGroupsWipLimits } from '../../core/ColumnGroupsWipLimits';

interface RandomColorButtonProps {
  onColorAllCards?: () => void;
}

// 8 цветов для выбора
const COLOR_OPTIONS = [
  { name: 'Красный', value: '#FF0000' },
  { name: 'Оранжевый', value: '#FF7F00' },
  { name: 'Жёлтый', value: '#FFFF00' },
  { name: 'Зелёный', value: '#00FF00' },
  { name: 'Голубой', value: '#42AAFF' },
  { name: 'Синий', value: '#0000FF' },
  { name: 'Фиолетовый', value: '#8B00FF' },
  { name: 'Чёрный', value: '#000000' },
];

let counter = 0;
export const RandomColorButton: React.FC<RandomColorButtonProps> = ({ onColorAllCards }) => {
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'columns' | 'assignees' | 'wip-limits' | 'column-groups'>('columns');
  const [columnColorsEnabled, setColumnColorsEnabled] = useState(false);
  const [isTogglingColumns, setIsTogglingColumns] = useState(false);
  const [assigneeEnabled, setAssigneeEnabled] = useState(false);
  const [selectedVizType, setSelectedVizType] = useState<'stripe' | 'background' | 'border'>('stripe');

  const [showAssigneesList, setShowAssigneesList] = useState(false);
  const [assigneesList, setAssigneesList] = useState<any[]>([]);
  const [showColorPickerFor, setShowColorPickerFor] = useState<string | null>(null);

  // Функция для загрузки настроек
  const loadSettings = useCallback(() => {
    const currentSettings = settingsManager.getSettings();
    setColumnColorsEnabled(currentSettings.columnColors.enabled);
    setAssigneeEnabled(currentSettings.assigneeHighlight.enabled);
    setSelectedVizType(currentSettings.assigneeHighlight.visualizationType);
  }, []);

  // Функция для загрузки списка исполнителей
  const loadAssigneesList = useCallback(() => {
    if (counter++ > 10) {
      return;
    }

    try {
      const assigneeManager = (window as any).JiraHelper?.AssigneeManager;
      if (assigneeManager) {
        const assignees = assigneeManager.getAllAssigneesFromCards();
        setAssigneesList(assignees);
        console.log('[Jira Helper] Загружено исполнителей:', assignees.length);
      }
    } catch (error) {
      console.error('[Jira Helper] Ошибка загрузки исполнителей:', error);
    }
  }, []);

  // Инициализация при загрузке
  useEffect(() => {
    loadSettings();

    // Автоприменение сохранённых настроек
    setTimeout(() => {
      const currentSettings = settingsManager.getSettings();

      if (currentSettings.columnColors.enabled) {
        console.log('[Jira Helper] Автоприменение цветов колонок');
        applyColumnColors();
      }

      if (currentSettings.assigneeHighlight.enabled) {
        console.log('[Jira Helper] Автоприменение подсветки исполнителей');
        visualizationManager.enable();
      }

      if (currentSettings.personalWipLimits?.enabled && currentSettings.personalWipLimits.limits?.length > 0) {
        console.log('[Jira Helper] Автоприменение WIP-лимитов');
        setTimeout(() => {
          if (window.JiraHelper?.WipLimitsManager) {
            window.JiraHelper.WipLimitsManager.update();
          }
        }, 1500);
      }
    }, 800);
  }, [loadSettings]);

  // Загрузка списка исполнителей при раскрытии
  useEffect(() => {
    if (showAssigneesList && assigneesList.length === 0) {
      loadAssigneesList();
    }
  }, [showAssigneesList, assigneesList.length, loadAssigneesList]);

  const handleResetColors = () => {
    console.log('[Jira Helper] Сброс цветов');
    restoreOriginalColors();

    // Переприменяем активные фичи после сброса
    if (columnColorsEnabled) {
      setTimeout(() => applyColumnColors(), 300);
    }

    if (assigneeEnabled) {
      setTimeout(() => visualizationManager.updateVisualization(), 300);
    }
  };

  const handleToggleColumnColors = () => {
    if (isTogglingColumns) return;

    const newState = !columnColorsEnabled;
    setIsTogglingColumns(true);
    setColumnColorsEnabled(newState);
    settingsManager.updateSettings({
      columnColors: {
        ...settingsManager.getSettings().columnColors,
        enabled: newState,
      },
    });

    if (newState) {
      setTimeout(() => {
        applyColumnColors();
        setIsTogglingColumns(false);
      }, 150);
    } else {
      removeColumnColors();
      setIsTogglingColumns(false);
    }
  };

  const handleAssigneeToggle = (enabled: boolean) => {
    console.log(`[Jira Helper] Переключаем подсветку исполнителей: ${enabled}`);

    setAssigneeEnabled(enabled);
    settingsManager.updateSettings({
      assigneeHighlight: {
        ...settingsManager.getSettings().assigneeHighlight,
        enabled,
      },
    });

    if (enabled) {
      visualizationManager.enable();
    } else {
      visualizationManager.disable();
    }
  };

  const handleVizTypeChange = useCallback(
    (newType: 'stripe' | 'background' | 'border') => {
      setSelectedVizType(newType);

      settingsManager.updateSettings({
        assigneeHighlight: {
          ...settingsManager.getSettings().assigneeHighlight,
          visualizationType: newType,
        },
      });

      if (assigneeEnabled) {
        visualizationManager.updateVisualization();
      }
    },
    [assigneeEnabled]
  );

  // НОВАЯ ФУНКЦИЯ: Выбор цвета для исполнителя
  const handleColorSelect = useCallback(
    (assigneeId: string, color: string) => {
      console.log(`[Jira Helper] Выбран цвет ${color} для исполнителя ${assigneeId}`);

      // Сохраняем в настройки
      const currentSettings = settingsManager.getSettings();
      const newCustomColors = {
        ...currentSettings.assigneeHighlight.customColors,
        [assigneeId]: color,
      };

      settingsManager.updateSettings({
        assigneeHighlight: {
          ...currentSettings.assigneeHighlight,
          customColors: newCustomColors,
        },
      });

      // Закрываем пикер
      setShowColorPickerFor(null);

      // Обновляем визуализацию если включена
      if (assigneeEnabled) {
        setTimeout(() => {
          visualizationManager.updateVisualization();
        }, 100);
      }

      // Обновляем список исполнителей
      loadAssigneesList();
    },
    [assigneeEnabled, loadAssigneesList]
  );

  // НОВАЯ ФУНКЦИЯ: Получить текущий цвет исполнителя
  const getCurrentColor = useCallback((assigneeId: string) => {
    const settings = settingsManager.getSettings();
    return settings.assigneeHighlight.customColors[assigneeId] || '';
  }, []);

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
      {/* Кнопка "Сброс" */}
      <button
        onClick={handleResetColors}
        className="css-m2h7i3"
        style={{
          marginLeft: '0px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
        }}
        title="Сбросить цвета к исходным"
        onMouseEnter={e => {
          e.currentTarget.style.backgroundColor = '#f0f0f0';
          e.currentTarget.style.border = '1px solid #ddd';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.backgroundColor = 'inherit';
          e.currentTarget.style.border = '1px solid transparent';
        }}
      >
        <span>🔄 Сброс</span>
      </button>

      {/* Кнопка "Колонки" */}
     {/*  <button
        onClick={handleToggleColumnColors}
        disabled={isTogglingColumns}
        className="css-m2h7i3"
        style={{
          marginLeft: '0px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          backgroundColor: columnColorsEnabled ? '#E3F2FD' : 'inherit',
          border: columnColorsEnabled ? '1px solid #2196F3' : '1px solid transparent',
          opacity: isTogglingColumns ? 0.6 : 1,
          cursor: isTogglingColumns ? 'wait' : 'pointer',
        }}
        title={
          isTogglingColumns
            ? 'Идет переключение...'
            : columnColorsEnabled
              ? 'Выключить цвета колонок'
              : 'Включить цвета колонок'
        }
        onMouseEnter={e => {
          if (!isTogglingColumns && !columnColorsEnabled) {
            e.currentTarget.style.backgroundColor = '#f0f0f0';
            e.currentTarget.style.border = '1px solid #ddd';
          }
        }}
        onMouseLeave={e => {
          if (!isTogglingColumns && !columnColorsEnabled) {
            e.currentTarget.style.backgroundColor = 'inherit';
            e.currentTarget.style.border = '1px solid transparent';
          }
        }}
      >
        <span>{isTogglingColumns ? '⏳' : columnColorsEnabled ? '📊 Колонки (вкл)' : '📊 Колонки'}</span>
      </button> */}

      {/* Кнопка "Настройки" */}
      <button
        onClick={() => {
          loadSettings();
          setShowSettings(!showSettings);
        }}
        className="css-m2h7i3"
        style={{
          marginLeft: '0px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
        }}
        title="Настройки Jira Helper"
      >
        <span>⚙️</span>
      </button>

      {/* Меню настроек */}
      {showSettings && (
        <div className={styles['jh-settings-popup']} style={{ 
          maxHeight: '80vh',
          overflowY: 'auto'
        }}>
          <div className={styles['jh-settings-header']}>
            <div style={{ fontWeight: 'bold', fontSize: '14px' }}>⚙️ Настройки Jira Helper</div>
            <button
              onClick={() => setShowSettings(false)}
              className={styles['jh-settings-close']}
              title="Закрыть настройки"
            >
              ×
            </button>
          </div>

          <div className={styles['jh-settings-tabs']}>
            {/* <button
              onClick={() => setSettingsTab('columns')}
              className={settingsTab === 'columns' ? styles['jh-tab-active'] : styles['jh-tab']}
            >
              📊 Колонки
            </button> */}
            <button
              onClick={() => setSettingsTab('assignees')}
              className={settingsTab === 'assignees' ? styles['jh-tab-active'] : styles['jh-tab']}
            >
              👥 Исполнители
            </button>
            <button
              onClick={() => setSettingsTab('wip-limits')}
              className={settingsTab === 'wip-limits' ? styles['jh-tab-active'] : styles['jh-tab']}
            >
              ⚠️ Персональные WIP-Limits
            </button>
            <button
              onClick={() => setSettingsTab('column-groups')}
              className={settingsTab === 'column-groups' ? styles['jh-tab-active'] : styles['jh-tab']}
            >
              🏷️ Группы колонок
            </button>
          </div>

          <div className={styles['jh-settings-content']}>
            {/* Вкладка "Колонки" (без изменений) */}
            {settingsTab === 'columns' && (
              <div>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input type="checkbox" checked={columnColorsEnabled} onChange={handleToggleColumnColors} />
                    Включить цвета колонок
                  </label>
                </div>

                <div style={{ marginBottom: '8px' }}>
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Цвета по умолчанию:</div>
                  <div style={{ display: 'flex', gap: '8px', fontSize: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <div style={{ width: '12px', height: '12px', backgroundColor: 'rgba(0,0,255,0.74)' }} />
                      TO DO
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <div style={{ width: '12px', height: '12px', backgroundColor: 'rgba(255,255,0,0.74)' }} />
                      IN PROGRESS
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <div style={{ width: '12px', height: '12px', backgroundColor: 'rgba(0,255,0,0.74)' }} />
                      DONE
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Вкладка "Исполнители" (без изменений) */}
            {settingsTab === 'assignees' && (
              <div>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="checkbox"
                      checked={assigneeEnabled}
                      onChange={e => handleAssigneeToggle(e.target.checked)}
                    />
                    Включить подсветку исполнителей
                  </label>
                  <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                    Автоматическая цветная подсветка по исполнителям
                  </div>
                </div>

                {/* НОВОЕ: Раскрывающийся список исполнителей */}
                <div style={{ marginBottom: '12px' }}>
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#666',
                      marginBottom: '4px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span>Список исполнителей ({assigneesList.length}):</span>
                    <button
                      onClick={() => setShowAssigneesList(!showAssigneesList)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '12px',
                        color: '#0969da',
                        padding: '2px 6px',
                      }}
                    >
                      {showAssigneesList ? '▲ Скрыть' : '▼ Показать'}
                    </button>
                  </div>

                  {showAssigneesList && (
                    <div
                      style={{
                        background: '#f6f8fa',
                        borderRadius: '6px',
                        padding: '8px',
                        marginBottom: '12px',
                        maxHeight: '200px',
                        overflowY: 'auto',
                      }}
                    >
                      {assigneesList.length === 0 ? (
                        <div style={{ fontSize: '12px', color: '#888', fontStyle: 'italic', textAlign: 'center' }}>
                          Загрузка исполнителей...
                        </div>
                      ) : (
                        assigneesList.map(assignee => (
                          <div
                            key={assignee.id}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '4px 0',
                              borderBottom: '1px solid #e1e4e8',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {/* АВАТАРКА вместо цветного квадрата */}
                              {assignee.avatarUrl ? (
                                <img
                                  src={assignee.avatarUrl}
                                  alt={assignee.displayName}
                                  style={{
                                    width: '20px',
                                    height: '20px',
                                    borderRadius: '50%',
                                    objectFit: 'cover',
                                    border: '1px solid #ccc',
                                  }}
                                />
                              ) : assignee.id === 'unassigned' ? (
                                // Для "Не назначено" - иконка человека
                                <div
                                  style={{
                                    width: '20px',
                                    height: '20px',
                                    borderRadius: '50%',
                                    backgroundColor: '#f0f0f0',
                                    border: '1px solid #ccc',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '10px',
                                  }}
                                >
                                  👤
                                </div>
                              ) : (
                                // Fallback: цветной квадрат с инициалами
                                <div
                                  style={{
                                    width: '20px',
                                    height: '20px',
                                    backgroundColor: getCurrentColor(assignee.id) || assignee.color,
                                    border: '1px solid #ccc',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '9px',
                                    fontWeight: 'bold',
                                    color: '#fff',
                                  }}
                                >
                                  {assignee.displayName.charAt(0)}
                                </div>
                              )}

                              <span style={{ fontSize: '12px' }}>
                                {assignee.displayName} ({assignee.name})
                              </span>
                            </div>

                            {/* Кнопка выбора цвета остается */}
                            <div style={{ position: 'relative' }}>
                              <button
                                onClick={() =>
                                  setShowColorPickerFor(showColorPickerFor === assignee.id ? null : assignee.id)
                                }
                                style={{
                                  width: '20px',
                                  height: '20px',
                                  backgroundColor: getCurrentColor(assignee.id) || assignee.color,
                                  border: '1px solid #ccc',
                                  borderRadius: '3px',
                                  cursor: 'pointer',
                                  padding: 0,
                                }}
                                title="Выбрать цвет"
                              />

                              {/* Окно выбора цвета */}
                              {showColorPickerFor === assignee.id && (
                                <div
                                  style={{
                                    position: 'absolute',
                                    top: '25px',
                                    right: '0',
                                    backgroundColor: 'white',
                                    border: '1px solid #ccc',
                                    borderRadius: '4px',
                                    padding: '6px',
                                    zIndex: 1000,
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                                    width: '140px',
                                  }}
                                >
                                  <div style={{ fontSize: '10px', color: '#666', marginBottom: '4px' }}>
                                    Цвет для {assignee.displayName}:
                                  </div>
                                  <div
                                    style={{
                                      display: 'grid',
                                      gridTemplateColumns: 'repeat(4, 1fr)',
                                      gap: '4px',
                                    }}
                                  >
                                    {COLOR_OPTIONS.map(color => (
                                      <button
                                        key={color.value}
                                        onClick={e => {
                                          e.stopPropagation();
                                          handleColorSelect(assignee.id, color.value);
                                        }}
                                        style={{
                                          width: '24px',
                                          height: '24px',
                                          backgroundColor: color.value,
                                          border: '1px solid #ccc',
                                          borderRadius: '3px',
                                          cursor: 'pointer',
                                        }}
                                        title={color.name}
                                      />
                                    ))}
                                  </div>
                                  <div style={{ marginTop: '6px', fontSize: '10px', color: '#888' }}>
                                    Кликните по цвету
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                <div style={{ marginBottom: '8px' }}>
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Тип подсветки:</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input
                        type="radio"
                        name="visualization"
                        checked={selectedVizType === 'stripe'}
                        onChange={() => handleVizTypeChange('stripe')}
                      />
                      Полоска слева
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input
                        type="radio"
                        name="visualization"
                        checked={selectedVizType === 'background'}
                        onChange={() => handleVizTypeChange('background')}
                      />
                      Цвет фона
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input
                        type="radio"
                        name="visualization"
                        checked={selectedVizType === 'border'}
                        onChange={() => handleVizTypeChange('border')}
                      />
                      Цветная рамка
                    </label>
                  </div>
                </div>

                <div style={{ fontSize: '11px', color: '#888', marginTop: '12px' }}>
                  Ядро исполнителей инициализируется при включении
                </div>
              </div>
            )}

            {settingsTab === 'wip-limits' && <PersonalWipLimits />}
            {settingsTab === 'column-groups' && <ColumnGroupsWipLimits />}
          </div>

          <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #eee' }}>
            <button
              onClick={() => {
                setShowSettings(false);
                // Обновляем визуализацию при закрытии
                if (assigneeEnabled) {
                  setTimeout(() => {
                    visualizationManager.updateVisualization();
                  }, 100);
                }
              }}
              className={styles['jh-settings-save-all-btn']}
            >
              💾 Сохранить и закрыть
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
