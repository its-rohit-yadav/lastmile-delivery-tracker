import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import Topbar from '../../components/Topbar';

const initialForm = {
  pickupAddress: '', dropAddress: '',
  length: '', breadth: '', height: '', actualWeight: '',
  orderType: 'B2C', paymentType: 'Prepaid'
};

const NewOrder = () => {
  const [form, setForm] = useState(initialForm);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setPreview(null);
  };

  const handlePreview = async () => {
    setError('');
    setPreviewLoading(true);
    try {
      const res = await api.post('/orders/preview-charge', form);
      setPreview(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not calculate charge.');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleConfirm = async () => {
    setSubmitLoading(true);
    setError('');
    try {
      const res = await api.post('/orders', form);
      navigate(`/customer/orders/${res.data.orderId}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to place order.');
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div className="app-shell">
      <Topbar />
      <div className="main-content" style={{ maxWidth: 720 }}>
        <div className="page-header">
          <h1>Place a new order</h1>
          <p>Enter pickup, drop, and package details. Include a 6-digit pincode in each address so we can detect the zone.</p>
        </div>

        {error && <div className="error-banner">{error}</div>}

        <div className="card">
          <div className="form-group">
            <label>Pickup address</label>
            <textarea name="pickupAddress" rows={2} value={form.pickupAddress} onChange={handleChange} placeholder="123 MG Road, Bengaluru, 560001" required />
          </div>
          <div className="form-group">
            <label>Drop address</label>
            <textarea name="dropAddress" rows={2} value={form.dropAddress} onChange={handleChange} placeholder="45 Park Street, Bengaluru, 560034" required />
          </div>

          <div className="form-row-3">
            <div className="form-group">
              <label>Length (cm)</label>
              <input type="number" name="length" value={form.length} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Breadth (cm)</label>
              <input type="number" name="breadth" value={form.breadth} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Height (cm)</label>
              <input type="number" name="height" value={form.height} onChange={handleChange} required />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Actual weight (kg)</label>
              <input type="number" step="0.01" name="actualWeight" value={form.actualWeight} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Order type</label>
              <select name="orderType" value={form.orderType} onChange={handleChange}>
                <option value="B2C">B2C</option>
                <option value="B2B">B2B</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Payment type</label>
            <select name="paymentType" value={form.paymentType} onChange={handleChange}>
              <option value="Prepaid">Prepaid</option>
              <option value="COD">Cash on Delivery</option>
            </select>
          </div>

          <button className="btn-secondary" style={{ width: '100%', marginBottom: 8 }} onClick={handlePreview} disabled={previewLoading} type="button">
            {previewLoading ? 'Calculating...' : 'Calculate charge'}
          </button>

          {preview && (
            <>
              <div className="charge-box">
                 <div className="charge-row"><span>Volumetric weight</span><span>{Number(preview.volumetricWeight).toFixed(2)} kg</span></div>
                <div className="charge-row"><span>Billed weight</span><span>{Number(preview.billedWeight).toFixed(2)} kg</span></div>
                 <div className="charge-row"><span>Delivery charge</span><span>₹{Number(preview.deliveryCharge).toFixed(2)}</span></div>
               {preview.codSurcharge > 0 && <div className="charge-row"><span>COD surcharge</span><span>₹{Number(preview.codSurcharge).toFixed(2)}</span></div>}
                <div className="charge-row total"><span>Total payable</span><span>₹{Number(preview.totalCharge).toFixed(2)}</span></div>
                </div>
              <button className="btn-primary" style={{ marginTop: 16 }} onClick={handleConfirm} disabled={submitLoading}>
                {submitLoading ? 'Placing order...' : 'Confirm & place order'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default NewOrder;
