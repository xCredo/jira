// src/cloud/content.cloud.ts
// Точка входа для Jira Cloud

import {
  settingsService,
  columnService,
  assigneeService,
  avatarIndicatorService,
  dynamicUpdater,
  BoardPagePageObject,
  registerBoardPagePageObjectInDI,
} from './shared';

import { personLimitsApplier } from './features/person-limits';
import { columnLimitsApplier, columnGroupLimitPanel } from './features/column-limits';
import { assigneeHighlighterApplier } from './features/assignee-highlighter';

declare global {
  interface Window {
    JiraHelper: any;
  }
}

// Инициализация всех модулей
export function initializeCloudExtension(): void {
  console.log('[Jira Helper Cloud] Инициализация расширения для Jira Cloud');

  // Регистрируем в глобальном объекте
  window.JiraHelper = window.JiraHelper || {};
  
  // Сервисы
  window.JiraHelper.settingsService = settingsService;
  window.JiraHelper.columnService = columnService;
  window.JiraHelper.assigneeService = assigneeService;
  window.JiraHelper.avatarIndicatorService = avatarIndicatorService;
  window.JiraHelper.dynamicUpdater = dynamicUpdater;
  window.JiraHelper.BoardPagePageObject = BoardPagePageObject;
  
  // Обратная совместимость со старыми именами
  window.JiraHelper.settingsManager = settingsService;
  window.JiraHelper.columnManager = columnService;
  window.JiraHelper.assigneeManager = assigneeService;
  window.JiraHelper.avatarIndicatorManager = avatarIndicatorService;
  
  // Appliers
  window.JiraHelper.personLimitsApplier = personLimitsApplier;
  window.JiraHelper.columnLimitsApplier = columnLimitsApplier;
  window.JiraHelper.columnGroupLimitPanel = columnGroupLimitPanel;
  window.JiraHelper.assigneeHighlighterApplier = assigneeHighlighterApplier;
  
  // Обратная совместимость со старыми именами
  window.JiraHelper.wipLimitsManager = personLimitsApplier;
  window.JiraHelper.WipLimitsManager = personLimitsApplier;
  window.JiraHelper.GroupWipLimitsManager = columnLimitsApplier;
  window.JiraHelper.ColumnGroupVisualizer = columnGroupLimitPanel;
  window.JiraHelper.visualizationManager = assigneeHighlighterApplier;
  
  console.log('[Jira Helper Cloud] Модули зарегистрированы');

  // Инициализируем appliers
  personLimitsApplier.init();
  columnLimitsApplier.init();

  // Запускаем DynamicUpdater
  setTimeout(() => {
    dynamicUpdater.start();
    console.log('[Jira Helper Cloud] DynamicUpdater запущен');
  }, 1500);

  // Применяем начальные настройки
  const settings = settingsService.getSettings();
  
  // Включаем подсветку исполнителей если настроена
  if (settings.assigneeHighlight?.enabled) {
    setTimeout(() => {
      assigneeHighlighterApplier.enable();
      console.log('[Jira Helper Cloud] Подсветка исполнителей включена');
    }, 2000);
  }

  console.log('[Jira Helper Cloud] Инициализация завершена');
}

// Авто-инициализация при загрузке в браузере
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(initializeCloudExtension, 1000);
    });
  } else {
    setTimeout(initializeCloudExtension, 1000);
  }
}

// Экспорт для использования в других модулях
export {
  settingsService,
  columnService,
  assigneeService,
  avatarIndicatorService,
  dynamicUpdater,
  BoardPagePageObject,
  registerBoardPagePageObjectInDI,
  personLimitsApplier,
  columnLimitsApplier,
  columnGroupLimitPanel,
  assigneeHighlighterApplier,
};

// Экспорт типов
export type { Settings, AssigneeHighlightSettings, WipLimitSettings, ColumnGroupWipLimitSettings } from './shared';
