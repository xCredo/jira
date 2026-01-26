// src/core/SettingsManager.ts
export interface AssigneeHighlightSettings {
  enabled: boolean;
  visualizationType: 'stripe' | 'background' | 'border';
  autoColors: boolean;

  customColors: Record<string, string>; // Цвет рамки/полоски (полный)
  customBackgroundColors: Record<string, string>; // Цвет фона (с прозрачностью)

  highlightUnassigned: boolean;
  unassignedColor: string; // Цвет для "Не назначено" (рамка/полоска)
  unassignedBackgroundColor: string; // Фон для "Не назначено"
}

export interface ColumnColorsSettings {
  enabled: boolean;
}

export interface Settings {
  columnColors: ColumnColorsSettings;
  assigneeHighlight: AssigneeHighlightSettings;
  assigneeOverload: {
    enabled: boolean;
    threshold: number; // Минимальное количество задач для перегрузки (по умолчанию 2)
    borderColor: string; // Цвет рамки (по умолчанию #000000)
    borderWidth: string; // Толщина рамки (по умолчанию 3px)
  };
}

export class SettingsManager {
  private static instance: SettingsManager;

  private settings: Settings;

  private constructor() {
    this.settings = this.loadSettings();
  }

  static getInstance(): SettingsManager {
    if (!SettingsManager.instance) {
      SettingsManager.instance = new SettingsManager();
    }
    return SettingsManager.instance;
  }

  getSettings(): Settings {
    return { ...this.settings };
  }

  updateSettings(updates: Partial<Settings>): void {
    this.settings = {
      ...this.settings,
      ...updates,
      assigneeHighlight: {
        ...this.settings.assigneeHighlight,
        ...updates.assigneeHighlight,
      },
    };

    this.saveSettings();
  }

  // Для обратной совместимости с фичей "Колонки"
  setColumnColorsEnabled(enabled: boolean): void {
    this.settings.columnColors.enabled = enabled;
    this.saveSettings();
  }

  // Для кастомных цветов исполнителей
  setAssigneeColor(assigneeId: string, color: string): void {
    this.settings.assigneeHighlight.customColors[assigneeId] = color;
    this.saveSettings();
  }

  private loadSettings(): Settings {
    try {
      const saved = localStorage.getItem('jira-helper-settings');
      if (saved) {
        // Если есть сохранённые настройки, добавляем дефолтные для assigneeOverload
        const parsed = JSON.parse(saved);
        return {
          ...parsed,
          assigneeOverload: parsed.assigneeOverload || {
            enabled: true,
            threshold: 2,
            borderColor: '#000000',
            borderWidth: '3px',
          },
        };
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[Jira Helper] Ошибка загрузки настроек:', error);
    }

    // Настройки по умолчанию (ПОЛНЫЙ объект)
    return {
      columnColors: {
        enabled: false,
      },
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
        // ✅ ДОБАВЛЕНО
        enabled: true,
        threshold: 2,
        borderColor: '#000000',
        borderWidth: '3px',
      },
    };
  }

  public saveSettings(): void {
    try {
      localStorage.setItem('jira-helper-settings', JSON.stringify(this.settings));
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[Jira Helper] Ошибка сохранения настроек:', error);
    }
  }
}

export const settingsManager = SettingsManager.getInstance();
