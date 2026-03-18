// src/cloud/content.cloud.ts
// Точка входа для Jira Cloud
import React from 'react';
import { createRoot } from 'react-dom/client';
import {
  cloudContainer,
  registerCloudServices,
  settingsServiceToken,
  personLimitsApplierToken,
  columnLimitsApplierToken,
  assigneeHighlighterApplierToken,
  dynamicUpdaterToken,
} from './shared/di';
import { SettingsButton } from './ui';

/**
 * Монтирует кнопку настроек в header Jira Cloud
 */
function mountSettingsButton(): boolean {
  // Ищем контейнер для кнопки в Jira Cloud
  const controlsBar = document.querySelector('[data-testid="software-board.header.controls-bar"]');

  if (controlsBar && !controlsBar.querySelector('[data-jh-settings-button]')) {
    const container = document.createElement('div');
    container.setAttribute('data-jh-settings-button', '');
    container.style.display = 'inline-block';
    container.style.marginLeft = '8px';
    container.style.position = 'relative';
    controlsBar.appendChild(container);

    const root = createRoot(container);
    root.render(React.createElement(SettingsButton));

    console.log('[Jira Helper Cloud] Кнопка настроек смонтирована');
    return true;
  }

  return false;
}

/**
 * Ожидает появления контейнера и монтирует кнопку
 */
function waitForMount(): void {
  if (mountSettingsButton()) {
    return;
  }

  // Если контейнер ещё не появился, ждём
  const observer = new MutationObserver(() => {
    if (mountSettingsButton()) {
      observer.disconnect();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // Таймаут на случай, если контейнер так и не появится
  setTimeout(() => {
    observer.disconnect();
  }, 10000);
}
// Инициализация всех модулей
export function initializeCloudExtension(): void {
  console.log('[Jira Helper Cloud] Инициализация расширения для Jira Cloud');

  // Регистрируем все сервисы в DI-контейнере
  registerCloudServices();

  // Монтируем кнопку настроек
  waitForMount();

  // Получаем appliers из контейнера
  const personLimitsApplier = cloudContainer.inject(personLimitsApplierToken);
  const columnLimitsApplier = cloudContainer.inject(columnLimitsApplierToken);
  const assigneeHighlighterApplier = cloudContainer.inject(assigneeHighlighterApplierToken);
  const dynamicUpdater = cloudContainer.inject(dynamicUpdaterToken);
  const settingsService = cloudContainer.inject(settingsServiceToken);

  // Инициализируем appliers
  personLimitsApplier.init();
  columnLimitsApplier.init();

  // Запускаем DynamicUpdater сразу
  dynamicUpdater.start();
  console.log('[Jira Helper Cloud] DynamicUpdater запущен');

  // Применяем начальные настройки сразу
  const settings = settingsService.getSettings();

  // Включаем подсветку исполнителей если настроена
  if (settings.assigneeHighlight?.enabled) {
    assigneeHighlighterApplier.enable();
    console.log('[Jira Helper Cloud] Подсветка исполнителей включена');
  }

  console.log('[Jira Helper Cloud] Инициализация завершена');
}

// Авто-инициализация при загрузке в браузере
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initializeCloudExtension();
    });
  } else {
    initializeCloudExtension();
  }
}

// Экспорт контейнера для внешнего использования
export { cloudContainer };

// Экспорт токенов для получения сервисов
export {
  settingsServiceToken,
  columnServiceToken,
  assigneeServiceToken,
  avatarIndicatorServiceToken,
  personLimitsApplierToken,
  columnLimitsApplierToken,
  assigneeHighlighterApplierToken,
  dynamicUpdaterToken,
} from './shared/di';

// Экспорт типов
export type { Settings, AssigneeHighlightSettings, WipLimitSettings, ColumnGroupWipLimitSettings } from './shared';
