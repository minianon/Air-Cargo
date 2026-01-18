import { useState, useEffect } from 'react';
import { bookingApi, routeApi } from '../services/api';

// Common airports for dropdown
const AIRPORTS = [
  'DEL', 'BOM', 'BLR', 'HYD', 'MAA', 'CCU', 'GOI', 'COK', 'AMD', 'PNQ',
  'DXB', 'SIN', 'LHR', 'FRA', 'DOH', 'JFK', 'LAX', 'SFO', 'ORD', 'CDG'
];

function CreateBookingForm({ onBookingCreated, onError }) {
  const [formData, setFormData] = useState({
    origin: '',
    destination: '',
    pieces: '',
    weight_kg: ''
  });
  const [loading, setLoading] = useState(false);
  const [airports, setAirports] = useState(AIRPORTS);

  // Try to fetch airports from API
  useEffect(() => {
    routeApi.getAirports()
      .then(res => {
        if (res.data && res.data.length > 0) {
          setAirports(res.data);
        }
      })
      .catch(() => {
        // Use default airports if API fails
      });
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.origin || !formData.destination) {
      onError('Please select origin and destination');
      return;
    }
    if (formData.origin === formData.destination) {
      onError('Origin and destination cannot be the same');
      return;
    }
    if (!formData.pieces || parseInt(formData.pieces) <= 0) {
      onError('Please enter a valid number of pieces');
      return;
    }
    if (!formData.weight_kg || parseInt(formData.weight_kg) <= 0) {
      onError('Please enter a valid weight');
      return;
    }

    setLoading(true);
    try {
      const response = await bookingApi.create({
        origin: formData.origin,
        destination: formData.destination,
        pieces: parseInt(formData.pieces),
        weight_kg: parseInt(formData.weight_kg)
      });

      if (response.success) {
        onBookingCreated(response.data);
        // Reset form
        setFormData({
          origin: '',
          destination: '',
          pieces: '',
          weight_kg: ''
        });
      }
    } catch (err) {
      onError(err.message || 'Failed to create booking');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <div className="card__header">
        <h2 className="card__title">
          <div className="card__title-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M12 5v14M5 12h14"/>
            </svg>
          </div>
          Create New Booking
        </h2>
      </div>

      <form className="form" onSubmit={handleSubmit}>
        <div className="form__row">
          <div className="form__group">
            <label className="form__label" htmlFor="origin">Origin Airport</label>
            <select
              id="origin"
              name="origin"
              className="form__select"
              value={formData.origin}
              onChange={handleChange}
              required
            >
              <option value="">Select origin</option>
              {airports.map(code => (
                <option key={code} value={code}>{code}</option>
              ))}
            </select>
          </div>

          <div className="form__group">
            <label className="form__label" htmlFor="destination">Destination Airport</label>
            <select
              id="destination"
              name="destination"
              className="form__select"
              value={formData.destination}
              onChange={handleChange}
              required
            >
              <option value="">Select destination</option>
              {airports.map(code => (
                <option key={code} value={code}>{code}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form__row">
          <div className="form__group">
            <label className="form__label" htmlFor="pieces">Number of Pieces</label>
            <input
              type="number"
              id="pieces"
              name="pieces"
              className="form__input"
              value={formData.pieces}
              onChange={handleChange}
              min="1"
              placeholder="e.g. 5"
              required
            />
          </div>

          <div className="form__group">
            <label className="form__label" htmlFor="weight_kg">Total Weight (kg)</label>
            <input
              type="number"
              id="weight_kg"
              name="weight_kg"
              className="form__input"
              value={formData.weight_kg}
              onChange={handleChange}
              min="1"
              placeholder="e.g. 150"
              required
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
          <button 
            type="submit" 
            className="btn btn--primary btn--lg"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Creating...
              </>
            ) : (
              'Create Booking'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default CreateBookingForm;
