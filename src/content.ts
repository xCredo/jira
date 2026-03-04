import './firefoxFixes';
import { globalContainer } from 'dioma';
import { setAutoFreeze } from 'immer';
import { Routes } from './routing';
import { isJira } from './shared/utils';
import AddSlaLine from './charts/AddSlaLine';
import AddChartGrid from './charts/AddChartGrid';
import runModifications from './shared/runModifications';
import SwimlaneStats from './swimlane/SwimlaneStats';
import SwimlaneLimits from './swimlane/SwimlaneLimits';
import SwimlaneSettingsPopup from './swimlane/SwimlaneSettingsPopup';
import WIPLimitsSettingsPage from './column-limits/SettingsPage';
import WIPLimitsBoardPage from './column-limits/BoardPage';
import BugTemplate from './bug-template/BugTemplate';
import MarkFlaggedIssues from './issue/MarkFlaggedIssues';
import ToggleForRightSidebar from './issue/ToggleForRightSidebar';
import FieldLimitsSettingsPage from './field-limits/SettingsPage';
import FieldLimitsBoardPage from './field-limits/BoardPage';
import { setUpBlurSensitiveOnPage, initBlurSensitive } from './blur-for-sensitive/blurSensitive';
import PersonLimitsSettings from './person-limits/SettingsPage';
import PersonLimits from './person-limits/BoardPage';
import WiplimitOnCells from './wiplimit-on-cells/WipLimitOnCells';
import WiplimitOnCellsSettings from './wiplimit-on-cells/WiplimitOnCellsSettingsPopup';
import { SettingsPage } from './page-objects/SettingsPage';
import CardColorsSettingsPage from './card-colors/SettingsPage';
import { CardColorsBoardPage } from './card-colors/BoardPage';
import { BoardSettingsBoardPage } from './board-settings/BoardPage';
import { SubTasksProgressBoardPage } from './features/sub-tasks-progress/BoardPage';
import { registerBoardPagePageObjectInDI } from './page-objects/BoardPage';
import { registerBoardPropertyServiceInDI } from './shared/boardPropertyService';
import { registerJiraServiceInDI } from './shared/jira/jiraService';
import { registerLogger } from './shared/Logger';
import { DiagnosticBoardPage } from './features/diagnostic/BoardPage';
import { LocalSettingsBoardPage } from './features/local-settings/BoardPage';
import { extensionApiService } from './shared/ExtensionApiService';
import { AdditionalCardElementsBoardPage } from './features/additional-card-elements/BoardPage';
import { AdditionalCardElementsBoardBacklogPage } from './features/additional-card-elements/BoardBacklogPage';

setAutoFreeze(false);

const domLoaded = () =>
  // eslint-disable-next-line consistent-return
  new Promise(resolve => {
    if (document.readyState === 'interactive' || document.readyState === 'complete') return resolve(undefined);
    window.addEventListener('DOMContentLoaded', resolve);
  });

function initDiContainer() {
  const container = globalContainer;
  registerBoardPagePageObjectInDI(container);
  registerBoardPropertyServiceInDI(container);
  registerJiraServiceInDI(container);
  registerLogger(container);
}

async function start() {
  if (!isJira) {
    console.log('NOTT JiRA');
    return;
  }
  console.log('Jira');
  initBlurSensitive();
  extensionApiService.sendMessage({ message: 'jira-helper-inited' });

  await domLoaded();
  initDiContainer();

  setUpBlurSensitiveOnPage();

  const modificationsMap = {
    [Routes.BOARD]: [
      SwimlaneStats,
      PersonLimits,
      WIPLimitsBoardPage,
      SwimlaneLimits,
      MarkFlaggedIssues,
      FieldLimitsBoardPage,
      WiplimitOnCells,
      CardColorsBoardPage,
      BoardSettingsBoardPage,
      SubTasksProgressBoardPage,
      LocalSettingsBoardPage,
      DiagnosticBoardPage,
      AdditionalCardElementsBoardPage,
    ],
    [Routes.BOARD_BACKLOG]: [AdditionalCardElementsBoardBacklogPage],
    [Routes.SETTINGS]: [
      SwimlaneSettingsPopup,
      WIPLimitsSettingsPage,
      PersonLimitsSettings,
      FieldLimitsSettingsPage,
      WiplimitOnCellsSettings,
      CardColorsSettingsPage,
    ],
    [Routes.ISSUE]: [MarkFlaggedIssues, ToggleForRightSidebar],
    [Routes.SEARCH]: [MarkFlaggedIssues, ToggleForRightSidebar],
    [Routes.REPORTS]: [AddSlaLine, AddChartGrid],
    [Routes.ALL]: [BugTemplate],
  };

  // @ts-expect-error
  runModifications(modificationsMap);
  if (window.location.hostname.includes('atlassian.net')) {
  console.log('[Jira Helper] Обнаружен Jira Cloud, монтируем кнопку вручную');
  
  setTimeout(() => {
    const mountButton = () => {
      const controlsBar = document.querySelector('[data-testid="software-board.header.controls-bar"]');
      if (controlsBar && !controlsBar.querySelector('[data-jh-random-color-button]')) {
        const container = document.createElement('div');
        container.setAttribute('data-jh-random-color-button', '');
        container.style.display = 'inline-block';
        container.style.marginLeft = '8px';
        container.style.position = 'relative';
        controlsBar.appendChild(container);

        import('./column-limits/BoardPage/RandomColorButton').then(({ RandomColorButton }) => {
          import('react-dom/client').then(({ createRoot }) => {
            const root = createRoot(container);
            root.render(React.createElement(RandomColorButton));
            
            // Импортируем и вызываем initializeCore
            import('./core').then(({ initializeCore }) => {
              initializeCore();
              console.log('[Jira Helper] Ядро инициализировано для Cloud');
            });
          });
        });
        return true;
      }
      return false;
    };

    if (!mountButton()) {
      const observer = new MutationObserver(() => {
        if (mountButton()) {
          observer.disconnect();
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }
  }, 2000);
}
}

start();

// @ts-expect-error
window.SettingsPage = SettingsPage;
