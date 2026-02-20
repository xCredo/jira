// src/core/index.ts

declare global {
  interface Window {
    JiraHelper: any;
  }
}

// ИМПОРТЫ
import { settingsManager } from './SettingsManager';
import { assigneeManager } from './AssigneeManager';
import { visualizationManager } from './VisualizationManager';
import { columnManager } from './ColumnManager';
import { wipLimitsManager } from './WipLimitsManager';
import { avatarIndicatorManager } from './AvatarIndicatorManager';
import { columnGroupVisualizer } from './ColumnGroupVisualizer';
import { groupWipLimitsManager } from './GroupWipLimitsManager';
import { dynamicUpdater } from './DynamicUpdater';

// ЭКСПОРТЫ
export { settingsManager } from './SettingsManager';
export { assigneeManager, type Assignee } from './AssigneeManager';
export { visualizationManager } from './VisualizationManager';
export { columnManager } from './ColumnManager';
export { wipLimitsManager } from './WipLimitsManager';
export type { Settings, AssigneeHighlightSettings } from './SettingsManager';
export { avatarIndicatorManager } from './AvatarIndicatorManager';
export type { AvatarIndicator } from './AvatarIndicatorManager';
export { groupWipLimitsManager } from './GroupWipLimitsManager';
export { columnGroupVisualizer } from './ColumnGroupVisualizer';

// Глобальная инициализация расширения
export function initializeCore(): void {
  console.log('[Jira Helper] Инициализация ядра расширения');

  // Получаем реальные настройки
  const settings = settingsManager.getSettings();

  // Создаём или дополняем глобальный объект
  window.JiraHelper = window.JiraHelper || {};
  window.JiraHelper.settingsManager = window.JiraHelper.settingsManager || settingsManager;
  window.JiraHelper.assigneeManager = window.JiraHelper.assigneeManager || assigneeManager;
  window.JiraHelper.visualizationManager = window.JiraHelper.visualizationManager || visualizationManager;
  window.JiraHelper.columnManager = window.JiraHelper.columnManager || columnManager;
  window.JiraHelper.wipLimitsManager = window.JiraHelper.wipLimitsManager || wipLimitsManager;
  window.JiraHelper.AvatarIndicatorManager = window.JiraHelper.AvatarIndicatorManager || avatarIndicatorManager;
  window.JiraHelper.GroupWipLimitsManager = window.JiraHelper.GroupWipLimitsManager || groupWipLimitsManager;
  window.JiraHelper.ColumnGroupVisualizer = window.JiraHelper.ColumnGroupVisualizer || columnGroupVisualizer;
  window.JiraHelper.dynamicUpdater = window.JiraHelper.dynamicUpdater || dynamicUpdater;
  window.JiraHelper.initializeCore = window.JiraHelper.initializeCore || initializeCore;

  console.log('[Jira Helper] JiraHelper экспортирован в глобальную область');

  // Автоматическое включение перегрузки исполнителей (если включено в настройках)
  /* if (settings.assigneeOverload?.enabled) {
    setTimeout(() => {
      try {
        overloadVisualizer.setEnabled(true);
        console.log('[Jira Helper] Фича перегрузки исполнителей включена');
      } catch (error) {
        console.error('[Jira Helper] Ошибка инициализации перегрузки:', error);
      }
    }, 2000);
  }
 */
  // Инициализируем менеджер нагрузки (начинаем отслеживание)
  /* try {
    workloadManager.calculateWorkload();
    console.log('[Jira Helper] WorkloadManager инициализирован');
  } catch (error) {
    console.error('[Jira Helper] Ошибка инициализации WorkloadManager:', error);
  } */

  // Запускаем DynamicUpdater
  try {
    setTimeout(() => {
      dynamicUpdater.start();
      console.log('[Jira Helper] DynamicUpdater запущен');
    }, 1500);
  } catch (error) {
    console.error('[Jira Helper] Ошибка запуска DynamicUpdater:', error);
  }

  console.log('[Jira Helper] AvatarIndicatorManager добавлен:', !!window.JiraHelper.AvatarIndicatorManager);
}

// Экспортируем утилиты для тестирования
export const debugUtils = {
  reloadSettings: () => {
    const saved = localStorage.getItem('jira-helper-settings');
    console.log('Текущие настройки:', saved ? JSON.parse(saved) : 'Нет сохраненных настроек');
  },
  /* forceOverloadUpdate: () => {
    overloadVisualizer.update();
    console.log('Визуализация перегрузки принудительно обновлена');
  },
  getOverloadedAssignees: () => {
    const overloaded = workloadManager.getOverloadedAssignees();
    console.log('Перегруженные исполнители:', overloaded);
    return overloaded;
  }, */
};

// Авто-инициализация при импорте (если в браузере)
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(initializeCore, 1000);
    });
  } else {
    setTimeout(initializeCore, 1000);
  }
}