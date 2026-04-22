import { Container, Token } from 'dioma';
import { PageModification } from '../../shared/PageModification';
import { BOARD_PROPERTIES } from '../../shared/constants';
import { boardPagePageObjectToken } from 'src/shared/di/boardPageObjectToken';

interface PersonLimit {
  person: {
    displayName: string;
    name: string;
    avatar: string;
  };
  columns: Array<{ id: string }>;
  swimlanes: Array<{ id: string }>;
  limit: number;
  issues: HTMLElement[];
}

const isPersonLimitAppliedToIssue = (
  personLimit: PersonLimit,
  assignee: string | null,
  columnId: string,
  swimlaneId?: string | null
): boolean => {
  if (swimlaneId == null) {
    return (
      (personLimit.person.displayName === assignee || personLimit.person.name === assignee) &&
      personLimit.columns.some(column => column.id === columnId)
    );
  }

  return (
    (personLimit.person.displayName === assignee || personLimit.person.name === assignee) &&
    personLimit.columns.some(column => column.id === columnId) &&
    personLimit.swimlanes.some(swimlane => swimlane.id === swimlaneId)
  );
};

const getNameFromTooltip = (tooltip: string): string => {
  return tooltip.split(':')[1].split('[')[0].trim();
};

const getAssignee = (avatar: HTMLImageElement | null): string | null => {
  if (!avatar) return null;

  const label = avatar.alt ?? avatar.dataset.tooltip;
  if (!label) return null;

  return getNameFromTooltip(label);
};

export default class PersonLimitsBoardPage extends PageModification<[any, any], Element> {
  private cssSelectorOfIssues: string | null = null;

  private avatarsList: null | Element = null;

  constructor(protected container: Container = globalContainer) {
    super(container);
  }

  shouldApply(): boolean {
    const view = this.getSearchParam('view');
    return !view || view === 'detail';
  }

  getModificationId(): string {
    return `add-person-limits-${this.getBoardId()}`;
  }

  appendStyles(): string {
    return `
    <style type="text/css">
        #avatars-limits {
            display: inline-flex;
            margin-left: 30px;
        }

        #avatars-limits .person-avatar {
            cursor: pointer;
            position: relative;
            margin-right: 4px;
            width: 32px;
            height: 32px;
        }

        #avatars-limits .person-avatar img {
            width: 32px;
            height: 32px;
            border-radius: 10px;
            border: none;
        }

        #avatars-limits .person-avatar img[view-my-cards="block"] {
            border: solid 1px red;
        }

        #avatars-limits .person-avatar .limit-stats {
            position: absolute;
            top: -10px;
            right: -6px;
            border-radius: 50%;
            background: grey;
            color: white;
            padding: 5px 2px;
            font-size: 12px;
            line-height: 12px;
            font-weight: 400;
        }

        .no-visibility {
            display: none!important;
        }
    </style>
    `;
  }

  waitForLoading(): Promise<Element> {
    const po = this.container.inject(boardPagePageObjectToken);
    return this.waitForElement(po.selectors.swimlaneRow);
  }

  loadData(): Promise<[any, any]> {
    return Promise.all([this.getBoardEditData(), this.getBoardProperty(BOARD_PROPERTIES.PERSON_LIMITS)]);
  }

  apply(data: [any, any]): void {
    if (!data) return;
    const [editData = {}, personLimits] = data;
    if (!personLimits || !personLimits.limits.length) return;

    const po = this.container.inject(boardPagePageObjectToken);
    this.cssSelectorOfIssues = po.getIssueCssSelector(editData);
    this.applyLimits(personLimits);
    this.onDOMChange(po.selectors.pool, () => this.applyLimits(personLimits), { childList: true, subtree: true });
  }

  applyLimits(personLimits: { limits: PersonLimit[] }): void {
    const stats = this.getLimitsStats(personLimits);

    stats.forEach(personLimit => {
      if (personLimit.issues.length > personLimit.limit) {
        personLimit.issues.forEach(issue => {
          issue.style.backgroundColor = '#ff5630';
        });
      }
    });

    if (!this.avatarsList || !document.body.contains(this.avatarsList)) {
      const html = stats
        .map(
          personLimit => `
        <div class="person-avatar">
            <img src="${personLimit.person.avatar}" title="${personLimit.person.displayName}" class="jira-tooltip" />
            <div class="limit-stats">
                <span class="stats-current"></span>/<span>${personLimit.limit}</span>
            </div>
        </div>`
        )
        .join('');

      this.avatarsList = document.createElement('div');

      this.avatarsList.id = 'avatars-limits';
      this.avatarsList.innerHTML = html;

      // @ts-expect-error
      this.addEventListener(this.avatarsList, 'click', event => this.onClickAvatar(event));
      const po = this.container.inject(boardPagePageObjectToken);
      document.querySelector(po.selectors.boardHeaderTarget)?.insertBefore(this.avatarsList, null);
    }

    this.avatarsList.querySelectorAll('.limit-stats').forEach((stat, index) => {
      const { style } = stat as HTMLElement;
      if (stats[index].issues.length > stats[index].limit) style.background = '#ff5630';
      else if (stats[index].issues.length === stats[index].limit) style.background = '#ffd700';
      else style.background = '#1b855c';

      stat.querySelector('.stats-current')!.textContent = stats[index].issues.length.toString();
    });
  }

