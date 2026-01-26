// src/core/index.ts
export { settingsManager } from './SettingsManager';
export { assigneeManager, type Assignee } from './AssigneeManager';
export { visualizationManager } from './VisualizationManager';
export { workloadManager } from './WorkloadManager';
export { overloadVisualizer } from './OverloadVisualizer';
export { columnManager } from './ColumnManager';
export { wipLimitsManager } from './WipLimitsManager';
export type { Settings, AssigneeHighlightSettings } from './SettingsManager';

// Глобальная инициализация расширения
export function initializeCore(): void {
  console.log('[Jira Helper] Инициализация ядра расширения');

  // Загружаем настройки
  const settings = settingsManager.getSettings();

  // Автоматическое включение перегрузки исполнителей (если включено в настройках)
  if (settings.assigneeOverload.enabled) {
    setTimeout(() => {
      try {
        overloadVisualizer.setEnabled(true);
        console.log('[Jira Helper] Фича перегрузки исполнителей включена');
      } catch (error) {
        console.error('[Jira Helper] Ошибка инициализации перегрузки:', error);
      }
    }, 2000); // Даем время загрузиться Jira
  }

  // Инициализируем менеджер нагрузки (начинаем отслеживание)
  try {
    workloadManager.calculateWorkload();
    console.log('[Jira Helper] WorkloadManager инициализирован');
  } catch (error) {
    console.error('[Jira Helper] Ошибка инициализации WorkloadManager:', error);
  }

  // Экспортируем глобально для отладки
  if (typeof window !== 'undefined') {
    (window as any).JiraHelper = {
      settingsManager,
      assigneeManager,
      visualizationManager,
      workloadManager,
      overloadVisualizer,
      columnManager,
      wipLimitsManager,
      initializeCore,
    };
    console.log('[Jira Helper] JiraHelper экспортирован в глобальную область');
  }
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
