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
    daysInColumn: string;
    swimlaneHeader: string;
    swimlaneRow: string;
    avatarImg: string;
    issueType: string;
    parentGroup: string;
    boardHeaderTarget: string;
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
  getIssueCssSelector(editData: any): string;
  getSwimlanes(): Array<{ id: string; element: Element; header: Element }>;
  hasCustomSwimlanes(): boolean;
  getColumnElements(): Element[];
  getColumnsInSwimlane(swimlane: Element): Element[];
}

export const BoardPagePageObject: IBoardPagePageObject = {
  selectors: {
    pool: '[data-testid="software-board.board-container.board"]',
    issue: '[data-testid="platform-board-kit.ui.card.card"]',
    flagged: '.ghx-flagged',
    grabber: '.ghx-grabber',
    grabberTransparent: '.ghx-grabber-transparent',
    sidebar: '[data-testid="software-board.layout.sidebar"]',
    column: '[data-testid="platform-board-kit.ui.column.column-container"]',
    columnHeader: '[data-testid="software-board.header.controls-bar"]',
    columnTitle: '[data-testid="platform-board-kit.ui.column-header-content"]',
    daysInColumn: '.ghx-days',
    swimlaneHeader: '',
    swimlaneRow: '',
    avatarImg: '[data-testid="platform-board-kit.ui.avatar"]',
    issueType: '[data-testid="platform-board-kit.ui.type-badge"]',
    parentGroup: '',
    boardHeaderTarget: '[data-testid="software-board.header.controls-bar"]',
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
      document.querySelectorAll(this.selectors.columnTitle) || []
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

  getBoardId(): number | null {
    const urlMatch = window.location.pathname.match(/\/boards\/(\d+)/);
    if (urlMatch) {
      const id = parseInt(urlMatch[1], 10);
      return id;
    }

    const boardElement =
      document.querySelector('[data-board-id]') ||
      document.querySelector('[data-testid*="board"]:not([data-testid*="column"]):not([data-testid*="card"])');

    if (boardElement) {
      const idAttr = boardElement.getAttribute('data-board-id');
      if (idAttr) {
        return parseInt(idAttr, 10);
      }

      const testId = boardElement.getAttribute('data-testid');
      const boardIdMatch = testId?.match(/board[_-]?(\d+)/i);
      if (boardIdMatch) {
        return parseInt(boardIdMatch[1], 10);
      }
    }

    const metaBoard = document.querySelector('meta[name="ajs-board-id"]');
    if (metaBoard) {
      const id = parseInt(metaBoard.getAttribute('content') || '0', 10);
      if (id > 0) {
        return id;
      }
    }

    return null;
  },

  getIssueCssSelector(_editData: any): string {
    return this.selectors.issue;
  },

  getSwimlanes(): Array<{ id: string; element: Element; header: Element }> {
    return [];
  },

  hasCustomSwimlanes(): boolean {
    return false;
  },

  getColumnElements(): Element[] {
    return Array.from(document.querySelectorAll(this.selectors.column));
  },

  getColumnsInSwimlane(_swimlane: Element): Element[] {
    return [];
  },
};
