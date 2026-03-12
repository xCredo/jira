// src/cloud/shared/SettingsService.ts
// Сервис настроек для Jira Cloud

export interface AssigneeHighlightSettings {
  enabled: boolean;
  visualizationType: 'stripe' | 'background' | 'border';
  autoColors: boolean;
  customColors: Record<string, string>;
  customBackgroundColors: Record<string, string>;
  highlightUnassigned: boolean;
  unassignedColor: string;
  unassignedBackgroundColor: string;
}

export interface ColumnColorsSettings {
  enabled: boolean;
}

export interface WipLimitSettings {
  enabled: boolean;
  limits: Array<{
    id: string;
    userId: string;
    userName: string;
    columnIds: string[];
    columnNames: string[];
    limit: number;
    color: string; 
  }>;
}

export interface ColumnGroupWipLimitSettings {
  enabled: boolean;
  limits: Array<{
    id: string;
    name: string;
    columnIds: string[];
    columnNames: string[];
    limit: number;
    baseColor: string;
    warningColor?: string;
  }>;
}

export interface Settings {
  columnColors: ColumnColorsSettings;
  assigneeHighlight: AssigneeHighlightSettings;
  assigneeOverload: {
    enabled: boolean;
    threshold: number;
    borderColor: string;
    borderWidth: string;
  };
  personalWipLimits: WipLimitSettings;
  columnGroupWipLimits: ColumnGroupWipLimitSettings;
}

export class SettingsService {
  private static instance: SettingsService;
  private settings: Settings;

  constructor() {
    this.settings = this.loadSettings();
  }

  static getInstance(): SettingsService {
    if (!SettingsService.instance) {
      SettingsService.instance = new SettingsService();
    }
    return SettingsService.instance;
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
      personalWipLimits: {
        ...this.settings.personalWipLimits,
        ...updates.personalWipLimits,
      },
      columnGroupWipLimits: {
        ...this.settings.columnGroupWipLimits,
        ...updates.columnGroupWipLimits,
      },
    };

    this.saveSettings();
  }

  setColumnColorsEnabled(enabled: boolean): void {
    this.settings.columnColors.enabled = enabled;
    this.saveSettings();
  }

  setAssigneeColor(assigneeId: string, color: string): void {
    if (!this.settings.assigneeHighlight) {
      this.settings.assigneeHighlight = {
        enabled: false,
        visualizationType: 'stripe',
        autoColors: true,
        customColors: {},
        customBackgroundColors: {},
        highlightUnassigned: true,
        unassignedColor: 'rgba(0, 0, 0, 0.5)',
        unassignedBackgroundColor: 'rgba(0, 0, 0, 0.1)',
      };
    }
    this.settings.assigneeHighlight.customColors[assigneeId] = color;
    this.saveSettings();
  }

  setWipLimitColor(limitId: string, color: string): void {
    if (this.settings.personalWipLimits?.limits) {
      const index = this.settings.personalWipLimits.limits.findIndex(l => l.id === limitId);
      if (index !== -1) {
        this.settings.personalWipLimits.limits[index].color = color;
        this.saveSettings();
      }
    }
  }

  private loadSettings(): Settings {
    try {
      const saved = localStorage.getItem('jira-helper-settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          columnColors: parsed.columnColors || { enabled: false },
          assigneeHighlight: {
            enabled: parsed.assigneeHighlight?.enabled || false,
            visualizationType: parsed.assigneeHighlight?.visualizationType || 'stripe',
            autoColors: parsed.assigneeHighlight?.autoColors !== false,
            customColors: parsed.assigneeHighlight?.customColors || {},
            customBackgroundColors: parsed.assigneeHighlight?.customBackgroundColors || {},
            highlightUnassigned: parsed.assigneeHighlight?.highlightUnassigned !== false,
            unassignedColor: parsed.assigneeHighlight?.unassignedColor || 'rgba(0, 0, 0, 0.5)',
            unassignedBackgroundColor: parsed.assigneeHighlight?.unassignedBackgroundColor || 'rgba(0, 0, 0, 0.1)',
          },
          assigneeOverload: parsed.assigneeOverload || {
            enabled: true,
            threshold: 2,
            borderColor: '#000000',
            borderWidth: '3px',
          },
          personalWipLimits: parsed.personalWipLimits || {
            enabled: false,
            limits: [],
          },
          columnGroupWipLimits: parsed.columnGroupWipLimits || {
            enabled: false,
            limits: [],
          },
        };
      }
    } catch (error) {
      console.error('[SettingsService] Ошибка загрузки настроек:', error);
    }

    return this.getDefaultSettings();
  }

  private getDefaultSettings(): Settings {
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
        enabled: true,
        threshold: 2,
        borderColor: '#000000',
        borderWidth: '3px',
      },
      personalWipLimits: {
        enabled: false,
        limits: [],
      },
      columnGroupWipLimits: {
        enabled: false,
        limits: [],
      },
    };
  }

  public saveSettings(): void {
    try {
      localStorage.setItem('jira-helper-settings', JSON.stringify(this.settings));
    } catch (error) {
      console.error('[SettingsService] Ошибка сохранения настроек:', error);
    }
  }
}

export const settingsService = SettingsService.getInstance();

// Глобальный экспорт для обратной совместимости
if (typeof window !== 'undefined') {
  (window as any).JiraHelper = (window as any).JiraHelper || {};
  (window as any).JiraHelper.settingsManager = settingsService;
}
