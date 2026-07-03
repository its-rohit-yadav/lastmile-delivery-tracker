import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../utils/api';
import Topbar from '../../components/Topbar';
import StatusPill from '../../components/StatusPill';

const OrderDetail = () => {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduling, setRescheduling] = useState(false);
  const [msg, setMsg] = useState('');

  const fetchOrder = async () => {
    try {
      const res = await api.get(`/orders/${id}`);
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrder(); }, [id]);

  const handleReschedule = async () => {
    if (!rescheduleDate) return;
    setRescheduling(true);
    setMsg('');
    try {
      await api.patch(`/orders/${id}/reschedule`, { newDate: rescheduleDate });
      setMsg('Reschedule request submitted.');
      fetchOrder();
    } catch (err) {
      setMsg(err.response?.data?.message || 'Failed to reschedule.');
    } finally {
      setRescheduling(false);
    }
  };

  if (loading) return <div className="app-shell"><Topbar /><div className="main-content">Loading...</div></div>;
  if (!data) return <div className="app-shell"><Topbar /><div className="main-content">Order not found.</div></div>;

  const { order, tracking } = data;

  return (
    <div className="app-shell">
      <Topbar />
      <div className="main-content" style={{ maxWidth: 800 }}>
        <div className="page-header">
          <h1>Order #{order.id}</h1>
          <p>{order.pickup_zone} → {order.drop_zone} &middot; <StatusPill status={order.status} /></p>
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <div className="form-row">
            <div><strong style={{ fontSize: 12, color: '#5a6478' }}>PICKUP</strong><p style={{ marginTop: 4 }}>{order.pickup_address}</p></div>
            <div><strong style={{ fontSize: 12, color: '#5a6478' }}>DROP</strong><p style={{ marginTop: 4 }}>{order.drop_address}</p></div>
          </div>
          <hr style={{ margin: '16px 0', border: 'none', borderTop: '1px solid #e3e6ef' }} />
          <div className="form-row-3">
            <div><strong style={{ fontSize: 12, color: '#5a6478' }}>BILLED WEIGHT</strong><p>{order.billed_weight} kg</p></div>
            <div><strong style={{ fontSize: 12, color: '#5a6478' }}>ORDER TYPE</strong><p>{order.order_type}</p></div>
            <div><strong style={{ fontSize: 12, color: '#5a6478' }}>TOTAL CHARGE</strong><p>₹{Number(order.total_charge).toFixed(2)}</p></div>
          </div>
        </div>

        {order.status === 'Failed' && (
          <div className="card" style={{ marginBottom: 20, borderColor: '#d6483a' }}>
            <h3 style={{ marginBottom: 10 }}>Delivery failed — reschedule</h3>
            {msg && <div className="success-banner">{msg}</div>}
            <div className="form-row">
              <input type="date" value={rescheduleDate} onChange={(e) => setRescheduleDate(e.target.value)} min={new Date().toISOString().split('T')[0]} />
              <button className="btn-primary" onClick={handleReschedule} disabled={rescheduling || !rescheduleDate}>
                {rescheduling ? 'Submitting...' : 'Reschedule delivery'}
              </button>
            </div>
          </div>
        )}

        <div className="card">
          <h3 style={{ marginBottom: 18 }}>Tracking timeline</h3>
          <div className="timeline">
            {tracking.map((t, idx) => (
              <div key={t.id} className={`timeline-item ${idx < tracking.length - 1 ? 'done' : ''}`}>
                <div className="timeline-dot"></div>
                <div className="timeline-content">
                  <div className="status-name">{t.status}</div>
                  <div className="meta">{new Date(t.created_at).toLocaleString()} &middot; by {t.actor_name || 'system'} ({t.actor_role})</div>
                  {t.note && <div className="note">{t.note}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetail;
