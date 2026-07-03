import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import Topbar from '../../components/Topbar';
import StatusPill from '../../components/StatusPill';

const CustomerDashboard = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    try {
      const res = await api.get('/orders');
      setOrders(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, []);

  const activeCount = orders.filter(o => !['Delivered', 'Failed'].includes(o.status)).length;
  const deliveredCount = orders.filter(o => o.status === 'Delivered').length;
  const failedCount = orders.filter(o => o.status === 'Failed').length;

  return (
    <div className="app-shell">
      <Topbar />
      <div className="main-content">
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <h1>Your shipments</h1>
            <p>Track and manage every order you've placed.</p>
          </div>
          <Link to="/customer/new-order">
            <button className="btn-primary" style={{ width: 'auto' }}>+ New order</button>
          </Link>
        </div>

        <div className="stat-grid">
          <div className="stat-card">
            <div className="label">Total orders</div>
            <div className="value">{orders.length}</div>
          </div>
          <div className="stat-card">
            <div className="label">In progress</div>
            <div className="value amber">{activeCount}</div>
          </div>
          <div className="stat-card">
            <div className="label">Delivered</div>
            <div className="value success">{deliveredCount}</div>
          </div>
          <div className="stat-card">
            <div className="label">Failed attempts</div>
            <div className="value danger">{failedCount}</div>
          </div>
        </div>

        {loading ? (
          <p>Loading orders...</p>
        ) : orders.length === 0 ? (
          <div className="card empty-state">
            <div className="icon">📦</div>
            <p>You haven't placed any orders yet.</p>
            <div style={{ marginTop: 16 }}>
              <Link to="/customer/new-order"><button className="btn-secondary">Place your first order</button></Link>
            </div>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Route</th>
                  <th>Type</th>
                  <th>Payment</th>
                  <th>Charge</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.id}>
                    <td>#{o.id}</td>
                    <td>{o.pickup_zone} → {o.drop_zone}</td>
                    <td>{o.order_type}</td>
                    <td>{o.payment_type}</td>
                    <td>₹{Number(o.total_charge).toFixed(2)}</td>
                    <td><StatusPill status={o.status} /></td>
                    <td><Link to={`/customer/orders/${o.id}`}><button className="btn-small amber">View</button></Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerDashboard;
