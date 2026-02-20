// src/core/VisualizationManager.ts
import { settingsManager } from './SettingsManager';
import { assigneeManager, Assignee } from './AssigneeManager';

export class VisualizationManager {
  private static instance: VisualizationManager;

  private isEnabled = false;

  private observer: MutationObserver | null = null;

  private _paintTimeout: number | null = null;

  private lastUpdateTime = 0;
  private readonly UPDATE_INTERVAL = 500; // Не чаще раза в 500мс

  private constructor() {}

  static getInstance(): VisualizationManager {
    if (!VisualizationManager.instance) {
      VisualizationManager.instance = new VisualizationManager();
    }
    return VisualizationManager.instance;
  }

  // ГЛАВНЫЙ МЕТОД: Применить цвета исполнителей
  applyAssigneeColors(): void {
    if (!this.isEnabled) return;

    // Защита от слишком частых вызовов
    const now = Date.now();
    if (now - this.lastUpdateTime < this.UPDATE_INTERVAL) {
      return;
    }
    this.lastUpdateTime = now;

    const doPaint = () => {
      try {
        const cards = this.getAllCards();

        if (cards.length === 0) {
          if (this._paintTimeout) clearTimeout(this._paintTimeout);
          this._paintTimeout = setTimeout(doPaint, 300);
          return;
        }

        // Красим каждую карточку
        cards.forEach(card => {
          this.paintCardByAssignee(card);
        });
      } catch (error) {
        console.error('[Jira Helper] Ошибка покраски исполнителей:', error);
      }
    };

    setTimeout(doPaint, 100);
  }

  // Включить визуализацию
  enable(): void {
    if (this.isEnabled) return;

    console.log('[Jira Helper] Включение подсветки исполнителей');
    this.isEnabled = true;

    this.applyAssigneeColors();
    this.startObservation();

    setTimeout(() => {
      if (this.isEnabled) {
        this.applyAssigneeColors();
      }
    }, 500);
  }

  // Выключить визуализацию
  disable(): void {
    if (!this.isEnabled) return;

    console.log('[Jira Helper] Отключение подсветки исполнителей');
    this.isEnabled = false;

    if (this._paintTimeout) {
      clearTimeout(this._paintTimeout);
      this._paintTimeout = null;
    }

    this.removeAllVisualizations();
    this.stopObservation();
  }

  // Покрасить карточку по исполнителю
  private paintCardByAssignee(card: HTMLElement): void {
    // Если карточка имеет WIP-перегрузку — НЕ применяем обычную подсветку
    if (card.hasAttribute('data-jh-wip-overloaded') || card.classList.contains('jh-wip-overloaded')) {
      return;
    }

    // Сначала очищаем предыдущую визуализацию
    this.removeVisualization(card);

    const assignee = assigneeManager.getAssigneeForCard(card);
    if (!assignee) return;

    const settings = settingsManager.getSettings();
    const vizType = settings.assigneeHighlight.visualizationType;

    switch (vizType) {
      case 'stripe':
        this.applyStripe(card, assignee);
        break;
      case 'background':
        this.applyBackground(card, assignee);
        break;
      case 'border':
        this.applyBorder(card, assignee);
        break;
    }
  }

  updateAllVisualizations(): void {
    if (!this.isEnabled) return;
    this.applyAssigneeColors();
  }

  // Полоска слева
  private applyStripe(card: HTMLElement, assignee: Assignee): void {
    const stripe = document.createElement('div');
    stripe.className = 'jira-helper-assignee-stripe';
    stripe.dataset.assigneeId = assignee.id;

    Object.assign(stripe.style, {
      position: 'absolute',
      left: '0',
      top: '0',
      width: '6px',
      height: '100%',
      backgroundColor: assignee.color,
      zIndex: '100',
      pointerEvents: 'none',
    });

    this.attachToCard(card, stripe);
  }

  private applyBackground(card: HTMLElement, assignee: Assignee): void {
    const innerCard = this.getInnerCard(card);
    const backgroundColor = this.addAlpha(assignee.color, 0.4);
    innerCard.style.backgroundColor = backgroundColor;
    innerCard.dataset.assigneeHighlight = 'true';
  }

  private applyBorder(card: HTMLElement, assignee: Assignee): void {
    const innerCard = this.getInnerCard(card);
    innerCard.style.border = `2px solid ${assignee.color}`;
    innerCard.style.borderRadius = '4px';
    innerCard.dataset.assigneeHighlight = 'true';
  }

  // Начать наблюдение за DOM
  private startObservation(): void {
    if (this.observer) return;

    this.observer = new MutationObserver(() => {
      if (!this.isEnabled) return;

      if (this._paintTimeout) clearTimeout(this._paintTimeout);
      this._paintTimeout = setTimeout(() => {
        this.updateAllVisualizations();
      }, 300); // Увеличен debounce
    });

    const board = document.querySelector('[data-testid="software-board.board"]') || document.body;
    this.observer.observe(board, {
      childList: true,
      subtree: true,
      attributes: false, // Не следим за атрибутами — меньше спама
    });
  }

  private stopObservation(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }

  // Утилиты
  private getAllCards(): HTMLElement[] {
    return Array.from(document.querySelectorAll<HTMLElement>('[data-testid="platform-board-kit.ui.card.card"]'));
  }

  private getInnerCard(card: HTMLElement): HTMLElement {
    return (
      card.querySelector<HTMLElement>('[data-testid="software-context-menu.ui.context-menu.children-wrapper"] > div') ||
      card
    );
  }

  private attachToCard(card: HTMLElement, element: HTMLElement): void {
    const innerCard = this.getInnerCard(card);

    if (getComputedStyle(innerCard).position === 'static') {
      innerCard.style.position = 'relative';
    }

    innerCard.appendChild(element);
  }

  private addAlpha(color: string, alpha: number): string {
    if (color.startsWith('rgba')) {
      return color.replace(/[\d.]+\)$/g, `${alpha})`);
    }

    if (color.startsWith('#')) {
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    return color;
  }

  private removeVisualization(card: HTMLElement): void {
    // Не очищаем карточки с WIP-перегрузкой
    if (card.hasAttribute('data-jh-wip-overloaded') || card.classList.contains('jh-wip-overloaded')) {
      return;
    }

    const stripe = card.querySelector('.jira-helper-assignee-stripe');
    if (stripe) stripe.remove();

    const innerCard = this.getInnerCard(card);
    if (!innerCard) return;

    if (!card.style.backgroundColor.includes('rgba(')) {
      innerCard.style.backgroundColor = '';
      innerCard.style.border = '';
      innerCard.style.borderRadius = '';
    }

    delete innerCard.dataset.assigneeHighlight;
  }

  private removeAllVisualizations(): void {
    const cards = this.getAllCards();
    cards.forEach(card => {
      if (!card.hasAttribute('data-jh-wip-overloaded') && !card.classList.contains('jh-wip-overloaded')) {
        this.removeVisualization(card);
      }
    });
  }

  isEnabledStatus(): boolean {
    return this.isEnabled;
  }

  updateVisualization(): void {
    if (!this.isEnabled) return;
    this.applyAssigneeColors();
  }
}

export const visualizationManager = VisualizationManager.getInstance();