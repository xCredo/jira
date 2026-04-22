// src/cloud/PluginSettings/SettingsPanel.tsx
// Главная панель настроек плагина Jira Helper (Ant Design)

import React, { useState } from 'react';
import { Tabs } from 'antd';
import { PersonLimitsSettings } from '../features/person-limits';
import { ColumnLimitsSettings } from '../features/column-limits';
import { AssigneeHighlighterSettings } from '../features/assignee-highlighter';
import styles from '../ui/settings.module.css';

type TabType = 'assignee-highlighter' | 'person-limits' | 'column-limits';

const items = [
  {
    key: 'assignee-highlighter',
    label: 'Подсветка исполнителей',
    children: <AssigneeHighlighterSettings />,
  },
  {
    key: 'person-limits',
    label: 'Персональные лимиты',
    children: <PersonLimitsSettings />,
  },
  {
    key: 'column-limits',
    label: 'Групповые лимиты',
    children: <ColumnLimitsSettings />,
  },
];

export const SettingsPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('assignee-highlighter');

  return (
    <div className={styles.panel}>
      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as TabType)}
        items={items}
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        }}
      />
    </div>
  );
};

export default SettingsPanel;
