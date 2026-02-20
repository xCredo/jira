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

  addIndicator(userId: string, indicator: AvatarIndicator) {
    const userIndicators = this.indicators.get(userId) || [];
    const filtered = userIndicators.filter(i => i.type !== indicator.type);
    filtered.push(indicator);
    this.indicators.set(userId, filtered);
    this.refreshUserAvatar(userId);
  }

  removeIndicator(userId: string, type: string) {
    const userIndicators = this.indicators.get(userId);
    if (userIndicators) {
      const filtered = userIndicators.filter(i => i.type !== type);
      this.indicators.set(userId, filtered);
      this.refreshUserAvatar(userId);
    }
  }

  removeIndicatorsByType(type: string) {
    const affectedUsers: string[] = [];
    this.indicators.forEach((indicators, userId) => {
      const filtered = indicators.filter(i => i.type !== type);
      if (filtered.length !== indicators.length) {
        this.indicators.set(userId, filtered);
        affectedUsers.push(userId);
      }
    });
    affectedUsers.forEach(userId => this.refreshUserAvatar(userId));
  }

  private refreshUserAvatar(userId: string) {
    const indicators = this.indicators.get(userId) || [];
    
    // Приоритет: Personal > Group > другие
    let indicatorToShow: AvatarIndicator | null = null;
    
    // Personal WIP (самый высокий приоритет)
    const personalWip = indicators.find(i => i.type === 'wip-overload');
    if (personalWip) {
      indicatorToShow = personalWip;
    } else {
      const groupWip = indicators.find(i => i.type === 'group-wip-overload');
      if (groupWip) {
        indicatorToShow = groupWip;
      }
    }

    // Очищаем все индикаторы с аватаров пользователя
    this.clearUserAvatars(userId);

    // Если есть что показывать — показываем один
    if (indicatorToShow) {
      this.applyIndicatorToUserAvatars(userId, indicatorToShow);
    }
  }

  private clearUserAvatars(userId: string) {
    const avatars = this.findUserAvatars(userId);
    avatars.forEach(avatar => {
      const containers = avatar.querySelectorAll('.jh-avatar-indicator-container');
      containers.forEach(container => container.remove());
    });
  }

  private applyIndicatorToUserAvatars(userId: string, indicator: AvatarIndicator) {
    const avatars = this.findUserAvatars(userId);
    avatars.forEach(avatar => {
      this.applyIndicatorToAvatar(avatar, indicator);
    });
  }

  private findUserAvatars(userId: string): HTMLElement[] {
    const avatars: HTMLElement[] = [];
    
    let userName = '';
    try {
      const assigneeManager = (window as any).JiraHelper?.assigneeManager;
      if (assigneeManager) {
        const allUsers = assigneeManager.getAllAssigneesFromCards();
        const user = allUsers.find(u => u.id === userId);
        if (user) {
          userName = user.name || user.displayName;
        }
      }
    } catch (error) {}
    
    if (!userName) return avatars;
    
    const allAvatars = document.querySelectorAll('[data-testid*="ak-avatar"]');
    allAvatars.forEach(avatar => {
      const label = avatar.querySelector('[data-testid*="ak-avatar--label"]');
      if (label && label.textContent === userName) {
        avatars.push(avatar as HTMLElement);
      }
      const img = avatar.querySelector('img');
      if (img && img.alt && img.alt.includes(userName)) {
        if (!avatars.includes(avatar as HTMLElement)) {
          avatars.push(avatar as HTMLElement);
        }
      }
    });
    
    return avatars;
  }

  private applyIndicatorToAvatar(avatar: HTMLElement, indicator: AvatarIndicator) {
    const avatarInner = avatar.querySelector('[data-testid*="ak-avatar--inner"]');
    if (!avatarInner) return;
    
    const container = document.createElement('div');
    container.className = 'jh-avatar-indicator-container';
    
    let top = '-4px';
    let left = 'auto';
    let right = 'auto';
    
    switch (indicator.position) {
      case 'left':
        top = '-4px';
        left = '-4px';
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
    
    const icon = document.createElement('div');
    icon.className = `jh-avatar-indicator jh-avatar-indicator-${indicator.type}`;
    icon.title = indicator.tooltip || '⚠️';
    icon.innerHTML = indicator.icon || '⚠️';
    icon.style.cssText = `
      width: 14px !important;
      height: 14px !important;
      border-radius: 50% !important;
      background-color: ${indicator.color} !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      font-size: 10px !important;
      color: white !important;
      font-weight: bold !important;
      box-shadow: 0 0 6px ${indicator.color} !important;
    `;
    
    container.appendChild(icon);
    
    (avatarInner as HTMLElement).style.position = 'relative';
    (avatarInner as HTMLElement).appendChild(container);
  }

  updateAll() {
    this.indicators.forEach((_, userId) => {
      this.refreshUserAvatar(userId);
    });
  }

  hasIndicator(userId: string, type: string): boolean {
    const indicators = this.indicators.get(userId);
    return indicators ? indicators.some(i => i.type === type) : false;
  }
}

export const avatarIndicatorManager = AvatarIndicatorManager.getInstance();

if (typeof window !== 'undefined') {
  (window as any).JiraHelper = (window as any).JiraHelper || {};
  (window as any).JiraHelper.AvatarIndicatorManager = avatarIndicatorManager;
}