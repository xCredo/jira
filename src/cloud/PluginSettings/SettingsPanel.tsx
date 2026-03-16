// src/cloud/PluginSettings/SettingsPanel.tsx
// Главная панель настроек плагина Jira Helper

import React, { useState } from 'react';
import { PersonLimitsSettings } from '../features/person-limits';
import { ColumnLimitsSettings } from '../features/column-limits';
import { AssigneeHighlighterSettings } from '../features/assignee-highlighter';

type TabType = 'assignee-highlighter' | 'person-limits' | 'column-limits';

interface Tab {
  id: TabType;
  label: string;
  component: React.FC;
}

const tabs: Tab[] = [
  { id: 'assignee-highlighter', label: 'Подсветка исполнителей', component: AssigneeHighlighterSettings },
  { id: 'person-limits', label: 'Персональные лимиты', component: PersonLimitsSettings },
  { id: 'column-limits', label: 'Групповые лимиты', component: ColumnLimitsSettings },
];

export const SettingsPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('assignee-highlighter');

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || AssigneeHighlighterSettings;

  return (
    <div className="jh-settings-panel">
      <div className="jh-settings-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={activeTab === tab.id ? 'jh-tab-active' : 'jh-tab'}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="jh-settings-tab-content">
        <ActiveComponent />
      </div>
    </div>
  );
};

export default SettingsPanel;
