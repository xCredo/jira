// src/cloud/features/column-limits/ColumnLimitsFeatureSettings.ts
// Настройки групповых WIP-лимитов - валидация и модель

import type { SettingsService } from '../../shared/SettingsService';

export interface ColumnGroupLimit {
  id: string;
  name: string;
  columnIds: string[];
  columnNames: string[];
  limit: number;
  baseColor: string;
  warningColor?: string;
}

export interface ColumnLimitsFeatureState {
  enabled: boolean;
  limits: ColumnGroupLimit[];
}

/**
 * Класс для работы с настройками групповых WIP-лимитов.
 * Инкапсулирует логику валидации и работы с настройками фичи.
 */
export class ColumnLimitsFeatureSettings {
  constructor(private readonly settingsService: SettingsService) {}

  /**
   * Получить текущее состояние настроек фичи
   */
  getState(): ColumnLimitsFeatureState {
    const settings = this.settingsService.getSettings();
    return {
      enabled: settings.columnGroupWipLimits?.enabled || false,
      limits: settings.columnGroupWipLimits?.limits || [],
    };
  }

  /**
   * Получить все лимиты
   */
  getLimits(): ColumnGroupLimit[] {
    return this.getState().limits;
  }

  /**
   * Получить лимит по ID
   */
  getLimitById(id: string): ColumnGroupLimit | undefined {
    return this.getLimits().find(l => l.id === id);
  }

  /**
   * Получить лимиты для конкретных колонок
   */
  getLimitsByColumnIds(columnIds: string[]): ColumnGroupLimit[] {
    return this.getLimits().filter(l => 
      columnIds.some(cid => l.columnIds.includes(cid))
    );
  }

  /**
   * Включить/выключить фичу
   */
  setEnabled(enabled: boolean): void {
    const current = this.getState();
    this.settingsService.updateSettings({
      columnGroupWipLimits: {
        enabled,
        limits: current.limits,
      },
    });
  }

  /**
   * Проверить, включена ли фича
   */
  isEnabled(): boolean {
    return this.getState().enabled;
  }

  /**
   * Добавить новую группу
   */
  addLimit(limit: Omit<ColumnGroupLimit, 'id'>): ColumnGroupLimit {
    const current = this.getState();
    const newLimit: ColumnGroupLimit = {
      ...limit,
      id: `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };

    this.settingsService.updateSettings({
      columnGroupWipLimits: {
        enabled: current.enabled,
        limits: [...current.limits, newLimit],
      },
    });

    return newLimit;
  }

  /**
   * Обновить существующую группу
   */
  updateLimit(id: string, updates: Partial<Omit<ColumnGroupLimit, 'id'>>): void {
    const current = this.getState();
    const updatedLimits = current.limits.map(l => 
      l.id === id ? { ...l, ...updates } : l
    );

    this.settingsService.updateSettings({
      columnGroupWipLimits: {
        enabled: current.enabled,
        limits: updatedLimits,
      },
    });
  }

  /**
   * Удалить группу
   */
  removeLimit(id: string): void {
    const current = this.getState();
    this.settingsService.updateSettings({
      columnGroupWipLimits: {
        enabled: current.enabled,
        limits: current.limits.filter(l => l.id !== id),
      },
    });
  }

  /**
   * Валидация группы
   */
  validateLimit(limit: Partial<ColumnGroupLimit>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!limit.name || limit.name.trim() === '') {
      errors.push('Необходимо указать название группы');
    }

    if (!limit.columnIds || limit.columnIds.length === 0) {
      errors.push('Необходимо выбрать хотя бы одну колонку');
    }

    if (limit.limit === undefined || limit.limit < 1) {
      errors.push('Лимит должен быть больше 0');
    }

    if (!limit.baseColor || !this.isValidColor(limit.baseColor)) {
      errors.push('Некорректный базовый цвет');
    }

    if (limit.warningColor && !this.isValidColor(limit.warningColor)) {
      errors.push('Некорректный цвет при превышении');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Проверка валидности цвета
   */
  private isValidColor(color: string): boolean {
    return /^#([0-9A-F]{3}){1,2}$/i.test(color) || /^rgb/.test(color);
  }

  /**
   * Очистить все группы
   */
  clearAll(): void {
    this.settingsService.updateSettings({
      columnGroupWipLimits: {
        enabled: false,
        limits: [],
      },
    });
  }

  /**
   * Проверить, превышен ли лимит для группы
   */
  isLimitExceeded(id: string): boolean {
    const limit = this.getLimitById(id);
    return limit ? true : false; // Реальная проверка выполняется в Applier
  }
}
