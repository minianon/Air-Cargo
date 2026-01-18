import { useState, useEffect } from 'react';
import { routeApi } from '../services/api';

const AIRPORTS = [
  'DEL', 'BOM', 'BLR', 'HYD', 'MAA', 'CCU', 'GOI', 'COK', 'AMD', 'PNQ',
  'DXB', 'SIN', 'LHR', 'FRA', 'DOH', 'JFK', 'LAX', 'SFO', 'ORD', 'CDG'
];

function RouteSearch({ onError }) {
  const [formData, setFormData] = useState({
    origin: '',
    destination: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [loading, setLoading] = useState(false);
  const [routes, setRoutes] = useState(null);
  const [airports, setAirports] = useState(AIRPORTS);

  useEffect(() => {
    routeApi.getAirports()
      .then(res => {
        if (res.data && res.data.length > 0) {
          setAirports(res.data);
        }
      })
      .catch(() => {});
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.origin || !formData.destination || !formData.date) {
      onError('Please fill in all fields');
      return;
    }

    if (formData.origin === formData.destination) {
      onError('Origin and destination cannot be the same');
      return;
    }

    setLoading(true);
    try {
      const response = await routeApi.search(
        formData.origin,
        formData.destination,
        formData.date
      );

      if (response.success) {
        setRoutes(response.data);
      }
    } catch (err) {
      onError(err.message || 'Failed to search routes');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateStr) => {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="grid grid--2">
      <div className="card">
        <div className="card__header">
          <h2 className="card__title">
            <div className="card__title-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
            </div>
            Search Routes
          </h2>
        </div>

        <form className="form" onSubmit={handleSubmit}>
          <div className="form__group">
            <label className="form__label" htmlFor="route-origin">From</label>
            <select
              id="route-origin"
              name="origin"
              className="form__select"
              value={formData.origin}
              onChange={handleChange}
            >
              <option value="">Select origin</option>
              {airports.map(code => (
                <option key={code} value={code}>{code}</option>
              ))}
            </select>
          </div>

          <div className="form__group">
            <label className="form__label" htmlFor="route-destination">To</label>
            <select
              id="route-destination"
              name="destination"
              className="form__select"
              value={formData.destination}
              onChange={handleChange}
            >
              <option value="">Select destination</option>
              {airports.map(code => (
                <option key={code} value={code}>{code}</option>
              ))}
            </select>
          </div>

          <div className="form__group">
            <label className="form__label" htmlFor="route-date">Departure Date</label>
            <input
              type="date"
              id="route-date"
              name="date"
              className="form__input"
              value={formData.date}
              onChange={handleChange}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          <button 
            type="submit" 
            className="btn btn--primary btn--lg"
            disabled={loading}
            style={{ width: '100%' }}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Searching...
              </>
            ) : (
              'Search Routes'
            )}
          </button>
        </form>
      </div>

      <div className="card">
        <div className="card__header">
          <h2 className="card__title">
            Available Routes
          </h2>
        </div>

        {!routes ? (
          <div className="empty-state">
            <div className="empty-state__icon">--</div>
            <p className="empty-state__text">
              Search for available routes
            </p>
          </div>
        ) : (
          <div>
            {/* Direct Flights */}
            {routes.directFlights && routes.directFlights.length > 0 && (
              <div className="mb-6">
                <h4 style={{ fontSize: '0.875rem', color: 'var(--color-neutral-400)', marginBottom: '1rem' }}>
                  Direct Flights ({routes.directFlights.length})
                </h4>
                {routes.directFlights.slice(0, 5).map((flight, idx) => (
                  <div key={flight.flight_id || idx} className="route-card">
                    <div className="route-card__header">
                      <div className="route-card__airports">
                        <span>{flight.origin}</span>
                        <span className="route-card__arrow">&rarr;</span>
                        <span>{flight.destination}</span>
                      </div>
                      <span className="route-card__type">Direct</span>
                    </div>
                    <div className="route-card__details">
                      <div className="route-card__detail">
                        Flight: {flight.flight_number}
                      </div>
                      <div className="route-card__detail">
                        Airline: {flight.airline_name}
                      </div>
                      <div className="route-card__detail">
                        Time: {formatTime(flight.departure_datetime)} - {formatTime(flight.arrival_datetime)}
                      </div>
                    </div>
                  </div>
                ))}
                {routes.directFlights.length > 5 && (
                  <p className="text-sm text-muted text-center mt-4">
                    +{routes.directFlights.length - 5} more direct flights
                  </p>
                )}
              </div>
            )}

            {/* Transit Route */}
            {routes.transitRoute && (
              <div>
                <h4 style={{ fontSize: '0.875rem', color: 'var(--color-neutral-400)', marginBottom: '1rem' }}>
                  Best 1-Stop Route
                </h4>
                <div className="route-card" style={{ borderColor: 'var(--color-accent-purple)' }}>
                  <div className="route-card__header">
                    <div className="route-card__airports">
                      <span>{routes.transitRoute.firstHop.origin}</span>
                      <span className="route-card__arrow">&rarr;</span>
                      <span style={{ color: 'var(--color-accent-purple)' }}>
                        {routes.transitRoute.intermediate}
                      </span>
                      <span className="route-card__arrow">&rarr;</span>
                      <span>{routes.transitRoute.secondHop.destination}</span>
                    </div>
                    <span className="route-card__type" style={{ background: 'var(--color-accent-purple)', color: 'white' }}>
                      1 Stop
                    </span>
                  </div>

                  {/* First Leg */}
                  <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    <div className="text-sm text-muted mb-2">Leg 1</div>
                    <div className="route-card__details">
                      <div className="route-card__detail">
                        Flight: {routes.transitRoute.firstHop.flight_number}
                      </div>
                      <div className="route-card__detail">
                        Time: {formatTime(routes.transitRoute.firstHop.departure_datetime)} - {formatTime(routes.transitRoute.firstHop.arrival_datetime)}
                      </div>
                    </div>
                  </div>

                  {/* Connection */}
                  <div style={{ margin: '0.5rem 0', padding: '0.5rem', background: 'rgba(139, 92, 246, 0.1)', borderRadius: '0.5rem', fontSize: '0.875rem' }}>
                    Connection at {routes.transitRoute.intermediate}: {routes.transitRoute.connectionTimeMinutes} min
                  </div>

                  {/* Second Leg */}
                  <div>
                    <div className="text-sm text-muted mb-2">Leg 2</div>
                    <div className="route-card__details">
                      <div className="route-card__detail">
                        Flight: {routes.transitRoute.secondHop.flight_number}
                      </div>
                      <div className="route-card__detail">
                        Date: {formatDate(routes.transitRoute.secondHop.departure_datetime)}
                      </div>
                      <div className="route-card__detail">
                        Time: {formatTime(routes.transitRoute.secondHop.departure_datetime)} - {formatTime(routes.transitRoute.secondHop.arrival_datetime)}
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: '1rem', fontSize: '0.875rem', color: 'var(--color-primary-400)' }}>
                    Total time: {Math.floor(routes.transitRoute.totalTravelTimeMinutes / 60)}h {routes.transitRoute.totalTravelTimeMinutes % 60}m
                  </div>
                </div>
              </div>
            )}

            {/* No Routes Found */}
            {(!routes.directFlights || routes.directFlights.length === 0) && !routes.transitRoute && (
              <div className="empty-state">
                <div className="empty-state__icon">--</div>
                <p className="empty-state__text">
                  No routes found for this search
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default RouteSearch;
