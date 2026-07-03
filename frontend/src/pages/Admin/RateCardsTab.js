import React, { useEffect, useState } from 'react';
import api from '../../utils/api';

const initialForm = { fromZoneId: '', toZoneId: '', orderType: 'B2C', ratePerKg: '', minCharge: '', codSurcharge: '' };

const RateCardsTab = () => {
  const [zones, setZones] = useState([]);
  const [cards, setCards] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');

  const fetchData = async () => {
    const [z, c] = await Promise.all([api.get('/admin/zones'), api.get('/admin/rate-cards')]);
    setZones(z.data);
    setCards(c.data);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.fromZoneId || !form.toZoneId) { setError('Select both zones.'); return; }
    try {
      await api.post('/admin/rate-cards', form);
      setForm(initialForm);
      fetchData();
    } catch (err) {
      setError('Failed to create rate card.');
    }
  };

  const handleDelete = async (id) => {
    await api.delete(`/admin/rate-cards/${id}`);
    fetchData();
  };

  return (
    <div>
      {error && <div className="error-banner">{error}</div>}

      <div className="card" style={{ marginBottom: 28 }}>
        <h3 style={{ marginBottom: 14 }}>Add rate card</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>From zone</label>
              <select value={form.fromZoneId} onChange={(e) => setForm({ ...form, fromZoneId: e.target.value })} required>
                <option value="">Select zone</option>
                {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>To zone</label>
              <select value={form.toZoneId} onChange={(e) => setForm({ ...form, toZoneId: e.target.value })} required>
                <option value="">Select zone</option>
                {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Order type</label>
              <select value={form.orderType} onChange={(e) => setForm({ ...form, orderType: e.target.value })}>
                <option value="B2C">B2C</option>
                <option value="B2B">B2B</option>
              </select>
            </div>
            <div className="form-group">
              <label>Rate per kg (₹)</label>
              <input type="number" step="0.01" value={form.ratePerKg} onChange={(e) => setForm({ ...form, ratePerKg: e.target.value })} required />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Minimum charge (₹)</label>
              <input type="number" step="0.01" value={form.minCharge} onChange={(e) => setForm({ ...form, minCharge: e.target.value })} placeholder="0" />
            </div>
            <div className="form-group">
              <label>COD surcharge (₹)</label>
              <input type="number" step="0.01" value={form.codSurcharge} onChange={(e) => setForm({ ...form, codSurcharge: e.target.value })} placeholder="0" />
            </div>
          </div>
          <button className="btn-primary" type="submit">Add rate card</button>
        </form>
      </div>

      <h3 style={{ marginBottom: 14 }}>All rate cards</h3>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Route</th><th>Type</th><th>Rate/kg</th><th>Min charge</th><th>COD surcharge</th><th></th></tr></thead>
          <tbody>
            {cards.map(c => (
              <tr key={c.id}>
                <td>{c.from_zone_name} → {c.to_zone_name}</td>
                <td>{c.order_type}</td>
                <td>₹{Number(c.rate_per_kg).toFixed(2)}</td>
                <td>₹{Number(c.min_charge).toFixed(2)}</td>
                <td>₹{Number(c.cod_surcharge).toFixed(2)}</td>
                <td><button className="btn-small danger" onClick={() => handleDelete(c.id)}>Delete</button></td>
              </tr>
            ))}
            {cards.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', color: '#999' }}>No rate cards configured yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RateCardsTab;
