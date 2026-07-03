import React, { useEffect, useState } from 'react';
import api from '../../utils/api';

const initialForm = { name: '', email: '', password: '', phone: '', zoneId: '' };

const AgentsTab = () => {
  const [zones, setZones] = useState([]);
  const [agents, setAgents] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchData = async () => {
    const [z, a] = await Promise.all([api.get('/admin/zones'), api.get('/admin/agents')]);
    setZones(z.data);
    setAgents(a.data);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    try {
      await api.post('/admin/agents', form);
      setSuccess('Agent account created.');
      setForm(initialForm);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create agent.');
    }
  };

  return (
    <div>
      {error && <div className="error-banner">{error}</div>}
      {success && <div className="success-banner">{success}</div>}

      <div className="card" style={{ marginBottom: 28, maxWidth: 480 }}>
        <h3 style={{ marginBottom: 14 }}>Add delivery agent</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Full name</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Phone</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} />
            </div>
          </div>
          <div className="form-group">
            <label>Assigned zone</label>
            <select value={form.zoneId} onChange={(e) => setForm({ ...form, zoneId: e.target.value })}>
              <option value="">Unzoned</option>
              {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
            </select>
          </div>
          <button className="btn-primary" type="submit">Create agent</button>
        </form>
      </div>

      <h3 style={{ marginBottom: 14 }}>All agents</h3>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>Zone</th><th>Availability</th></tr></thead>
          <tbody>
            {agents.map(a => (
              <tr key={a.id}>
                <td>{a.name}</td>
                <td>{a.email}</td>
                <td>{a.zone_name || 'Unzoned'}</td>
                <td>
                  <span className={`status-pill ${a.is_available ? 'status-delivered' : 'status-failed'}`}>
                    {a.is_available ? 'Available' : 'On delivery'}
                  </span>
                </td>
              </tr>
            ))}
            {agents.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', color: '#999' }}>No agents added yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AgentsTab;
