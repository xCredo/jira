import type { Container } from 'dioma';
import { boardPagePageObjectToken } from '../../../infrastructure/page-objects/BoardPage';
import {
  getBoardPropertyToken,
  getBoardEditDataToken,
  updateBoardPropertyToken,
  deleteBoardPropertyToken,
} from '../../../infrastructure/di/jiraApiTokens';
import { getBoardEditDataCloud } from '../jiraApi.cloud';
import { SettingsStorage, SETTINGS_KEYS } from '../SettingsStorage';
import type { SettingsService } from '../SettingsService';
import type { WipLimitsProperty } from '../../../features/column-limits-module/types';
import { BOARD_PROPERTIES } from '../../../shared/constants';

const LS_PREFIX = 'jh-prop-';

interface CloudColumnGroupWipLimit {
  id: string;
  name: string;
  columnIds: string[];
  columnNames: string[];
  limit: number;
  baseColor: string;
  warningColor?: string;
}

function wipLimitsToCloudFormat(
  wipLimits: WipLimitsProperty,
  realColumns: Array<{ id: string; name: string }>
) {
  const limits: CloudColumnGroupWipLimit[] = Object.entries(wipLimits).map(([name, group]) => {
    const ids: string[] = group.columns;

    const positionalIds: string[] = ids.map(realId => {
      const idx = realColumns.findIndex(c => c.id === realId);
      return idx !== -1 ? `column-${idx}` : realId;
    });

    const columnNames: string[] = ids.map(realId => {
      const idx = realColumns.findIndex(c => c.id === realId);
      return idx !== -1 ? realColumns[idx].name : realId;
    });

    return {
      id: `group-${name.replace(/[^a-zA-Z0-9]/g, '_')}-${Date.now()}`,
      name,
      columnIds: positionalIds,
      columnNames,
      limit: group.max ?? 100,
      baseColor: group.customHexColor || '#0095ff',
      ...(group.warningColor ? { warningColor: group.warningColor } : {}),
    };
  });

  return { enabled: true, limits };
}

function cloudFormatToWipLimits(
  cloudData: {
    enabled: boolean;
    limits: CloudColumnGroupWipLimit[];
  },
  realColumns: Array<{ id: string; name: string }>
): WipLimitsProperty {
  if (!cloudData.enabled || !cloudData.limits || cloudData.limits.length === 0) {
    return {};
  }

  const result: WipLimitsProperty = {};
  cloudData.limits.forEach(limit => {
    const realColumnsInGroup = limit.columnIds.map((colId: string) => {
      const match = colId.match(/^column-(\d+)$/);
      if (match) {
        const idx = parseInt(match[1], 10);
        return realColumns[idx]?.id || colId;
      }
      return colId;
    });

    result[limit.name] = {
      columns: realColumnsInGroup,
      max: limit.limit,
      customHexColor: limit.baseColor,
      ...(limit.warningColor ? { warningColor: limit.warningColor } : {}),
    };
  });

  return result;
}

function getBoardColumns(boardPage: any): Array<{ id: string; name: string }> {
  return boardPage.getOrderedColumns() || [];
}

