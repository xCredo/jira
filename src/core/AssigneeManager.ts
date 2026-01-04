// src/core/AssigneeManager.ts
import { settingsManager } from './SettingsManager';

export interface Assignee {
  id: string;
  name: string;
  displayName: string;
  color: string;
  avatarUrl?: string;
}

let counter = 0;

export class AssigneeManager {
  private static instance: AssigneeManager;

  private readonly colorPalette = [
    '#FF0000', // Красный
    '#FF7F00', // Оранжевый
    '#FFFF00', // Жёлтый
    '#00FF00', // Зелёный
    '#0000FF', // Синий
    '#4B0082', // Индиго
    '#8B00FF', // Фиолетовый
    '#000000', // Чёрный
  ];

  private constructor() {}

  static getInstance(): AssigneeManager {
    if (!AssigneeManager.instance) {
      AssigneeManager.instance = new AssigneeManager();
    }
    return AssigneeManager.instance;
  }

  getAllAssigneesFromCards(): Assignee[] {
    const cards = this.getAllCards();
    const assigneesMap = new Map<string, Omit<Assignee, 'color'>>();
    
    cards.forEach(card => {
        const assigneeData = this.getAssigneeFromCard(card);
        if (assigneeData && !assigneesMap.has(assigneeData.id)) {
        assigneesMap.set(assigneeData.id, assigneeData); // Теперь правильно
        }
    });
    
    // Преобразуем в полные Assignee с цветами
    const assignees = Array.from(assigneesMap.values()).map(data => ({
        ...data,
        color: '' // Временный цвет, будет назначен в assignColorsToAssignees
    }));
    
    // Назначаем цвета
    this.assignColorsToAssignees(assignees);
    
    return assignees;
}


  private cache = new Map()

    
  // Получить исполнителя для конкретной карточки
  getAssigneeForCard(card: HTMLElement): Assignee | null {
    
    const assigneeData = this.getAssigneeFromCard(card);
    if (!assigneeData) return null;
    
    // Получаем всех исполнителей чтобы найти цвет
    const allAssignees = this.getAllAssigneesFromCards();
    return allAssignees.find(a => a.id === assigneeData.id) || null;
  }

    // ПРОСТОЙ парсинг карточки (без ожиданий, без сложной логики)
    private getAssigneeFromCard(card: HTMLElement): Omit<Assignee, 'color'> | null {

    try {
        // СПОСОБ 1: Ищем скрытый текст с именем исполнителя
        const hiddenElements = card.querySelectorAll('[hidden], [aria-hidden="true"]');

        

        for (const element of hiddenElements) {
        const text = element.textContent?.trim();
        if (!text) continue;

        if (text.startsWith('Исполнитель:')) {
            const name = text.replace('Исполнитель:', '').trim();
            if (!name) return null;
            
            // Генерируем ID
            const id = this.generateAssigneeId(element, name);
            
            // Находим аватар
            const avatarUrl = this.getAvatarUrlForCard(card);
            
            return {
            id,
            name,
            displayName: this.getDisplayName(name),
            avatarUrl
            };
        }
        
        // "Не назначено"
        if (text === 'Не назначено') {
            // Для "Не назначено" аватара нет
            return {
            id: 'unassigned',
            name: 'Не назначено',
            displayName: 'Н/Н',
            avatarUrl: undefined
            };
        }
        }
        
        // СПОСОБ 2: Ищем по data-testid (резервный вариант)
        const assigneeContainers = card.querySelectorAll(
        '[data-testid*="assignee"], [data-testid*="avatar"]'
        );
        
        for (const container of assigneeContainers) {
        const hiddenText = container.querySelector('[hidden], [aria-hidden="true"]');
        const text = hiddenText?.textContent?.trim();
        
        if (text?.startsWith('Исполнитель:')) {
            const name = text.replace('Исполнитель:', '').trim();
            
            // Находим аватар
            const avatarUrl = this.getAvatarUrlForCard(card);
            
            return {
            id: `container:${this.hashString(name)}`,
            name,
            displayName: this.getDisplayName(name),
            avatarUrl // ← ДОБАВЛЕНО
            };
        }
        
        if (text === 'Не назначено') {
            return {
            id: 'unassigned',
            name: 'Не назначено',
            displayName: 'Н/Н',
            avatarUrl: undefined // ← Явно указываем undefined
            };
        }
        }
        
        // Не нашли исполнителя (карточка может не иметь этого поля)
        return null;
        
    } catch (error) {
        // БЕЗ ЛОГОВ при ошибке
        return null;
    }
    }

    
    // Добавляем метод поиска аватарки (в том же классе)
    private getAvatarUrlForCard(card: HTMLElement): string | undefined {
      const log = (...args: any[]) => counter++ < 10 ? console.log(...args) : () => {}
      try {

        log(card);
        // ПРЯМОЙ СЕЛЕКТОР для аватара Jira
        const avatarImg = card.querySelector<HTMLImageElement>(
        '[data-testid="software-board.common.fields.assignee-field-static.avatar-wrapper"] img'
        );
        log("🚀 ~ AssigneeManager ~ getAvatarUrlForCard ~ avatarImg:", avatarImg)
        
        // Если не нашли точный селектор, пробуем другие варианты
        if (!avatarImg) {
          // Gravatar
          const gravatarImg = card.querySelector<HTMLImageElement>('img[src*="gravatar.com"]');
          log("🚀 ~ AssigneeManager ~ getAvatarUrlForCard ~ gravatarImg:", gravatarImg)
          if (gravatarImg?.src)  {
            return gravatarImg.src;
          }
        
          // Любой аватар
          const anyAvatar = card.querySelector<HTMLImageElement>('img[src*="avatar"]');
          log("🚀 ~ AssigneeManager ~ getAvatarUrlForCard ~ anyAvatar:", anyAvatar)
          if (anyAvatar?.src) {
            return anyAvatar.src;
          }
        }

        return avatarImg?.src;
      } catch (error) {
          return undefined;
      }
    }

