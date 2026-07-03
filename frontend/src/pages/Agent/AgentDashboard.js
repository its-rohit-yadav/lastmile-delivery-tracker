import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import Topbar from '../../components/Topbar';
import StatusPill from '../../components/StatusPill';

const STATUS_FLOW = {
  'Assigned': 'Picked Up',
  'Picked Up': 'In Transit',
  'In Transit': 'Out for Delivery',
  'Out for Delivery': 'Delivered'
};

const AgentDashboard = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState(null);
  const [note, setNote] = useState('');
  const [failMode, setFailMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchOrders = async () => {
    try {
      const res = await api.get('/orders');
      setOrders(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, []);

  const openModal = (order, isFail) => {
    setActiveModal(order);
    setFailMode(isFail);
    setNote('');
  };

  const handleUpdate = async () => {
    setSubmitting(true);
    try {
      const newStatus = failMode ? 'Failed' : STATUS_FLOW[activeModal.status];
      await api.patch(`/orders/${activeModal.id}/status`, { status: newStatus, note });
      setActiveModal(null);
      fetchOrders();
    } catch (err) {
      alert(err.response?.data?.message || 'Update failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const activeOrders = orders.filter(o => !['Delivered', 'Failed'].includes(o.status));
  const completedOrders = orders.filter(o => ['Delivered', 'Failed'].includes(o.status));

  return (
    <div className="app-shell">
      <Topbar />
      <div className="main-content">
        <div className="page-header">
          <h1>Your delivery queue</h1>
          <p>Update status as you progress through each delivery.</p>
        </div>

        <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
          <div className="stat-card">
            <div className="label">Active deliveries</div>
            <div className="value amber">{activeOrders.length}</div>
          </div>
          <div className="stat-card">
            <div className="label">Completed today</div>
            <div className="value success">{completedOrders.length}</div>
          </div>
        </div>

        {loading ? <p>Loading...</p> : activeOrders.length === 0 ? (
          <div className="card empty-state">
            <div className="icon">🚚</div>
            <p>No active deliveries assigned right now.</p>
          </div>
        ) : (
          <div className="table-wrap" style={{ marginBottom: 28 }}>
            <table>
              <thead><tr><th>Order</th><th>Drop address</th><th>Type</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {activeOrders.map(o => (
                  <tr key={o.id}>
                    <td>#{o.id}</td>
                    <td>{o.drop_address}</td>
                    <td>{o.payment_type}</td>
                    <td><StatusPill status={o.status} /></td>
                    <td style={{ display: 'flex', gap: 6 }}>
                      {STATUS_FLOW[o.status] && (
                        <button className="btn-small success" onClick={() => openModal(o, false)}>
                          Mark {STATUS_FLOW[o.status]}
                        </button>
                      )}
                      <button className="btn-small danger" onClick={() => openModal(o, true)}>Mark Failed</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <h3 style={{ marginBottom: 14 }}>Delivery history</h3>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Order</th><th>Drop address</th><th>Status</th></tr></thead>
            <tbody>
              {completedOrders.map(o => (
                <tr key={o.id}>
                  <td>#{o.id}</td>
                  <td>{o.drop_address}</td>
                  <td><StatusPill status={o.status} /></td>
                </tr>
              ))}
              {completedOrders.length === 0 && <tr><td colSpan={3} style={{ textAlign: 'center', color: '#999' }}>No completed deliveries yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {activeModal && (
        <div className="modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3>{failMode ? `Mark order #${activeModal.id} as Failed` : `Update order #${activeModal.id}`}</h3>
            <div className="form-group">
              <label>{failMode ? 'Reason for failure' : 'Note (optional)'}</label>
              <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder={failMode ? 'Customer unavailable at address' : 'Any additional detail'} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setActiveModal(null)}>Cancel</button>
              <button className="btn-primary" style={{ flex: 1 }} onClick={handleUpdate} disabled={submitting}>
                {submitting ? 'Updating...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentDashboard;
