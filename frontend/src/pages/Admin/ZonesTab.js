import React, { useEffect, useState } from 'react';
import api from '../../utils/api';

const ZonesTab = () => {
  const [zones, setZones] = useState([]);
  const [areas, setAreas] = useState([]);
  const [zoneForm, setZoneForm] = useState({ name: '', description: '' });
  const [areaForm, setAreaForm] = useState({ zoneId: '', name: '', pincode: '' });
  const [error, setError] = useState('');

  const fetchData = async () => {
    const [z, a] = await Promise.all([api.get('/admin/zones'), api.get('/admin/areas')]);
    setZones(z.data);
    setAreas(a.data);
  };

  useEffect(() => { fetchData(); }, []);

  const handleAddZone = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/admin/zones', zoneForm);
      setZoneForm({ name: '', description: '' });
      fetchData();
    } catch (err) {
      setError('Failed to create zone.');
    }
  };

  const handleAddArea = async (e) => {
    e.preventDefault();
    setError('');
    if (!areaForm.zoneId) { setError('Select a zone for the area.'); return; }
    try {
      await api.post('/admin/areas', areaForm);
      setAreaForm({ zoneId: '', name: '', pincode: '' });
      fetchData();
    } catch (err) {
      setError('Failed to add area.');
    }
  };

  const handleDeleteZone = async (id) => {
    if (!window.confirm('Delete this zone? This also affects linked areas and rate cards.')) return;
    await api.delete(`/admin/zones/${id}`);
    fetchData();
  };

  const handleDeleteArea = async (id) => {
    await api.delete(`/admin/areas/${id}`);
    fetchData();
  };

  return (
    <div>
      {error && <div className="error-banner">{error}</div>}

      <div className="form-row" style={{ alignItems: 'flex-start', marginBottom: 28 }}>
        <div className="card">
          <h3 style={{ marginBottom: 14 }}>Add zone</h3>
          <form onSubmit={handleAddZone}>
            <div className="form-group">
              <label>Zone name</label>
              <input value={zoneForm.name} onChange={(e) => setZoneForm({ ...zoneForm, name: e.target.value })} placeholder="e.g. Bengaluru Central" required />
            </div>
            <div className="form-group">
              <label>Description (optional)</label>
              <input value={zoneForm.description} onChange={(e) => setZoneForm({ ...zoneForm, description: e.target.value })} placeholder="Covers MG Road, Indiranagar" />
            </div>
            <button className="btn-primary" type="submit">Add zone</button>
          </form>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: 14 }}>Add area to zone</h3>
          <form onSubmit={handleAddArea}>
            <div className="form-group">
              <label>Zone</label>
              <select value={areaForm.zoneId} onChange={(e) => setAreaForm({ ...areaForm, zoneId: e.target.value })} required>
                <option value="">Select zone</option>
                {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Area name</label>
              <input value={areaForm.name} onChange={(e) => setAreaForm({ ...areaForm, name: e.target.value })} placeholder="e.g. Indiranagar" required />
            </div>
            <div className="form-group">
              <label>Pincode</label>
              <input value={areaForm.pincode} onChange={(e) => setAreaForm({ ...areaForm, pincode: e.target.value })} placeholder="560038" required />
            </div>
            <button className="btn-primary" type="submit">Add area</button>
          </form>
        </div>
      </div>

      <h3 style={{ marginBottom: 14 }}>All zones</h3>
      <div className="table-wrap" style={{ marginBottom: 28 }}>
        <table>
          <thead><tr><th>Zone</th><th>Description</th><th></th></tr></thead>
          <tbody>
            {zones.map(z => (
              <tr key={z.id}>
                <td>{z.name}</td>
                <td>{z.description || '—'}</td>
                <td><button className="btn-small danger" onClick={() => handleDeleteZone(z.id)}>Delete</button></td>
              </tr>
            ))}
            {zones.length === 0 && <tr><td colSpan={3} style={{ textAlign: 'center', color: '#999' }}>No zones yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <h3 style={{ marginBottom: 14 }}>All areas</h3>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Area</th><th>Pincode</th><th>Zone</th><th></th></tr></thead>
          <tbody>
            {areas.map(a => (
              <tr key={a.id}>
                <td>{a.name}</td>
                <td>{a.pincode}</td>
                <td>{a.zone_name}</td>
                <td><button className="btn-small danger" onClick={() => handleDeleteArea(a.id)}>Delete</button></td>
              </tr>
            ))}
            {areas.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', color: '#999' }}>No areas yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ZonesTab;
