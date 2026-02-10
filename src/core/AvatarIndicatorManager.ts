export interface AvatarIndicator {
  userId: string;
  type: 'wip-overload' | 'group-wip-overload' | 'column-limit' | 'custom';
  color: string;
  tooltip?: string;
  icon?: string;
  position?: 'left' | 'right' | 'top' | 'bottom';
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
    
    // Удаляем старый индикатор того же типа если есть
    const filtered = userIndicators.filter(i => i.type !== indicator.type);
    filtered.push(indicator);
    
    this.indicators.set(userId, filtered);
    
    // НЕМЕДЛЕННО применяем к аватарам
    this.applyIndicatorToUserAvatars(userId, indicator);
  }

  // Удалить индикатор по типу
  removeIndicator(userId: string, type: string) {
    console.log('[AvatarIndicatorManager] removeIndicator для', userId, type);
    
    const userIndicators = this.indicators.get(userId);
    if (userIndicators) {
      const filtered = userIndicators.filter(i => i.type !== type);
      this.indicators.set(userId, filtered);
      
      // Удаляем с аватаров
      this.removeIndicatorFromUserAvatars(userId, type);
      
      // Если остались другие индикаторы - перерисовываем их
      if (filtered.length > 0) {
        filtered.forEach(indicator => {
          this.applyIndicatorToUserAvatars(userId, indicator);
        });
      }
    }
  }

  // Удалить все индикаторы определённого типа
  removeIndicatorsByType(type: string) {
    console.log('[AvatarIndicatorManager] removeIndicatorsByType:', type);
    
    this.indicators.forEach((indicators, userId) => {
      const filtered = indicators.filter(i => i.type !== type);
      this.indicators.set(userId, filtered);
      
      // Удаляем с аватаров
      this.removeIndicatorFromUserAvatars(userId, type);
      
      // Перерисовываем остальные индикаторы
      if (filtered.length > 0) {
        filtered.forEach(indicator => {
          this.applyIndicatorToUserAvatars(userId, indicator);
        });
      }
    });
  }

  // Применить индикатор к аватарам пользователя
  private applyIndicatorToUserAvatars(userId: string, indicator: AvatarIndicator) {
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
      // Найти контейнер именно этого типа
      const containers = avatar.querySelectorAll('.jh-avatar-indicator-container');
      containers.forEach(container => {
        const icon = container.querySelector(`.jh-avatar-indicator-${type}`);
        if (icon) {
          container.remove();
        }
      });
    });
  }

  // Найти аватары пользователя
  private findUserAvatars(userId: string): HTMLElement[] {
    console.log(`[AvatarIndicatorManager] Поиск аватаров для userId: ${userId}`);
    
    const avatars: HTMLElement[] = [];
    
    // 1. Получить имя пользователя из assigneeManager
    let userName = '';
    try {
      const assigneeManager = (window as any).JiraHelper?.assigneeManager;
      if (assigneeManager) {
        const allUsers = assigneeManager.getAllAssigneesFromCards();
        const user = allUsers.find(u => u.id === userId);
        if (user) {
          userName = user.name || user.displayName;
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
      
      // Ищем по alt тексту изображения
      const img = avatar.querySelector('img');
      if (img && img.alt && img.alt.includes(userName)) {
        if (!avatars.includes(avatar as HTMLElement)) {
          avatars.push(avatar as HTMLElement);
        }
      }
    });
    
    console.log(`[AvatarIndicatorManager] Найдено аватаров для ${userName}:`, avatars.length);
    return avatars;
  }

  // Применить индикатор к конкретному аватару (ОБНОВЛЁННЫЙ МЕТОД)
  private applyIndicatorToAvatar(avatar: HTMLElement, indicator: AvatarIndicator) {
    const avatarInner = avatar.querySelector('[data-testid*="ak-avatar--inner"]');
    if (!avatarInner) {
      console.warn('[AvatarIndicatorManager] Не найден avatar-inner элемент');
      return;
    }
    
    // Очистить старые индикаторы этого типа
    const oldContainers = avatarInner.querySelectorAll('.jh-avatar-indicator-container');
    oldContainers.forEach(container => {
      const icon = container.querySelector(`.jh-avatar-indicator-${indicator.type}`);
      if (icon) {
        container.remove();
      }
    });
    
    // Создать контейнер
    const container = document.createElement('div');
    container.className = 'jh-avatar-indicator-container';
    
    // Позиционирование в зависимости от типа
    let top = '-4px';
    let left = 'auto';
    let right = 'auto';
    
    switch (indicator.position) {
      case 'left':
        top = '-4px';
        left = '-4px';
        right = 'auto';
        break;
      case 'top':
        top = '-6px';
        left = '50%';
        right = 'auto';
        break;
      case 'bottom':
        top = 'auto';
        bottom = '-6px';
        left = '50%';
        right = 'auto';
        break;
      case 'right':
      default:
        top = '-4px';
        left = 'auto';
        right = '-4px';
        break;
    }
    
    container.style.cssText = `
      position: absolute !important;
      top: ${top} !important;
      ${left !== 'auto' ? `left: ${left} !important;` : ''}
      ${right !== 'auto' ? `right: ${right} !important;` : ''}
      z-index: 999999 !important;
      pointer-events: none !important;
    `;
    
    // Создать индикатор
    const icon = document.createElement('div');
    icon.className = `jh-avatar-indicator jh-avatar-indicator-${indicator.type}`;
    icon.title = indicator.tooltip || 'Превышен лимит';
    icon.innerHTML = indicator.icon || '⚠️';
    icon.style.cssText = `
      width: 14px !important;
      height: 14px !important;
      border-radius: 50% !important;
      background-color: ${indicator.type === 'group-wip-overload' ? indicator.color : 'transparent'} !important;
      border: ${indicator.type === 'group-wip-overload' ? '1px solid white' : 'none'} !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      font-size: ${indicator.type === 'group-wip-overload' ? '8px' : '10px'} !important;
      color: ${indicator.type === 'group-wip-overload' ? 'white' : indicator.color} !important;
      font-weight: bold !important;
      box-shadow: 0 0 6px ${indicator.color} !important;
      transform: ${indicator.position === 'left' ? 'translateX(-50%)' : 
                  indicator.position === 'right' ? 'translateX(50%)' : 'translateX(-50%)'} !important;
    `;
    
    container.appendChild(icon);
    
    // Добавить к аватару
    (avatarInner as HTMLElement).style.position = 'relative';
    (avatarInner as HTMLElement).appendChild(container);
    
    console.log('[AvatarIndicatorManager] Индикатор добавлен на аватар, position:', indicator.position);
  }

  // Обновить все аватары
  updateAll() {
    console.log('[AvatarIndicatorManager] updateAll вызван');
    this.indicators.forEach((indicators, userId) => {
      indicators.forEach(indicator => {
        this.applyIndicatorToUserAvatars(userId, indicator);
      });
    });
  }

  // Получить все индикаторы пользователя
  getIndicatorsForUser(userId: string): AvatarIndicator[] {
    return this.indicators.get(userId) || [];
  }

  // Проверить есть ли индикатор у пользователя
  hasIndicator(userId: string, type: string): boolean {
    const indicators = this.indicators.get(userId);
    return indicators ? indicators.some(i => i.type === type) : false;
  }
}

export const avatarIndicatorManager = AvatarIndicatorManager.getInstance();

// Глобальный экспорт
if (typeof window !== 'undefined') {
  (window as any).JiraHelper = (window as any).JiraHelper || {};
  (window as any).JiraHelper.AvatarIndicatorManager = avatarIndicatorManager;
  console.log('[AvatarIndicatorManager] Экспортирован в window.JiraHelper');
}