import React from 'react';
import { Container } from 'dioma';
import { boardPagePageObjectToken } from 'src/page-objects/BoardPage';
import { createRoot } from 'react-dom/client';
import { PageModification } from '../shared/PageModification';
import { BoardSettingsComponent } from './BoardSettingsComponent';

export class BoardSettingsBoardPage extends PageModification<undefined, Element> {
  constructor(protected container: Container = globalContainer) {
    super(container);
  }

  getModificationId(): string {
    return `board-settings-board-${this.getBoardId()}`;
  }

  waitForLoading(): Promise<Element> {
    const po = this.container.inject(boardPagePageObjectToken);
    return this.waitForElement(po.selectors.sidebar);
  }

  loadData() {
    return Promise.resolve(undefined);
  }

  async apply(): Promise<void> {
    const po = this.container.inject(boardPagePageObjectToken);
    const div = document.createElement('div');
    const sidebar = document.querySelector(po.selectors.sidebar);
    if (!sidebar) {
      console.error('Sidebar not found');
      return;
    }
    const boardSettingsComponent = sidebar.parentElement?.querySelector('[data-jh-component="boardSettingsComponent"]');
    if (boardSettingsComponent) {
      return;
    }

    sidebar.after(div);
    createRoot(div).render(<BoardSettingsComponent />);
  }
}
