// src/cloud/shared/di/container.ts
// DI-контейнер для cloud-версии расширения (используем Server токен)

import { Container } from 'dioma';
import {
 settingsServiceToken,
 columnServiceToken,
 assigneeServiceToken,
 avatarIndicatorServiceToken,
 personLimitsApplierToken,
 columnLimitsApplierToken,
 columnGroupLimitPanelToken,
 assigneeHighlighterApplierToken,
 dynamicUpdaterToken,
} from './tokens';
import { registerJiraApiCloudInDI } from './jiraApiTokens.cloud';
import { boardPagePageObjectToken } from '../../../shared/di/boardPageObjectToken';

import { SettingsService } from '../SettingsService';
import { ColumnService } from '../ColumnService';
import { AssigneeService } from '../AssigneeService';
import { AvatarIndicatorService } from '../AvatarIndicatorService';
import { BoardPagePageObject } from '../BoardPagePageObject';
import { PersonLimitsApplier } from '../../features/person-limits/PersonLimitsApplier';
import { ColumnLimitsApplier } from '../../features/column-limits/ColumnLimitsApplier';
import { ColumnGroupLimitPanel } from '../../features/column-limits/ColumnGroupLimitPanel';
import { AssigneeHighlighterApplier } from '../../features/assignee-highlighter/AssigneeHighlighterApplier';
import { DynamicUpdater } from '../DynamicUpdater';

import { registerInContainer as registerPersonLimits } from '../../features/person-limits/register';
import { registerInContainer as registerColumnLimits } from '../../features/column-limits/register';
import { registerInContainer as registerAssigneeHighlighter } from '../../features/assignee-highlighter/register';

export const cloudContainer = new Container();

export function registerCloudServices(): void {
 cloudContainer.register({
 token: boardPagePageObjectToken,
 value: BoardPagePageObject,
 });

 cloudContainer.register({
 token: settingsServiceToken,
 value: new SettingsService(cloudContainer.inject(boardPagePageObjectToken)),
 });

 cloudContainer.register({
 token: columnServiceToken,
 value: new ColumnService(cloudContainer.inject(boardPagePageObjectToken)),
 });

 cloudContainer.register({
 token: assigneeServiceToken,
 value: new AssigneeService(cloudContainer.inject(settingsServiceToken)),
 });

 cloudContainer.register({
 token: avatarIndicatorServiceToken,
 value: new AvatarIndicatorService(cloudContainer.inject(assigneeServiceToken)),
 });

 cloudContainer.register({
 token: columnGroupLimitPanelToken,
 value: new ColumnGroupLimitPanel(),
 });

 cloudContainer.register({
 token: dynamicUpdaterToken,
 value: new DynamicUpdater(),
 });

 cloudContainer.register({
 token: personLimitsApplierToken,
 value: (() => {
 const settingsService = cloudContainer.inject(settingsServiceToken);
 const updater = cloudContainer.inject(dynamicUpdaterToken);
 const applier = new PersonLimitsApplier(
 settingsService,
 cloudContainer.inject(columnServiceToken),
 cloudContainer.inject(assigneeServiceToken),
 cloudContainer.inject(avatarIndicatorServiceToken),
 cloudContainer.inject(boardPagePageObjectToken)
 );
 // Подписка на DynamicUpdater
 updater.onUpdate(() => applier.update());
 // Подписка на изменение настроек
 settingsService.onSettingsChanged(() => {
 console.log('[SettingsService] Изменение настроек - обновляем PersonLimitsApplier');
 applier.update();
 });
 return applier;
 })(),
 });

 cloudContainer.register({
 token: columnLimitsApplierToken,
 value: (() => {
 const settingsService = cloudContainer.inject(settingsServiceToken);
 const updater = cloudContainer.inject(dynamicUpdaterToken);
 const applier = new ColumnLimitsApplier(
 settingsService,
 cloudContainer.inject(columnServiceToken),
 cloudContainer.inject(assigneeServiceToken),
 cloudContainer.inject(avatarIndicatorServiceToken),
 cloudContainer.inject(columnGroupLimitPanelToken),
 cloudContainer.inject(boardPagePageObjectToken)
 );
 // Подписка на DynamicUpdater
 updater.onUpdate(() => applier.update());
 // Подписка на изменение настроек
 settingsService.onSettingsChanged(() => {
 console.log('[SettingsService] Изменение настроек - обновляем ColumnLimitsApplier');
 applier.update();
 });
 return applier;
 })(),
 });

 cloudContainer.register({
 token: assigneeHighlighterApplierToken,
 value: (() => {
 const settingsService = cloudContainer.inject(settingsServiceToken);
 const updater = cloudContainer.inject(dynamicUpdaterToken);
 const applier = new AssigneeHighlighterApplier(
 settingsService,
 cloudContainer.inject(assigneeServiceToken)
 );
 // Подписка на DynamicUpdater
 updater.onUpdate(() => applier.updateVisualization());
 // Подписка на изменение настроек
 settingsService.onSettingsChanged(() => {
 console.log('[SettingsService] Изменение настроек - обновляем AssigneeHighlighterApplier');
 applier.updateVisualization();
 });
 return applier;
 })(),
 });

 registerPersonLimits(cloudContainer);
 registerColumnLimits(cloudContainer);
 registerAssigneeHighlighter(cloudContainer);

 // Регистрируем Cloud API адаптеры
 registerJiraApiCloudInDI(cloudContainer);

 console.log('[DI] Cloud services registered');
}

export function resolveService<T>(token: any): T {
 return cloudContainer.inject(token);
}
