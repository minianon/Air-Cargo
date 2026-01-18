import { useState, useEffect } from 'react';
import CreateBookingForm from './components/CreateBookingForm';
import SearchBooking from './components/SearchBooking';
import BookingDetail from './components/BookingDetail';
import RouteSearch from './components/RouteSearch';

function App() {
  const [activeTab, setActiveTab] = useState('create');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [notification, setNotification] = useState(null);

  // Clear notification after 5 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
  };

  const handleBookingCreated = (booking) => {
    showNotification(`Booking ${booking.ref_id} created successfully!`);
    setSelectedBooking({ booking, timeline: [] });
    setActiveTab('track');
  };

  const handleBookingFound = (bookingData) => {
    setSelectedBooking(bookingData);
  };

  const handleBookingUpdated = (bookingData) => {
    setSelectedBooking(bookingData);
    showNotification(`Booking updated to ${bookingData.booking.status}`);
  };

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header__logo">
          <div className="header__logo-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>
            </svg>
          </div>
          <div>
            <h1 className="header__title">Air Cargo</h1>
            <p className="header__subtitle">Booking & Tracking System</p>
          </div>
        </div>
      </header>

      {/* Notification */}
      {notification && (
        <div className={`alert alert--${notification.type} fade-in`}>
          {notification.message}
        </div>
      )}

      {/* Navigation Tabs */}
      <nav className="tabs">
        <button 
          className={`tab ${activeTab === 'create' ? 'tab--active' : ''}`}
          onClick={() => setActiveTab('create')}
        >
          Create Booking
        </button>
        <button 
          className={`tab ${activeTab === 'track' ? 'tab--active' : ''}`}
          onClick={() => setActiveTab('track')}
        >
          Track Booking
        </button>
        <button 
          className={`tab ${activeTab === 'routes' ? 'tab--active' : ''}`}
          onClick={() => setActiveTab('routes')}
        >
          Search Routes
        </button>
      </nav>

      {/* Tab Content */}
      <main className="fade-in">
        {activeTab === 'create' && (
          <CreateBookingForm 
            onBookingCreated={handleBookingCreated}
            onError={(msg) => showNotification(msg, 'error')}
          />
        )}

        {activeTab === 'track' && (
          <div className="grid grid--2">
            <div>
              <SearchBooking 
                onBookingFound={handleBookingFound}
                onError={(msg) => showNotification(msg, 'error')}
              />
            </div>
            <div>
              {selectedBooking ? (
                <BookingDetail 
                  bookingData={selectedBooking}
                  onBookingUpdated={handleBookingUpdated}
                  onError={(msg) => showNotification(msg, 'error')}
                />
              ) : (
                <div className="card">
                  <div className="empty-state">
                    <div className="empty-state__icon">--</div>
                    <p className="empty-state__text">
                      Search for a booking to view details
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'routes' && (
          <RouteSearch 
            onError={(msg) => showNotification(msg, 'error')}
          />
        )}
      </main>

      {/* Footer */}
      <footer style={{ 
        marginTop: '3rem', 
        paddingTop: '2rem', 
        borderTop: '1px solid rgba(255,255,255,0.1)',
        textAlign: 'center',
        color: 'var(--color-neutral-500)',
        fontSize: 'var(--font-size-sm)'
      }}>
        <p>Air Cargo Booking & Tracking System</p>
      </footer>
    </div>
  );
}

export default App;
