// src/core/DynamicUpdater.ts

export class DynamicUpdater {
  private static instance: DynamicUpdater;
  private observer: MutationObserver | null = null;
  private boardContainer: HTMLElement | null = null;
  private updateTimeout: NodeJS.Timeout | null = null;
  private readonly DEBOUNCE_TIME = 500; // мс
  private isUpdating = false; // Флаг для защиты от рекурсии

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

  // Ищем контейнер доски и начинаем наблюдение
  private findBoardContainerAndObserve() {
    // Популярные селекторы для контейнера колонок в Jira
    const boardSelectors = [
      '[data-testid="board-view"]',
      '[data-testid="software-board.board"]',
      '.ghx-columns', // Классическая Jira
      '#ghx-pool',    // Классическая Jira
      '#ghx-board-column' // Классическая Jira
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
      // Если доска еще не загрузилась, пробуем снова через секунду
      setTimeout(() => this.findBoardContainerAndObserve(), 1000);
    }
  }

  private setupMutationObserver() {
    if (!this.boardContainer) return;

    this.observer = new MutationObserver((mutations) => {
      // Игнорируем мутации, если мы прямо сейчас обновляем WIP-лимиты,
      // чтобы не создавать цикл.
      if (this.isUpdating) return;

      // Проверяем, есть ли среди мутаций те, которые касаются карточек
      const relevantMutation = mutations.some(m => {
        // Добавление/удаление узлов
        if (m.type === 'childList') {
          // Проверяем добавленные узлы
          for (const node of Array.from(m.addedNodes)) {
            if (this.isCardElement(node as Element) || this.isCardContainer(node as Element)) {
              return true;
            }
          }
          // Проверяем удаленные узлы
          for (const node of Array.from(m.removedNodes)) {
            if (this.isCardElement(node as Element) || this.isCardContainer(node as Element)) {
              return true;
            }
          }
        }
        
        // Изменение атрибутов (например, класс, который может указывать на перемещение)
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

    // Наблюдаем за контейнером доски и его дочерними элементами,
    // но НЕ наблюдаем за всеми изменениями атрибутов без разбора.
    this.observer.observe(this.boardContainer, {
      childList: true,      // Добавление/удаление колонок или карточек
      subtree: true,        // Наблюдаем за всей иерархией внутри контейнера
      attributes: true,      // Следим за атрибутами...
      attributeFilter: ['class', 'data-testid'] // ...но только за конкретными
    });
  }

  // Проверяет, является ли элемент карточкой
  private isCardElement(element: Element | null): boolean {
    if (!element || !element.matches) return false;
    return element.matches('[data-testid*="card"], [id*="card-"], [data-testid*="issue"]');
  }

  // Проверяет, является ли элемент контейнером карточек
  private isCardContainer(element: Element | null): boolean {
    if (!element || !element.matches) return false;
    return element.matches('[data-testid*="column"] [data-testid*="list"], [class*="ghx-list"]');
  }

  // Проверяет, является ли элемент колонкой
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
    // Устанавливаем флаг, чтобы игнорировать мутации, вызванные нашей же работой
    this.isUpdating = true;
    
    // Убираем лог, который спамил. Оставим только для важных событий.
    // console.log('[DynamicUpdater] Обновление WIP-лимитов');

    // Обновляем менеджеры
    if (window.JiraHelper?.GroupWipLimitsManager) {
      try {
        window.JiraHelper.GroupWipLimitsManager.update();
      } catch (error) {
        console.error('[DynamicUpdater] Ошибка обновления GroupWipLimitsManager:', error);
      }
    }

    if (window.JiraHelper?.wipLimitsManager) { // Проверяем правильное имя
      try {
        window.JiraHelper.wipLimitsManager.update();
      } catch (error) {
        console.error('[DynamicUpdater] Ошибка обновления WipLimitsManager:', error);
      }
    }

    // Сбрасываем флаг после завершения обновлений
    // Используем setTimeout, чтобы дать браузеру время применить изменения DOM,
    // прежде чем мы снова начнем реагировать на мутации.
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