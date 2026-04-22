// src/cloud/content.cloud.ts
// Точка входа для Jira Cloud (исправлена асинхронная инициализация + Ant Design)

import 'antd/dist/reset.css';

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

function mountSettingsButton(): boolean {
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

function waitForMount(): void {
 if (mountSettingsButton()) {
 return;
 }

 const observer = new MutationObserver(() => {
 if (mountSettingsButton()) {
 observer.disconnect();
 }
 });

 observer.observe(document.body, { childList: true, subtree: true });

 setTimeout(() => {
 observer.disconnect();
 },10000);
}

// Инициализация всех модулей (async)
export async function initializeCloudExtension(): Promise<void> {
 console.log('[Jira Helper Cloud] Инициализация расширения для Jira Cloud');

 registerCloudServices();
 waitForMount();

 const personLimitsApplier = cloudContainer.inject(personLimitsApplierToken);
 const columnLimitsApplier = cloudContainer.inject(columnLimitsApplierToken);
 const assigneeHighlighterApplier = cloudContainer.inject(assigneeHighlighterApplierToken);
 const dynamicUpdater = cloudContainer.inject(dynamicUpdaterToken);
 const settingsService = cloudContainer.inject(settingsServiceToken);

 personLimitsApplier.init();
 columnLimitsApplier.init();

 // Ждём загрузки настроек перед применением
 await settingsService.waitForInit();

 personLimitsApplier.update();
 columnLimitsApplier.update();

 dynamicUpdater.start();
 console.log('[Jira Helper Cloud] DynamicUpdater запущен');

 const settings = settingsService.getSettings();

 if (settings.assigneeHighlight?.enabled) {
 assigneeHighlighterApplier.enable();
 console.log('[Jira Helper Cloud] Подсветка исполнителей включена');
 }

 console.log('[Jira Helper Cloud] Инициализация завершена');
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
 if (document.readyState === 'loading') {
 document.addEventListener('DOMContentLoaded', () => {
 initializeCloudExtension();
 });
 } else {
 initializeCloudExtension();
 }
}

export { cloudContainer };

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

export type { Settings, AssigneeHighlightSettings, WipLimitSettings, ColumnGroupWipLimitSettings } from './shared';
