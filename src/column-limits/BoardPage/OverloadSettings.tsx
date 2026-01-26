import React, { useState, useEffect } from 'react';
import { settingsManager } from '../../core/SettingsManager';

export const OverloadSettings: React.FC = () => {
  const [settings, setSettings] = useState(settingsManager.getSettings().assigneeOverload);

  useEffect(() => {
    const handleSettingsChange = () => {
      setSettings(settingsManager.getSettings().assigneeOverload);
    };

    settingsManager.subscribe(handleSettingsChange);
    return () => settingsManager.unsubscribe(handleSettingsChange);
  }, []);

  const handleToggle = (enabled: boolean) => {
    const newSettings = { ...settings, enabled };
    settingsManager.updateSettings({
      assigneeOverload: newSettings,
    });

    // Применяем изменения немедленно
    if (window.JiraHelper?.OverloadVisualizer) {
      window.JiraHelper.OverloadVisualizer.setEnabled(enabled);
    }
  };

  const handleThresholdChange = (threshold: number) => {
    const newSettings = { ...settings, threshold };
    settingsManager.updateSettings({
      assigneeOverload: newSettings,
    });
  };

  return (
    <div className="overload-settings">
      <h4>Перегрузка исполнителей</h4>

      <div className="setting-item">
        <label>
          <input type="checkbox" checked={settings.enabled} onChange={e => handleToggle(e.target.checked)} />
          Включить чёрные рамки для перегруженных исполнителей
        </label>
        <div className="setting-description">
          Карточки исполнителей с 2+ задачами в "In Progress" получат чёрную рамку
        </div>
      </div>

      <div className="setting-item">
        <label>
          Порог перегрузки (задач в In Progress):
          <input
            type="range"
            min="1"
            max="5"
            value={settings.threshold}
            onChange={e => handleThresholdChange(parseInt(e.target.value))}
          />
          <span>{settings.threshold} задачи</span>
        </label>
      </div>

      <div className="setting-item">
        <div className="preview">
          <div className="preview-card overload-preview">
            <div className="preview-content">
              <span className="preview-text">Пример карточки с перегрузкой</span>
            </div>
          </div>
          <div className="preview-label">Предпросмотр</div>
        </div>
      </div>
    </div>
  );
};
