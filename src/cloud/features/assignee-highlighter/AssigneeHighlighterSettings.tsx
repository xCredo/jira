// src/cloud/features/assignee-highlighter/AssigneeHighlighterSettings.tsx
// React-компонент настроек подсветки исполнителей

import React, { useState, useEffect } from 'react';
import { settingsService, AssigneeHighlightSettings } from '../../shared/SettingsService';
import { assigneeService, Assignee } from '../../shared/AssigneeService';

type VisualizationType = 'stripe' | 'background' | 'border';

export const AssigneeHighlighterSettings: React.FC = () => {
  const [enabled, setEnabled] = useState(false);
  const [visualizationType, setVisualizationType] = useState<VisualizationType>('stripe');
  const [autoColors, setAutoColors] = useState(true);
  const [highlightUnassigned, setHighlightUnassigned] = useState(true);
  const [unassignedColor, setUnassignedColor] = useState('rgba(0, 0, 0, 0.5)');
  const [availableAssignees, setAvailableAssignees] = useState<Assignee[]>([]);
  const [customColors, setCustomColors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadSettings();
    loadData();
  }, []);

  const loadSettings = () => {
    const settings = settingsService.getSettings();
    setEnabled(settings.assigneeHighlight?.enabled || false);
    setVisualizationType(settings.assigneeHighlight?.visualizationType || 'stripe');
    setAutoColors(settings.assigneeHighlight?.autoColors !== false);
    setHighlightUnassigned(settings.assigneeHighlight?.highlightUnassigned !== false);
    setUnassignedColor(settings.assigneeHighlight?.unassignedColor || 'rgba(0, 0, 0, 0.5)');
    setCustomColors(settings.assigneeHighlight?.customColors || {});
  };

  const loadData = () => {
    setAvailableAssignees(assigneeService.getAllAssigneesFromCards());
  };

  const handleToggleEnabled = () => {
    const newEnabled = !enabled;
    setEnabled(newEnabled);
    updateSettings({ enabled: newEnabled });
  };

  const handleVisualizationTypeChange = (type: VisualizationType) => {
    setVisualizationType(type);
    updateSettings({ visualizationType: type });
  };

  const handleAutoColorsToggle = () => {
    const newAutoColors = !autoColors;
    setAutoColors(newAutoColors);
    updateSettings({ autoColors: newAutoColors });
  };

  const handleHighlightUnassignedToggle = () => {
    const newHighlightUnassigned = !highlightUnassigned;
    setHighlightUnassigned(newHighlightUnassigned);
    updateSettings({ highlightUnassigned: newHighlightUnassigned });
  };

  const handleUnassignedColorChange = (color: string) => {
    setUnassignedColor(color);
    updateSettings({ unassignedColor: color });
  };

  const handleCustomColorChange = (assigneeId: string, color: string) => {
    const newCustomColors = { ...customColors, [assigneeId]: color };
    setCustomColors(newCustomColors);
    updateSettings({ customColors: newCustomColors });
  };

  const updateSettings = (updates: Partial<AssigneeHighlightSettings>) => {
    const currentSettings = settingsService.getSettings();
    settingsService.updateSettings({
      assigneeHighlight: {
        ...currentSettings.assigneeHighlight,
        ...updates,
      },
    });
  };

  return (
    <div className="assignee-highlighter-settings" style={{ padding: '20px' }}>
      <h2>Подсветка исполнителей</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="checkbox"
            checked={enabled}
            onChange={handleToggleEnabled}
          />
          Включить подсветку исполнителей
        </label>
      </div>

      {enabled && (
        <>
          <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ccc', borderRadius: '4px' }}>
            <h3>Тип визуализации</h3>
            
            <div style={{ display: 'flex', gap: '20px', marginTop: '10px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <input
                  type="radio"
                  name="visualizationType"
                  value="stripe"
                  checked={visualizationType === 'stripe'}
                  onChange={() => handleVisualizationTypeChange('stripe')}
                />
                Полоска слева
              </label>
              
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <input
                  type="radio"
                  name="visualizationType"
                  value="background"
                  checked={visualizationType === 'background'}
                  onChange={() => handleVisualizationTypeChange('background')}
                />
                Цвет фона
              </label>
              
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <input
                  type="radio"
                  name="visualizationType"
                  value="border"
                  checked={visualizationType === 'border'}
                  onChange={() => handleVisualizationTypeChange('border')}
                />
                Рамка
              </label>
            </div>
          </div>

          <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ccc', borderRadius: '4px' }}>
            <h3>Настройки</h3>
            
            <div style={{ marginTop: '10px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  checked={autoColors}
                  onChange={handleAutoColorsToggle}
                />
                Автоматические цвета
              </label>
            </div>

            <div style={{ marginTop: '10px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  checked={highlightUnassigned}
                  onChange={handleHighlightUnassignedToggle}
                />
                Подсвечивать "Не назначено"
              </label>
            </div>

            {highlightUnassigned && (
              <div style={{ marginTop: '10px' }}>
                <label>Цвет для "Не назначено":</label>
                <input
                  type="color"
                  value={unassignedColor.startsWith('rgba') ? '#000000' : unassignedColor}
                  onChange={(e) => handleUnassignedColorChange(e.target.value)}
                  style={{ marginLeft: '10px' }}
                />
              </div>
            )}
          </div>

          {!autoColors && (
            <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ccc', borderRadius: '4px' }}>
              <h3>Кастомные цвета</h3>
              
              {availableAssignees.length === 0 ? (
                <p>Нет назначенных исполнителей на доске</p>
              ) : (
                <div style={{ marginTop: '10px' }}>
                  {availableAssignees.map(assignee => (
                    <div key={assignee.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <span style={{ width: '150px' }}>{assignee.name}</span>
                      <input
                        type="color"
                        value={customColors[assignee.id] || assignee.color || '#808080'}
                        onChange={(e) => handleCustomColorChange(assignee.id, e.target.value)}
                      />
                      <div
                        style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          backgroundColor: customColors[assignee.id] || assignee.color || '#808080',
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AssigneeHighlighterSettings;
