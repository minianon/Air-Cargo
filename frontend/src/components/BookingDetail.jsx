import { useState } from 'react';
import { bookingApi } from '../services/api';
import Timeline from './Timeline';

function BookingDetail({ bookingData, onBookingUpdated, onError }) {
  const [loading, setLoading] = useState(null);
  const { booking, timeline } = bookingData;

  const getStatusClass = (status) => {
    return `status-badge status-badge--${status.toLowerCase()}`;
  };

  const handleAction = async (action) => {
    setLoading(action);
    try {
      let response;
      switch (action) {
        case 'depart':
          response = await bookingApi.depart(booking.ref_id, { location: booking.origin });
          break;
        case 'arrive':
          response = await bookingApi.arrive(booking.ref_id, { location: booking.destination });
          break;
        case 'deliver':
          response = await bookingApi.deliver(booking.ref_id, { location: booking.destination });
          break;
        case 'cancel':
          if (!window.confirm('Are you sure you want to cancel this booking?')) {
            setLoading(null);
            return;
          }
          response = await bookingApi.cancel(booking.ref_id);
          break;
        default:
          return;
      }

      if (response.success) {
        onBookingUpdated(response.data);
      }
    } catch (err) {
      onError(err.message || `Failed to ${action} booking`);
    } finally {
      setLoading(null);
    }
  };

  const canDepart = booking.status === 'BOOKED';
  const canArrive = booking.status === 'DEPARTED';
  const canDeliver = booking.status === 'ARRIVED';
  const canCancel = ['BOOKED', 'DEPARTED'].includes(booking.status);

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="card">
      <div className="card__header">
        <h2 className="card__title">
          <div className="card__title-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
            </svg>
          </div>
          Booking Details
        </h2>
        <span className={getStatusClass(booking.status)}>
          <span className="status-badge__dot"></span>
          {booking.status}
        </span>
      </div>

      {/* Booking Info Grid */}
      <div className="booking-info">
        <div className="booking-info__item">
          <div className="booking-info__label">Reference ID</div>
          <div className="booking-info__value" style={{ fontFamily: 'monospace' }}>
            {booking.ref_id}
          </div>
        </div>
        <div className="booking-info__item">
          <div className="booking-info__label">Route</div>
          <div className="booking-info__value">
            {booking.origin} &rarr; {booking.destination}
          </div>
        </div>
        <div className="booking-info__item">
          <div className="booking-info__label">Pieces</div>
          <div className="booking-info__value">{booking.pieces}</div>
        </div>
        <div className="booking-info__item">
          <div className="booking-info__label">Weight</div>
          <div className="booking-info__value">{booking.weight_kg} kg</div>
        </div>
        <div className="booking-info__item">
          <div className="booking-info__label">Created</div>
          <div className="booking-info__value" style={{ fontSize: '0.875rem' }}>
            {formatDate(booking.created_at)}
          </div>
        </div>
        <div className="booking-info__item">
          <div className="booking-info__label">Last Updated</div>
          <div className="booking-info__value" style={{ fontSize: '0.875rem' }}>
            {formatDate(booking.updated_at)}
          </div>
        </div>
      </div>

      {/* Timeline Section */}
      <div className="mt-6">
        <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: 'var(--color-neutral-300)' }}>
          Shipment Timeline
        </h3>
        <Timeline events={timeline} />
      </div>

      {/* Action Buttons */}
      {(canDepart || canArrive || canDeliver || canCancel) && (
        <div className="actions-bar">
          {canDepart && (
            <button 
              className="btn btn--warning"
              onClick={() => handleAction('depart')}
              disabled={loading}
            >
              {loading === 'depart' ? <span className="spinner"></span> : 'Depart'}
            </button>
          )}
          {canArrive && (
            <button 
              className="btn btn--success"
              onClick={() => handleAction('arrive')}
              disabled={loading}
            >
              {loading === 'arrive' ? <span className="spinner"></span> : 'Arrive'}
            </button>
          )}
          {canDeliver && (
            <button 
              className="btn btn--success"
              onClick={() => handleAction('deliver')}
              disabled={loading}
            >
              {loading === 'deliver' ? <span className="spinner"></span> : 'Deliver'}
            </button>
          )}
          {canCancel && (
            <button 
              className="btn btn--danger"
              onClick={() => handleAction('cancel')}
              disabled={loading}
              style={{ marginLeft: 'auto' }}
            >
              {loading === 'cancel' ? <span className="spinner"></span> : 'Cancel'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default BookingDetail;
