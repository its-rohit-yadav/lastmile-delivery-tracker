import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import StatusPill from '../../components/StatusPill';

const STATUS_OPTIONS = ['Pending', 'Assigned', 'Picked Up', 'In Transit', 'Out for Delivery', 'Delivered', 'Failed'];

const OrdersTab = () => {
  const [orders, setOrders] = useState([]);
  const [zones, setZones] = useState([]);
  const [agents, setAgents] = useState([]);
  const [filters, setFilters] = useState({ status: '', zone: '' });
  const [assignModal, setAssignModal] = useState(null);
  const [selectedAgent, setSelectedAgent] = useState('');
  const [overrideModal, setOverrideModal] = useState(null);
  const [overrideStatus, setOverrideStatus] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.zone) params.zone = filters.zone;
      const res = await api.get('/orders', { params });
      setOrders(res.data);
    } finally {
      setLoading(false);
    }
  };

  const fetchSupportData = async () => {
    const [zonesRes, agentsRes] = await Promise.all([
      api.get('/admin/zones'),
      api.get('/admin/agents')
    ]);
    setZones(zonesRes.data);
    setAgents(agentsRes.data.filter(a => a.is_available));
  };

  useEffect(() => { fetchSupportData(); }, []);
  useEffect(() => { fetchOrders(); }, [filters]);

  const handleAutoAssign = async (orderId) => {
    try {
      await api.patch(`/orders/${orderId}/assign`, { auto: true });
      fetchOrders();
      fetchSupportData();
    } catch (err) {
      alert(err.response?.data?.message || 'Auto-assignment failed.');
    }
  };

  const handleManualAssign = async () => {
    try {
      await api.patch(`/orders/${assignModal.id}/assign`, { agentId: selectedAgent });
      setAssignModal(null);
      fetchOrders();
      fetchSupportData();
    } catch (err) {
      alert(err.response?.data?.message || 'Assignment failed.');
    }
  };

  const handleOverride = async () => {
    try {
      await api.patch(`/orders/${overrideModal.id}/status`, { status: overrideStatus, note: 'Status overridden by admin' });
      setOverrideModal(null);
      fetchOrders();
    } catch (err) {
      alert(err.response?.data?.message || 'Override failed.');
    }
  };

  return (
    <div>
      <div className="filter-bar">
        <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filters.zone} onChange={(e) => setFilters({ ...filters, zone: e.target.value })}>
          <option value="">All zones</option>
          {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
        </select>
      </div>

      {loading ? <p>Loading orders...</p> : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Order</th><th>Customer</th><th>Route</th><th>Charge</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id}>
                  <td>#{o.id}</td>
                  <td>{o.customer_name}</td>
                  <td>{o.pickup_zone} → {o.drop_zone}</td>
                  <td>₹{Number(o.total_charge).toFixed(2)}</td>
                  <td><StatusPill status={o.status} /></td>
                  <td style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {o.status === 'Pending' && (
                      <>
                        <button className="btn-small amber" onClick={() => handleAutoAssign(o.id)}>Auto-assign</button>
                        <button className="btn-small" style={{ background: '#eee' }} onClick={() => { setAssignModal(o); setSelectedAgent(''); }}>Manual</button>
                      </>
                    )}
                    <button className="btn-small" style={{ background: '#eee' }} onClick={() => { setOverrideModal(o); setOverrideStatus(o.status); }}>Override</button>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', color: '#999' }}>No orders match these filters.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {assignModal && (
        <div className="modal-overlay" onClick={() => setAssignModal(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3>Assign agent to order #{assignModal.id}</h3>
            <div className="form-group">
              <label>Available agent</label>
              <select value={selectedAgent} onChange={(e) => setSelectedAgent(e.target.value)}>
                <option value="">Select an agent</option>
                {agents.map(a => <option key={a.id} value={a.id}>{a.name} — {a.zone_name || 'Unzoned'}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setAssignModal(null)}>Cancel</button>
              <button className="btn-primary" style={{ flex: 1 }} onClick={handleManualAssign} disabled={!selectedAgent}>Assign</button>
            </div>
          </div>
        </div>
      )}

      {overrideModal && (
        <div className="modal-overlay" onClick={() => setOverrideModal(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3>Override status for order #{overrideModal.id}</h3>
            <div className="form-group">
              <label>New status</label>
              <select value={overrideStatus} onChange={(e) => setOverrideStatus(e.target.value)}>
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setOverrideModal(null)}>Cancel</button>
              <button className="btn-primary" style={{ flex: 1 }} onClick={handleOverride}>Save override</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrdersTab;
