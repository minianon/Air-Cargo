import { useState } from 'react';
import { bookingApi } from '../services/api';

function SearchBooking({ onBookingFound, onError }) {
  const [refId, setRefId] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const trimmedRefId = refId.trim().toUpperCase();
    
    // Validate format
    if (!trimmedRefId) {
      onError('Please enter a booking reference ID');
      return;
    }

    if (!/^ACB-[A-Z0-9]{6}$/.test(trimmedRefId)) {
      onError('Invalid format. Expected: ACB-XXXXXX');
      return;
    }

    setLoading(true);
    try {
      const response = await bookingApi.get(trimmedRefId);
      
      if (response.success) {
        onBookingFound(response.data);
      }
    } catch (err) {
      onError(err.message || 'Booking not found');
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
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
          </div>
          Search Booking
        </h2>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="search-box">
          <input
            type="text"
            className="form__input"
            value={refId}
            onChange={(e) => setRefId(e.target.value.toUpperCase())}
            placeholder="Enter Booking ID (e.g. ACB-ABC123)"
            maxLength={10}
          />
          <button 
            type="submit" 
            className="btn btn--primary"
            disabled={loading}
          >
            {loading ? <span className="spinner"></span> : 'Search'}
          </button>
        </div>
      </form>

      <div className="mt-4 text-sm text-muted">
        <p>Enter your booking reference ID to track your shipment.</p>
        <p className="mt-4">Format: <code style={{ 
          background: 'rgba(255,255,255,0.1)', 
          padding: '2px 8px', 
          borderRadius: '4px' 
        }}>ACB-XXXXXX</code></p>
      </div>
    </div>
  );
}

export default SearchBooking;
