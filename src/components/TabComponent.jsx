import React, { useState } from 'react';

const TabComponent = ({ tabs = [], selectedTabId, onTabChange, children }) => {
  const [activeTab, setActiveTab] = useState(selectedTabId || tabs[0]?.id);

  const activateTab = (event, tabId) => {
    event.preventDefault();
    setActiveTab(tabId);
    onTabChange?.(tabId);
  };

  const renderTabListItem = (tabContent, isSelected) => (
    <li key={tabContent.id} className="tab-component__listItem">
      <a
        id={tabContent.id}
        className={`tab-component__link ${isSelected ? 'active' : ''}`}
        role="tab"
        href="#"
        aria-selected={isSelected}
        aria-hidden={!isSelected}
        aria-controls={`tabpanel-${tabContent.id}`}
        onClick={(event) => activateTab(event, tabContent.id)}
        title={tabContent.label}
      >
        {tabContent.label}
      </a>
    </li>
  );

  const renderTabContent = (tabContent, isSelected) => (
    <div
      key={tabContent.id}
      id={`tabpanel-${tabContent.id}`}
      className={`tab-component__tab ${isSelected ? 'active' : ''}`}
      role="tabpanel"
      tabIndex={isSelected ? '0' : '-1'}
      aria-labelledby={tabContent.id}
    >
      {React.Children.toArray(children).find(child => 
        child.props?.slot === tabContent.id
      )}
    </div>
  );

  return (
    <div className="tab-component">
      <nav>
        <ul className="tab-component__list" role="tablist">
          {tabs.map((tabContent) => 
            renderTabListItem(tabContent, tabContent.id === activeTab)
          )}
        </ul>
      </nav>
      <div className="tab-component__content">
        {tabs.map((tabContent) => 
          renderTabContent(tabContent, tabContent.id === activeTab)
        )}
      </div>
    </div>
  );
};

export default TabComponent;