    // Генерация ID на основе аватара или имени
    private generateAssigneeId(element: Element, name: string): string {
    // Пробуем найти аватар
    const avatarImg = element.closest('div')?.querySelector<HTMLImageElement>('img');
    
    if (avatarImg?.src) {
        // Jira Cloud ID: /557058:4350d7b2-81dc-480b-a6a9-183db20be59c/
        const jiraMatch = avatarImg.src.match(/\/(\d+:[a-f0-9-]{36})\//);
        if (jiraMatch) return jiraMatch[1];
        
        // Gravatar ID
        const gravatarMatch = avatarImg.src.match(/avatar\/([a-f0-9]+)/);
        if (gravatarMatch) return `gravatar:${gravatarMatch[1]}`;
    }
    
    // Fallback: хеш имени
    return `name:${this.hashString(name)}`;
    }

  // Назначение цветов исполнителям
  private assignColorsToAssignees(assignees: Assignee[]): void {
    const settings = settingsManager.getSettings();
    
    assignees.forEach((assignee, index) => {
      // Проверяем кастомные цвета из настроек
      if (settings.assigneeHighlight.customColors[assignee.id]) {
        assignee.color = settings.assigneeHighlight.customColors[assignee.id];
      } 
      // "Не назначено" - чёрный с прозрачностью по умолчанию
      else if (assignee.id === 'unassigned') {
        assignee.color = 'rgba(0, 0, 0, 0.5)'; // Чёрный 50%
      }
      // Автоматические цвета из палитры
      else {
        assignee.color = this.colorPalette[index % this.colorPalette.length];
      }
    });
  }

  // Утилиты
  private getAllCards(): HTMLElement[] {
    return Array.from(document.querySelectorAll<HTMLElement>(
      '[data-testid="platform-board-kit.ui.card.card"]'
    ));
  }

  private getDisplayName(fullName: string): string {
    return fullName
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .join('')
      .substring(0, 3);
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(16);
  }
}

export const assigneeManager = AssigneeManager.getInstance();

if (typeof window !== 'undefined') {
  (window as any).JiraHelper = (window as any).JiraHelper || {};
  (window as any).JiraHelper.AssigneeManager = assigneeManager;
}