  onClickAvatar(event: MouseEvent): void {
    const target = event.target as HTMLImageElement;
    if (target.nodeName !== 'IMG') return;
    const cardsVisibility = target.getAttribute('view-my-cards');

    if (!cardsVisibility) {
      target.setAttribute('view-my-cards', 'block');
    } else {
      target.removeAttribute('view-my-cards');
    }

    this.showOnlyChosen();
  }

  showOnlyChosen(): void {
    const po = this.container.inject(boardPagePageObjectToken);
    const cards = Array.from(document.querySelectorAll(po.selectors.issue));
    const isHaveChoose = document.querySelectorAll('[view-my-cards="block"]').length > 0;

    if (!isHaveChoose) {
      cards.forEach(node => {
        node.classList.remove('no-visibility');
      });
      this.showOrHideTaskAggregations();
      return;
    }

    const avatar = Array.from(document.querySelectorAll('[view-my-cards]'));
    const avaTitles = avatar.map(el => (el as HTMLImageElement).title);

    cards.forEach(node => {
      const tooltipHolder = node.querySelector(po.selectors.avatarImg.replace('img', '')) || node.querySelector('.ghx-avatar span');
      if (!tooltipHolder) {
        node.classList.add('no-visibility');
        return;
      }

      const tooltipText = tooltipHolder.getAttribute('data-tooltip') || tooltipHolder.getAttribute('alt');
      const name = getNameFromTooltip(tooltipText!);
      if (avaTitles.includes(name)) {
        node.classList.remove('no-visibility');
      } else {
        node.classList.add('no-visibility');
      }
    });
    this.showOrHideTaskAggregations();
  }

  showOrHideTaskAggregations(): void {
    this.showOrHideSubTaskParentGroup();
    this.showOrHideEmptySwimlanes();
  }

  showOrHideSubTaskParentGroup(): void {
    const po = this.container.inject(boardPagePageObjectToken);
    const parentGroup = Array.from(document.querySelectorAll(po.selectors.parentGroup));
    parentGroup.forEach(el => {
      this.showOrHideElementByVisibleIssueCards(el);
    });
  }

  showOrHideEmptySwimlanes(): void {
    const po = this.container.inject(boardPagePageObjectToken);
    const swimlanes = po.getSwimlanes();
    swimlanes.forEach(swimlane => {
      this.showOrHideElementByVisibleIssueCards(swimlane.element);
    });
  }

  showOrHideElementByVisibleIssueCards(el: Element): void {
    const po = this.container.inject(boardPagePageObjectToken);
    const lenNoVisibleCards = el.querySelectorAll(`${po.selectors.issue}.no-visibility`).length;
    const lenCard = el.querySelectorAll(po.selectors.issue).length;

    if (lenNoVisibleCards === lenCard) {
      el.classList.add('no-visibility');
    } else {
      el.classList.remove('no-visibility');
    }
  }

  hasCustomswimlanes(): boolean {
    const po = this.container.inject(boardPagePageObjectToken);
    return po.hasCustomSwimlanes();
  }

  countAmountPersonalIssuesInColumn(column: Element, stats: PersonLimit[], swimlaneId?: string | null): void {
    const po = this.container.inject(boardPagePageObjectToken);
    const { columnId } = (column as HTMLElement).dataset;

    column.querySelectorAll(this.cssSelectorOfIssues!).forEach(issue => {
      const avatar = issue.querySelector(po.selectors.avatarImg) as HTMLImageElement;
      const assignee = getAssignee(avatar);

      if (assignee) {
        stats.forEach(personLimit => {
          if (isPersonLimitAppliedToIssue(personLimit, assignee, columnId!, swimlaneId)) {
            personLimit.issues.push(issue as HTMLElement);
          }
        });
      }
    });
  }

  getLimitsStats(personLimits: { limits: PersonLimit[] }): PersonLimit[] {
    const po = this.container.inject(boardPagePageObjectToken);
    const stats = personLimits.limits.map(personLimit => ({
      ...personLimit,
      issues: [] as HTMLElement[],
    }));

    if (this.hasCustomswimlanes()) {
      po.getSwimlanes().forEach(swimlane => {
        po.getColumnsInSwimlane(swimlane.element).forEach(column => {
          this.countAmountPersonalIssuesInColumn(column, stats, swimlane.id);
        });
      });

      return stats;
    }

    po.getColumnElements().forEach(column => {
      this.countAmountPersonalIssuesInColumn(column, stats);
    });

    return stats;
  }
}

export const personLimitsBoardPageToken = new Token<PersonLimitsBoardPage>('PersonLimitsBoardPage');