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
    <div className="jh-settings-panel" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <div className="jh-settings-tabs" style={{ display: 'flex', borderBottom: '1px solid #dfe1e6', marginBottom: '20px' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '12px 16px',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid #0052cc' : 'none',
              background: 'transparent',
              color: activeTab === tab.id ? '#0052cc' : '#42526e',
              fontWeight: activeTab === tab.id ? 600 : 400,
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      
      <div className="jh-settings-content">
        <ActiveComponent />
      </div>
    </div>
  );
};

export default SettingsPanel;
