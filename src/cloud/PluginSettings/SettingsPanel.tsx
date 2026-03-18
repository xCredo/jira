// src/cloud/PluginSettings/SettingsPanel.tsx
// Главная панель настроек плагина Jira Helper

import React, { useState } from 'react';
import { PersonLimitsSettings } from '../features/person-limits';
import { ColumnLimitsSettings } from '../features/column-limits';
import { AssigneeHighlighterSettings } from '../features/assignee-highlighter';
import styles from '../ui/settings.module.css';

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
    <div className={styles.panel}>
      <div 
        className={styles.tabs}
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 1000,
          backgroundColor: '#ffffff',
          padding: '12px 16px',
          borderBottom: '1px solid #e1e4e8',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          marginBottom: '16px',
        }}
      >
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={activeTab === tab.id ? styles.tabActive : styles.tab}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className={styles.content}>
        <ActiveComponent />
      </div>
    </div>
  );
};

export default SettingsPanel;