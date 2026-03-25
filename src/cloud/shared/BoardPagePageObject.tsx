// src/cloud/shared/BoardPagePageObject.ts
// Page Object для работы с доской Jira Cloud

import React from 'react';
import { createRoot, Root } from 'react-dom/client';

class CardPageObject {
  selectors = {
    issueKey: '.ghx-key',
  };

  constructor(private readonly card: Element) {}

  getIssueId() {
    return this.card.querySelector(this.selectors.issueKey)?.textContent?.trim() as string;
  }

  attach(
    ComponentToAttach: React.ComponentType<{ issueId: string }>,
    key: string,
    options?: { position: 'aftersummary' }
  ) {
    let div = this.card.querySelector(`[data-jh-attached-key="${key}"]`);

    if (div) {
      return;
    }

    div = document.createElement('div');
    div.setAttribute('data-jh-attached-key', key);
    if (options?.position === 'aftersummary') {
      this.card.querySelector('.ghx-issue-fields')?.after(div);
    } else {
      this.card.querySelector('.ghx-issue-content')?.appendChild(div);
    }

    const root = createRoot(div);
    root.render(<ComponentToAttach issueId={this.getIssueId()} />);

    this.unmountReactRootWhenCardIsRemoved(root);
  }

  private unmountReactRootWhenCardIsRemoved(root: Root) {
    const interval = setInterval(() => {
      if (!document.body.contains(this.card)) {
        root.unmount();
        clearInterval(interval);
      }
    }, 1000);
  }
}

export interface IBoardPagePageObject {
  selectors: {
    pool: string;
    issue: string;
    flagged: string;
    grabber: string;
    grabberTransparent: string;
    sidebar: string;
    column: string;
    columnHeader: string;
    columnTitle: string;
    issueCardCloud: string;
    boardHeaderCloud: string;
    boardContainerCloud: string;
    boardColumnContainerCloud: string;
  };

  classlist: {
    flagged: string;
  };

  getColumns(): string[];
  listenCards(callback: (cards: CardPageObject[]) => void): () => void;
  getColumnOfIssue(issueId: string): string;
  getHtml(): string;
  getAllCloudCards(): HTMLElement[];
  getBoardId(): number | null;
}

export const BoardPagePageObject: IBoardPagePageObject = {
  selectors: {
    pool: '#ghx-pool',
    issue: '.ghx-issue',
    flagged: '.ghx-flagged',
    grabber: '.ghx-grabber',
    grabberTransparent: '.ghx-grabber-transparent',
    sidebar: '.aui-sidebar.projects-sidebar .aui-navgroup.aui-navgroup-vertical',
    column: '.ghx-column',
    columnHeader: '#ghx-column-headers',
    columnTitle: '.ghx-column-title',
    issueCardCloud: '[data-testid="platform-board-kit.ui.card.card"]',
    boardHeaderCloud: '[data-testid="software-board.header.controls-bar"]',
    boardContainerCloud: '[data-testid^="software-board.board-container"]',
    boardColumnContainerCloud: '[data-testid="software-board.board-container.board"]',
  },

  classlist: {
    flagged: 'ghx-flagged',
  },

  getColumns(): string[] {
    return Array.from(
      document.querySelector(this.selectors.columnHeader)?.querySelectorAll(this.selectors.columnTitle) || []
    ).map(column => column.textContent?.trim() || '');
  },

  listenCards(callback: (cards: CardPageObject[]) => void) {
    let currentCards = '';
    const getCards = () => {
      const cards = Array.from(document.querySelectorAll(this.selectors.issue)).map(card => new CardPageObject(card));
      return cards;
    };
    const getCurrentCardsState = (cards: CardPageObject[]) => cards.map(card => card.getIssueId()).join(',');

    const notifyIfNewCards = () => {
      const cards = getCards();
      const currentCardsState = getCurrentCardsState(cards);
      if (currentCardsState !== currentCards) {
        currentCards = currentCardsState;
        callback(cards);
      }
    };

    notifyIfNewCards();

    const interval = setInterval(() => {
      notifyIfNewCards();
    }, 1000);

    return () => clearInterval(interval);
  },

  getColumnOfIssue(issueId: string) {
    const issue = document.querySelector(`[data-issue-key="${issueId}"]`);
    const columnId = issue?.closest(this.selectors.column)?.getAttribute('data-column-id');
    if (!columnId) return '';

    const column = document.querySelector(this.selectors.columnHeader)?.querySelector(`[data-id="${columnId}"]`);
    return column?.querySelector(this.selectors.columnTitle)?.textContent?.trim() || '';
  },

  getHtml(): string {
    return document.body.innerHTML;
  },

  getAllCloudCards(): HTMLElement[] {
    return Array.from(document.querySelectorAll<HTMLElement>(this.selectors.issueCardCloud));
  },

  /**
   * Получает ID доски из URL или из DOM
   * @returns ID доски или null, если не удалось определить
   */
  getBoardId(): number | null {
    // Способ 1: из URL
    // URL может быть: /boards/1, /boards/1/view, /jira/software/c/projects/PROJ/boards/1
    const urlMatch = window.location.pathname.match(/\/boards\/(\d+)/);
    if (urlMatch) {
      const id = parseInt(urlMatch[1], 10);
      console.log('[BoardPagePageObject] Board ID из URL:', id);
      return id;
    }

    // Способ 2: из DOM (запасной)
    // Ищем элемент с data-board-id или data-testid содержащим board
    const boardElement =
      document.querySelector('[data-board-id]') ||
      document.querySelector('[data-testid*="board"]:not([data-testid*="column"]):not([data-testid*="card"])');

    if (boardElement) {
      const idAttr = boardElement.getAttribute('data-board-id');
      if (idAttr) {
        const id = parseInt(idAttr, 10);
        console.log('[BoardPagePageObject] Board ID из DOM:', id);
        return id;
      }

      // Пробуем получить из data-testid
      const testId = boardElement.getAttribute('data-testid');
      const boardIdMatch = testId?.match(/board[_-]?(\d+)/i);
      if (boardIdMatch) {
        const id = parseInt(boardIdMatch[1], 10);
        console.log('[BoardPagePageObject] Board ID из data-testid:', id);
        return id;
      }
    }

    // Способ 3: из мета-тегов
    const metaBoard = document.querySelector('meta[name="ajs-board-id"]');
    if (metaBoard) {
      const id = parseInt(metaBoard.getAttribute('content') || '0', 10);
      if (id > 0) {
        console.log('[BoardPagePageObject] Board ID из meta:', id);
        return id;
      }
    }

    console.warn('[BoardPagePageObject] Не удалось определить ID доски');
    return null;
  },
};
