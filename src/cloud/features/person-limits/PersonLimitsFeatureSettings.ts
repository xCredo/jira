// src/cloud/features/person-limits/PersonLimitsFeatureSettings.ts
// Настройки персональных WIP-лимитов - валидация и модель

import type { SettingsService } from '../../shared/SettingsService';

export interface PersonLimit {
  id: string;
  userId: string;
  userName: string;
  columnIds: string[];
  columnNames: string[];
  limit: number;
  color: string;
}

export interface PersonLimitsFeatureState {
  enabled: boolean;
  limits: PersonLimit[];
}

/**
 * Класс для работы с настройками персональных WIP-лимитов.
 * Инкапсулирует логику валидации и работы с настройками фичи.
 */
export class PersonLimitsFeatureSettings {
  constructor(private readonly settingsService: SettingsService) {}

  /**
   * Получить текущее состояние настроек фичи
   */
  getState(): PersonLimitsFeatureState {
    const settings = this.settingsService.getSettings();
    return {
      enabled: settings.personalWipLimits?.enabled || false,
      limits: settings.personalWipLimits?.limits || [],
    };
  }

  /**
   * Получить все лимиты
   */
  getLimits(): PersonLimit[] {
    return this.getState().limits;
  }

  /**
   * Получить лимит по ID
   */
  getLimitById(id: string): PersonLimit | undefined {
    return this.getLimits().find(l => l.id === id);
  }

  /**
   * Получить лимиты для конкретного пользователя
   */
  getLimitsByUserId(userId: string): PersonLimit[] {
    return this.getLimits().filter(l => l.userId === userId);
  }

  /**
   * Включить/выключить фичу
   */
  setEnabled(enabled: boolean): void {
    const current = this.getState();
    this.settingsService.updateSettings({
      personalWipLimits: {
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
   * Добавить новый лимит
   */
  addLimit(limit: Omit<PersonLimit, 'id'>): PersonLimit {
    const current = this.getState();
    const newLimit: PersonLimit = {
      ...limit,
      id: `limit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };

    this.settingsService.updateSettings({
      personalWipLimits: {
        enabled: current.enabled,
        limits: [...current.limits, newLimit],
      },
    });

    return newLimit;
  }

  /**
   * Обновить существующий лимит
   */
  updateLimit(id: string, updates: Partial<Omit<PersonLimit, 'id'>>): void {
    const current = this.getState();
    const updatedLimits = current.limits.map(l => 
      l.id === id ? { ...l, ...updates } : l
    );

    this.settingsService.updateSettings({
      personalWipLimits: {
        enabled: current.enabled,
        limits: updatedLimits,
      },
    });
  }

  /**
   * Удалить лимит
   */
  removeLimit(id: string): void {
    const current = this.getState();
    this.settingsService.updateSettings({
      personalWipLimits: {
        enabled: current.enabled,
        limits: current.limits.filter(l => l.id !== id),
      },
    });
  }

  /**
   * Валидация лимита
   */
  validateLimit(limit: Partial<PersonLimit>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!limit.userId || limit.userId.trim() === '') {
      errors.push('Необходимо выбрать исполнителя');
    }

    if (!limit.columnIds || limit.columnIds.length === 0) {
      errors.push('Необходимо выбрать хотя бы одну колонку');
    }

    if (limit.limit === undefined || limit.limit < 1) {
      errors.push('Лимит должен быть больше 0');
    }

    if (!limit.color || !this.isValidColor(limit.color)) {
      errors.push('Некорректный цвет');
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
   * Очистить все лимиты
   */
  clearAll(): void {
    this.settingsService.updateSettings({
      personalWipLimits: {
        enabled: false,
        limits: [],
      },
    });
  }
}
