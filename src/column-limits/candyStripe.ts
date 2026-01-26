export class CandyStripeManager {
  private isEnabled = false;

  // Скорости для разных колонок (в секундах)
  private columnSpeeds = {
    todo: 10,
    inProgress: 5,
    done: 1,
  };

  enable() {
    if (this.isEnabled) return;
    this.isEnabled = true;

    this.addStripesToAllCards();
    console.log('[Jira Helper] Полоски-леденцы включены');
  }

  disable() {
    if (!this.isEnabled) return;
    this.isEnabled = false;

    this.removeAllStripes();
    console.log('[Jira Helper] Полоски-леденцы выключены');
  }

  private addStripesToAllCards() {
    const cards = document.querySelectorAll<HTMLElement>('[data-testid="platform-board-kit.ui.card.card"]');

    cards.forEach(card => this.addStripeToCard(card));
  }

  addStripeToCard(card: HTMLElement, cardColor?: string) {
    // Если полоска уже есть - обновляем цвет
    const existingStripe = card.querySelector('.jira-helper-barber-pole');
    if (existingStripe) {
      this.updateStripeColor(card, cardColor);
      return;
    }

    // Получаем цвет карточки
    const computedColor = window.getComputedStyle(card).backgroundColor;
    const backgroundColor = cardColor || computedColor || '#ffffff';

    // ОПРЕДЕЛЯЕМ КОЛОНКУ и получаем скорость
    const columnSpeed = this.getColumnSpeed(card);

    // Создаём полоску-леденец
    const stripe = document.createElement('div');
    stripe.className = 'jira-helper-barber-pole';

    // ВНУТРЕННЯЯ полоска, прижатая к левому краю карточки
    stripe.style.cssText = `
      position: absolute;
      left: 0;
      top: 0;
      width: 8px;
      height: 100%;
      z-index: 1;
      pointer-events: none;
      border-right: 1px solid #000000;
      overflow: hidden;
    `;

    // Внутренний элемент для градиента
    const innerStripe = document.createElement('div');
    innerStripe.className = 'jira-helper-barber-inner';

    innerStripe.style.cssText = `
      width: 100%;
      height: 200%;
      background: repeating-linear-gradient(
        45deg,
        #ff0000,
        #ff0000 10px,
        ${backgroundColor} 10px,
        ${backgroundColor} 20px
      );
      animation: poleSpin ${columnSpeed}s linear infinite;
    `;

    // Добавляем data-атрибут для отладки
    innerStripe.dataset.columnSpeed = columnSpeed.toString();

    stripe.appendChild(innerStripe);

    // Находим внутренний контейнер карточки
    const innerCard =
      card.querySelector<HTMLElement>('[data-testid="software-context-menu.ui.context-menu.children-wrapper"] > div') ||
      card;

    // Делаем relative для позиционирования
    if (getComputedStyle(innerCard).position === 'static') {
      innerCard.style.position = 'relative';
    }

    innerCard.appendChild(stripe);

    // Добавляем стили анимации
    this.addAnimationStyles();
  }

  // Функция определения колонки и скорости
  private getColumnSpeed(card: HTMLElement): number {
    try {
      // Получаем все карточки для определения колонок
      const allCards = Array.from(
        document.querySelectorAll<HTMLElement>('[data-testid="platform-board-kit.ui.card.card"]')
      );

      if (allCards.length === 0) return this.columnSpeeds.inProgress;

      // Сортируем по горизонтальной позиции
      const cardsWithPos = allCards.map(card => ({
        element: card,
        left: card.getBoundingClientRect().left,
      }));

      cardsWithPos.sort((a, b) => a.left - b.left);

      // Определяем колонки
      const columns: HTMLElement[][] = [];
      let currentColumn: HTMLElement[] = [];
      let prevLeft = cardsWithPos[0].left;

      cardsWithPos.forEach(({ element, left }) => {
        if (Math.abs(left - prevLeft) > 150 && currentColumn.length > 0) {
          columns.push([...currentColumn]);
          currentColumn = [];
        }
        currentColumn.push(element);
        prevLeft = left;
      });

      if (currentColumn.length > 0) {
        columns.push(currentColumn);
      }

      // Находим индекс колонки текущей карточки
      let columnIndex = -1;
      for (let i = 0; i < columns.length; i++) {
        if (columns[i].includes(card)) {
          columnIndex = i;
          break;
        }
      }

      // Определяем скорость по индексу колонки
      if (columnIndex === 0) {
        console.log(`[Jira Helper] TO DO колонка, скорость: ${this.columnSpeeds.todo}s`);
        return this.columnSpeeds.todo;
      }
      if (columnIndex === columns.length - 1) {
        console.log(`[Jira Helper] DONE колонка, скорость: ${this.columnSpeeds.done}s`);
        return this.columnSpeeds.done;
      }
      console.log(`[Jira Helper] IN PROGRESS колонка, скорость: ${this.columnSpeeds.inProgress}s`);
      return this.columnSpeeds.inProgress;
    } catch (error) {
      console.error('[Jira Helper] Ошибка определения колонки:', error);
      return this.columnSpeeds.inProgress; // По умолчанию
    }
  }

  private addAnimationStyles() {
    if (document.querySelector('#jira-helper-barber-styles')) return;

    const style = document.createElement('style');
    style.id = 'jira-helper-barber-styles';
    style.textContent = `
      @keyframes poleSpin {
        0% { transform: translateY(0); }
        100% { transform: translateY(-50%); }
      }
    `;
    document.head.appendChild(style);
  }

  updateStripeColor(card: HTMLElement, cardColor?: string) {
    const stripe = card.querySelector('.jira-helper-barber-pole') as HTMLElement;
    if (!stripe) return;

    const innerStripe = stripe.querySelector('.jira-helper-barber-inner') as HTMLElement;
    if (!innerStripe) return;

    const computedColor = window.getComputedStyle(card).backgroundColor;
    const backgroundColor = cardColor || computedColor || '#ffffff';

    // Обновляем градиент
    innerStripe.style.background = `repeating-linear-gradient(
      45deg,
      #ff0000,
      #ff0000 10px,
      ${backgroundColor} 10px,
      ${backgroundColor} 20px
    )`;
  }

  private removeAllStripes() {
    document.querySelectorAll('.jira-helper-barber-pole').forEach(stripe => {
      stripe.remove();
    });
  }

  // Метод для обновления всех полосок
  updateAllStripesColors() {
    if (!this.isEnabled) return;

    const cards = document.querySelectorAll<HTMLElement>('[data-testid="platform-board-kit.ui.card.card"]');

    cards.forEach(card => {
      this.updateStripeColor(card);
    });
  }
}

// Экспортируем синглтон
export const candyStripeManager = new CandyStripeManager();