export function registerServerApiCloudAdapters(
  container: Container,
  settingsService?: SettingsService
): void {
  const boardPage = container.inject(boardPagePageObjectToken);
  const storage = new SettingsStorage(boardPage as any);

  container.register({
    token: getBoardPropertyToken,
    value: async <T>(_boardId: string, property: string, _options?: any): Promise<T | undefined> => {
      console.log(`[CloudAdapter:getBoardProperty] property="${property}"`);

      const local = localStorage.getItem(`${LS_PREFIX}${property}`);
      if (local) {
        try {
          const parsed = JSON.parse(local) as T;
          const isEmpty = typeof parsed === 'object' && !Array.isArray(parsed) && parsed !== null && Object.keys(parsed as object).length === 0;
          if (!isEmpty) {
            console.log(`[CloudAdapter:getBoardProperty] from localStorage cache`);
            return parsed;
          }
          console.log(`[CloudAdapter:getBoardProperty] localStorage cache is empty, proceeding to API`);
        } catch {
          console.log(`[CloudAdapter:getBoardProperty] localStorage cache parse failed`);
        }
      }

      let api = await storage.get<any>(property);
      console.log(`[CloudAdapter:getBoardProperty] storage.get returned:`, api === null ? 'null' : typeof api);

      if (api !== null) {
        if (typeof api === 'object' && 'value' in api) {
          console.log(`[CloudAdapter:getBoardProperty] unwrapping value wrapper`);
          api = api.value as T;
        }
        localStorage.setItem(`${LS_PREFIX}${property}`, JSON.stringify(api));
        console.log(`[CloudAdapter:getBoardProperty] cached in localStorage`);
      }

      const isEmptyObject = api !== null && typeof api === 'object' && !Array.isArray(api) && Object.keys(api as object).length === 0;
      if (property === BOARD_PROPERTIES.WIP_LIMITS_SETTINGS && (api === null || isEmptyObject)) {
        console.log(`[CloudAdapter:getBoardProperty] subgroupsJH empty, trying cloud fallback`);

        const cloudData = await storage.get<{ enabled: boolean; limits: CloudColumnGroupWipLimit[] }>(
          SETTINGS_KEYS.COLUMN_LIMITS
        );
        console.log(`[CloudAdapter:getBoardProperty] cloud fallback returned:`, cloudData === null ? 'null' : 'object');

        if (cloudData) {
          const raw = typeof cloudData === 'object' && 'value' in cloudData ? (cloudData as any).value : cloudData;
          console.log(`[CloudAdapter:getBoardProperty] cloud raw after unwrap:`, JSON.stringify(raw).substring(0, 300));
          if (raw && raw.enabled && raw.limits?.length) {
            const realColumns = getBoardColumns(boardPage);
            const converted = cloudFormatToWipLimits(raw, realColumns) as T;
            console.log(`[CloudAdapter:getBoardProperty] converted:`, JSON.stringify(converted).substring(0, 300));
            localStorage.setItem(`${LS_PREFIX}${property}`, JSON.stringify(converted));
            console.log(`[CloudAdapter:getBoardProperty] cloud-converted data cached`);
            return converted;
          }
          console.log(`[CloudAdapter:getBoardProperty] cloud raw disabled or empty`);
        }
      }

      const result = api ?? undefined;
      console.log(`[CloudAdapter:getBoardProperty] returning:`, result === undefined ? 'undefined' : JSON.stringify(result).substring(0, 100));
      return result;
    },
  });

  container.register({
    token: getBoardEditDataToken,
    value: (_boardId: string, options?: { abortPromise?: Promise<void> }) =>
      getBoardEditDataCloud(boardPage as any, options?.abortPromise),
  });

  container.register({
    token: updateBoardPropertyToken,
    value: async (_boardId: string, property: string, value: any, _options?: any) => {
      localStorage.setItem(`${LS_PREFIX}${property}`, JSON.stringify(value));
      await storage.set(property, value);

      if (property === BOARD_PROPERTIES.WIP_LIMITS_SETTINGS && value && typeof value === 'object') {
        try {
          const realColumns = getBoardColumns(boardPage);
          const cloudFormat = wipLimitsToCloudFormat(value as WipLimitsProperty, realColumns);
          console.log('[CloudAdapter] Синхронизация в jira-helper-column-limits-v1:', cloudFormat);

          if (settingsService) {
            await settingsService.updateSettings({ columnGroupWipLimits: cloudFormat });
            console.log('[CloudAdapter] SettingsService уведомлён (save + notify)');
          } else {
            await storage.set(SETTINGS_KEYS.COLUMN_LIMITS, cloudFormat);
            console.log('[CloudAdapter] Сохранено напрямую в jira-helper-column-limits-v1');
          }
        } catch (error) {
          console.error('[CloudAdapter] Ошибка синхронизации лимитов:', error);
        }
      }
    },
  });

  container.register({
    token: deleteBoardPropertyToken,
    value: async (_boardId: string, property: string, _options?: any) => {
      localStorage.removeItem(`${LS_PREFIX}${property}`);
      await storage.delete(property);
    },
  });
}
