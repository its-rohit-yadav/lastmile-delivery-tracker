import React, { useState } from 'react';
import Topbar from '../../components/Topbar';
import OrdersTab from './OrdersTab';
import ZonesTab from './ZonesTab';
import RateCardsTab from './RateCardsTab';
import AgentsTab from './AgentsTab';

const TABS = [
  { key: 'orders', label: 'Orders' },
  { key: 'zones', label: 'Zones & Areas' },
  { key: 'rates', label: 'Rate Cards' },
  { key: 'agents', label: 'Agents' }
];

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('orders');

  return (
    <div className="app-shell">
      <Topbar />
      <div className="main-content">
        <div className="page-header">
          <h1>Admin control center</h1>
          <p>Manage zones, rate cards, agents, and all orders system-wide.</p>
        </div>

        <div className="tabs">
          {TABS.map(t => (
            <button key={t.key} className={`tab-btn ${activeTab === t.key ? 'active' : ''}`} onClick={() => setActiveTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>

        {activeTab === 'orders' && <OrdersTab />}
        {activeTab === 'zones' && <ZonesTab />}
        {activeTab === 'rates' && <RateCardsTab />}
        {activeTab === 'agents' && <AgentsTab />}
      </div>
    </div>
  );
};

export default AdminDashboard;
