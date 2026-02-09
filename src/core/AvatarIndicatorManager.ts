// src/core/AvatarIndicatorManager.ts

export interface AvatarIndicator {
  userId: string;
  type: 'wip-overload' | 'column-limit' | 'custom';
  color: string;
  tooltip?: string;
  icon?: string;
}

export class AvatarIndicatorManager {
  private static instance: AvatarIndicatorManager;
  private indicators = new Map<string, AvatarIndicator[]>();
  
  static getInstance(): AvatarIndicatorManager {
    if (!AvatarIndicatorManager.instance) {
      AvatarIndicatorManager.instance = new AvatarIndicatorManager();
    }
    return AvatarIndicatorManager.instance;
  }

  // Добавить индикатор для пользователя
  addIndicator(userId: string, indicator: AvatarIndicator) {
    console.log('[AvatarIndicatorManager] addIndicator для', userId, indicator);
    
    // Сохраняем индикатор
    const userIndicators = this.indicators.get(userId) || [];
    if (!userIndicators.some(i => i.type === indicator.type)) {
      userIndicators.push(indicator);
      this.indicators.set(userId, userIndicators);
    }
    
    // НЕМЕДЛЕННО применяем к аватарам
    this.applyIndicatorToUserAvatars(userId, indicator);
  }

  // Удалить индикатор
  removeIndicator(userId: string, type: string) {
    console.log('[AvatarIndicatorManager] removeIndicator для', userId, type);
    
    const userIndicators = this.indicators.get(userId);
    if (userIndicators) {
      const filtered = userIndicators.filter(i => i.type !== type);
      this.indicators.set(userId, filtered);
      
      // Удаляем с аватаров
      this.removeIndicatorFromUserAvatars(userId, type);
    }
  }

  // Применить индикатор к аватарам пользователя
  private applyIndicatorToUserAvatars(userId: string, indicator: AvatarIndicator) {
    // Найти аватары пользователя (упрощенный поиск по имени)
    const avatars = this.findUserAvatars(userId);
    console.log(`[AvatarIndicatorManager] Найдено аватаров для ${userId}:`, avatars.length);
    
    avatars.forEach(avatar => {
      this.applyIndicatorToAvatar(avatar, indicator);
    });
  }

  // Удалить индикатор с аватаров пользователя
  private removeIndicatorFromUserAvatars(userId: string, type: string) {
    const avatars = this.findUserAvatars(userId);
    
    avatars.forEach(avatar => {
      const container = avatar.querySelector('.jh-avatar-indicator-container');
      if (container) {
        container.remove();
      }
    });
  }

    // Найти аватары пользователя
    private findUserAvatars(userId: string): HTMLElement[] {
    console.log(`[AvatarIndicatorManager] Поиск аватаров для userId: ${userId}`);
    
    const avatars: HTMLElement[] = [];
    
    // 1. Получить имя пользователя из assigneeManager
    let userName = '';
    try {
        // Получаем всех пользователей и ищем по userId
        const assigneeManager = (window as any).JiraHelper?.assigneeManager;
        if (assigneeManager) {
        const allUsers = assigneeManager.getAllAssigneesFromCards();
        const user = allUsers.find(u => u.id === userId);
        if (user) {
            userName = user.name; // или user.displayName
            console.log(`[AvatarIndicatorManager] Найден пользователь: ${userName} (${userId})`);
        }
        }
    } catch (error) {
        console.error('[AvatarIndicatorManager] Ошибка получения имени пользователя:', error);
    }
    
    if (!userName) {
        console.log(`[AvatarIndicatorManager] Не удалось найти имя для userId: ${userId}`);
        return avatars;
    }
    
    // 2. Ищем все аватары на странице
    const allAvatars = document.querySelectorAll('[data-testid*="ak-avatar"]');
    
    allAvatars.forEach(avatar => {
        // Ищем по hidden label
        const label = avatar.querySelector('[data-testid*="ak-avatar--label"]');
        if (label && label.textContent === userName) {
        avatars.push(avatar as HTMLElement);
        }
        
        // Дополнительно: ищем по alt тексту изображения
        const img = avatar.querySelector('img');
        if (img && img.alt && img.alt.includes(userName)) {
        avatars.push(avatar as HTMLElement);
        }
    });
    
    console.log(`[AvatarIndicatorManager] Найдено аватаров для ${userName}:`, avatars.length);
    return avatars;
    }

  // Применить индикатор к конкретному аватару
  private applyIndicatorToAvatar(avatar: HTMLElement, indicator: AvatarIndicator) {
    // Найти inner элемент
    const avatarInner = avatar.querySelector('[data-testid*="ak-avatar--inner"]');
    if (!avatarInner) {
      console.warn('[AvatarIndicatorManager] Не найден avatar-inner элемент');
      return;
    }
    
    // Очистить старые индикаторы этого типа
    const oldContainer = avatarInner.querySelector('.jh-avatar-indicator-container');
    if (oldContainer) {
      oldContainer.remove();
    }
    
    // Создать контейнер
    const container = document.createElement('div');
    container.className = 'jh-avatar-indicator-container';
    container.style.cssText = `
      position: absolute !important;
      top: -4px !important;
      right: -4px !important;
      z-index: 999999 !important;
      pointer-events: none !important;
    `;
    
    // Создать индикатор
    const icon = document.createElement('div');
    icon.className = `jh-avatar-indicator jh-avatar-indicator-${indicator.type}`;
    icon.title = indicator.tooltip || 'Превышен лимит';
    icon.innerHTML = '⚠️';
    icon.style.cssText = `
      width: 14px !important;
      height: 14px !important;
      border-radius: 50% !important;
      background-color: transparent !important;
      border: none !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      font-size: 10px !important;
      color: ${indicator.color} !important;
      font-weight: bold !important;
      box-shadow: 0 0 6px ${indicator.color} !important;
    `;
    
    container.appendChild(icon);
    
    // Добавить к аватару
    (avatarInner as HTMLElement).style.position = 'relative';
    (avatarInner as HTMLElement).appendChild(container);
    
    console.log('[AvatarIndicatorManager] Индикатор добавлен на аватар');
  }

  // Обновить все аватары (публичный метод)
  updateAll() {
    console.log('[AvatarIndicatorManager] updateAll вызван');
    this.indicators.forEach((indicators, userId) => {
      indicators.forEach(indicator => {
        this.applyIndicatorToUserAvatars(userId, indicator);
      });
    });
  }
}

export const avatarIndicatorManager = AvatarIndicatorManager.getInstance();

// Глобальный экспорт
if (typeof window !== 'undefined') {
  (window as any).JiraHelper = (window as any).JiraHelper || {};
  (window as any).JiraHelper.AvatarIndicatorManager = avatarIndicatorManager;
  console.log('[AvatarIndicatorManager] Экспортирован в window.JiraHelper');
}