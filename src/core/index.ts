// src/core/index.ts

declare global {
  interface Window {
    JiraHelper: any;
  }
}

// ВРЕМЕННЫЙ SETTINGS MANAGER (пока не работает модульная система)
class TempSettingsManager {
  getSettings() {
    try {
      const saved = localStorage.getItem('jira-helper-settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          columnColors: parsed.columnColors || { enabled: false },
          assigneeHighlight: parsed.assigneeHighlight || {
            enabled: false,
            visualizationType: 'stripe',
            autoColors: true,
            customColors: {},
            customBackgroundColors: {},
            highlightUnassigned: true,
            unassignedColor: 'rgba(0, 0, 0, 0.5)',
            unassignedBackgroundColor: 'rgba(0, 0, 0, 0.1)',
          },
          assigneeOverload: parsed.assigneeOverload || {
            enabled: true,
            threshold: 2,
            borderColor: '#000000',
            borderWidth: '3px',
          },
          personalWipLimits: parsed.personalWipLimits || {
            enabled: false,
            limits: []
          }
        };
      }
    } catch (error) {
      console.error('[TempSettingsManager] Ошибка загрузки настроек:', error);
    }
    
    // Настройки по умолчанию
    return {
      columnColors: { enabled: false },
      assigneeHighlight: {
        enabled: false,
        visualizationType: 'stripe',
        autoColors: true,
        customColors: {},
        customBackgroundColors: {},
        highlightUnassigned: true,
        unassignedColor: 'rgba(0, 0, 0, 0.5)',
        unassignedBackgroundColor: 'rgba(0, 0, 0, 0.1)',
      },
      assigneeOverload: {
        enabled: true,
        threshold: 2,
        borderColor: '#000000',
        borderWidth: '3px',
      },
      personalWipLimits: {
        enabled: false,
        limits: []
      }
    };
  }

  updateSettings(updates: any) {
    const current = this.getSettings();
    const newSettings = { ...current, ...updates };
    
    // Особые случаи для вложенных объектов
    if (updates.assigneeHighlight) {
      newSettings.assigneeHighlight = { 
        ...current.assigneeHighlight, 
        ...updates.assigneeHighlight 
      };
    }
    if (updates.personalWipLimits) {
      newSettings.personalWipLimits = { 
        ...current.personalWipLimits, 
        ...updates.personalWipLimits 
      };
    }
    
    localStorage.setItem('jira-helper-settings', JSON.stringify(newSettings));
  }
}

// Создаём глобальный экземпляр
const tempSettingsManager = new TempSettingsManager();

// ИМПОРТЫ
import { settingsManager } from './SettingsManager';
import { assigneeManager } from './AssigneeManager';
import { visualizationManager } from './VisualizationManager';
import { workloadManager } from './WorkloadManager';
import { overloadVisualizer } from './OverloadVisualizer';
import { columnManager } from './ColumnManager';
import { wipLimitsManager } from './WipLimitsManager';
import { avatarIndicatorManager } from './AvatarIndicatorManager';

// ЭКСПОРТЫ
export { settingsManager } from './SettingsManager';
export { assigneeManager, type Assignee } from './AssigneeManager';
export { visualizationManager } from './VisualizationManager';
export { workloadManager } from './WorkloadManager';
export { overloadVisualizer } from './OverloadVisualizer';
export { columnManager } from './ColumnManager';
export { wipLimitsManager } from './WipLimitsManager';
export type { Settings, AssigneeHighlightSettings } from './SettingsManager';
export { avatarIndicatorManager } from './AvatarIndicatorManager';
export type { AvatarIndicator } from './AvatarIndicatorManager';

// Глобальная инициализация расширения
export function initializeCore(): void {
  console.log('[Jira Helper] Инициализация ядра расширения');

  // Используем временный менеджер
  const tempSettings = tempSettingsManager.getSettings();

  // Создаём или дополняем глобальный объект
  window.JiraHelper = window.JiraHelper || {};
  
  // Добавляем менеджеры если их нет (используем временный settingsManager)
  window.JiraHelper.settingsManager = window.JiraHelper.settingsManager || tempSettingsManager;
  window.JiraHelper.assigneeManager = window.JiraHelper.assigneeManager || assigneeManager;
  window.JiraHelper.visualizationManager = window.JiraHelper.visualizationManager || visualizationManager;
  window.JiraHelper.workloadManager = window.JiraHelper.workloadManager || workloadManager;
  window.JiraHelper.overloadVisualizer = window.JiraHelper.overloadVisualizer || overloadVisualizer;
  window.JiraHelper.columnManager = window.JiraHelper.columnManager || columnManager;
  window.JiraHelper.wipLimitsManager = window.JiraHelper.wipLimitsManager || wipLimitsManager;
  window.JiraHelper.AvatarIndicatorManager = window.JiraHelper.AvatarIndicatorManager || avatarIndicatorManager;
  window.JiraHelper.initializeCore = window.JiraHelper.initializeCore || initializeCore;

  console.log('[Jira Helper] JiraHelper экспортирован в глобальную область');

  // Автоматическое включение перегрузки исполнителей (если включено в настройках)
  if (tempSettings.assigneeOverload?.enabled) {
    setTimeout(() => {
      try {
        overloadVisualizer.setEnabled(true);
        console.log('[Jira Helper] Фича перегрузки исполнителей включена');
      } catch (error) {
        console.error('[Jira Helper] Ошибка инициализации перегрузки:', error);
      }
    }, 2000);
  }

  // Инициализируем менеджер нагрузки (начинаем отслеживание)
  try {
    workloadManager.calculateWorkload();
    console.log('[Jira Helper] WorkloadManager инициализирован');
  } catch (error) {
    console.error('[Jira Helper] Ошибка инициализации WorkloadManager:', error);
  }

  console.log('[Jira Helper] AvatarIndicatorManager добавлен:', !!window.JiraHelper.AvatarIndicatorManager);
}

// Экспортируем утилиты для тестирования
export const debugUtils = {
  reloadSettings: () => {
    const saved = localStorage.getItem('jira-helper-settings');
    console.log('Текущие настройки:', saved ? JSON.parse(saved) : 'Нет сохраненных настроек');
  },
  forceOverloadUpdate: () => {
    overloadVisualizer.update();
    console.log('Визуализация перегрузки принудительно обновлена');
  },
  getOverloadedAssignees: () => {
    const overloaded = workloadManager.getOverloadedAssignees();
    console.log('Перегруженные исполнители:', overloaded);
    return overloaded;
  },
};

// Авто-инициализация при импорте (если в браузере)
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  // Ждем загрузки DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(initializeCore, 1000);
    });
  } else {
    setTimeout(initializeCore, 1000);
  }
}