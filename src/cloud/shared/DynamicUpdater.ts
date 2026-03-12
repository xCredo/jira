// src/cloud/shared/DynamicUpdater.ts
// Динамический обновлятель для отслеживания изменений на доске

export class DynamicUpdater {
  private static instance: DynamicUpdater;
  private observer: MutationObserver | null = null;
  private boardContainer: HTMLElement | null = null;
  private updateTimeout: NodeJS.Timeout | null = null;
  private readonly DEBOUNCE_TIME = 500;
  private isUpdating = false;

  static getInstance(): DynamicUpdater {
    if (!DynamicUpdater.instance) {
      DynamicUpdater.instance = new DynamicUpdater();
    }
    return DynamicUpdater.instance;
  }

  start() {
    this.findBoardContainerAndObserve();
    console.log('[DynamicUpdater] Запущен, ожидание контейнера доски...');
  }

  private findBoardContainerAndObserve() {
    const boardSelectors = [
      '[data-testid="board-view"]',
      '[data-testid="software-board.board"]',
      '.ghx-columns',
      '#ghx-pool',
      '#ghx-board-column'
    ];

    const findBoard = () => {
      for (const selector of boardSelectors) {
        const element = document.querySelector(selector);
        if (element) return element as HTMLElement;
      }
      return null;
    };

    this.boardContainer = findBoard();

    if (this.boardContainer) {
      this.setupMutationObserver();
      console.log('[DynamicUpdater] Контейнер доски найден, наблюдаем за изменениями');
    } else {
      setTimeout(() => this.findBoardContainerAndObserve(), 1000);
    }
  }

  private setupMutationObserver() {
    if (!this.boardContainer) return;

    this.observer = new MutationObserver((mutations) => {
      if (this.isUpdating) return;

      const relevantMutation = mutations.some(m => {
        if (m.type === 'childList') {
          for (const node of Array.from(m.addedNodes)) {
            if (this.isCardElement(node as Element) || this.isCardContainer(node as Element)) {
              return true;
            }
          }
          for (const node of Array.from(m.removedNodes)) {
            if (this.isCardElement(node as Element) || this.isCardContainer(node as Element)) {
              return true;
            }
          }
        }
        
        if (m.type === 'attributes') {
          const target = m.target as Element;
          if (this.isCardElement(target) || this.isColumnElement(target)) {
            return true;
          }
        }
        
        return false;
      });

      if (relevantMutation) {
        this.debouncedUpdate();
      }
    });

    this.observer.observe(this.boardContainer, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'data-testid']
    });
  }

  private isCardElement(element: Element | null): boolean {
    if (!element || !element.matches) return false;
    return element.matches('[data-testid*="card"], [id*="card-"], [data-testid*="issue"]');
  }

  private isCardContainer(element: Element | null): boolean {
    if (!element || !element.matches) return false;
    return element.matches('[data-testid*="column"] [data-testid*="list"], [class*="ghx-list"]');
  }

  private isColumnElement(element: Element | null): boolean {
    if (!element || !element.matches) return false;
    return element.matches('[data-testid*="column"], .__board-test-hook__column');
  }

  private debouncedUpdate() {
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
    }

    this.updateTimeout = setTimeout(() => {
      this.updateAll();
    }, this.DEBOUNCE_TIME);
  }

  private updateAll() {
    this.isUpdating = true;

    if (window.JiraHelper?.GroupWipLimitsManager) {
      try {
        window.JiraHelper.GroupWipLimitsManager.update();
      } catch (error) {
        console.error('[DynamicUpdater] Ошибка обновления GroupWipLimitsManager:', error);
      }
    }

    if (window.JiraHelper?.wipLimitsManager) {
      try {
        window.JiraHelper.wipLimitsManager.update();
      } catch (error) {
        console.error('[DynamicUpdater] Ошибка обновления WipLimitsManager:', error);
      }
    }

    setTimeout(() => {
      this.isUpdating = false;
    }, 100);
  }

  stop() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
      this.updateTimeout = null;
    }
    this.isUpdating = false;
    console.log('[DynamicUpdater] Обновление остановлено');
  }
}

export const dynamicUpdater = DynamicUpdater.getInstance();

// Глобальный экспорт
if (!window.JiraHelper) window.JiraHelper = {};
window.JiraHelper.dynamicUpdater = dynamicUpdater;
