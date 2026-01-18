function Timeline({ events }) {
  if (!events || events.length === 0) {
    return (
      <div className="empty-state" style={{ padding: '2rem' }}>
        <p className="text-muted">No timeline events yet</p>
      </div>
    );
  }

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getEventLabel = (eventType) => {
    const labels = {
      'CREATED': 'Created',
      'DEPARTED': 'Departed',
      'ARRIVED': 'Arrived',
      'DELIVERED': 'Delivered',
      'CANCELLED': 'Cancelled'
    };
    return labels[eventType] || eventType;
  };

  return (
    <div className="timeline">
      {events.map((event, index) => (
        <div 
          key={event.id || index} 
          className={`timeline__item timeline__item--${event.event_type.toLowerCase()} slide-in`}
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <div className="timeline__dot"></div>
          <div className="timeline__event">
            {getEventLabel(event.event_type)}
          </div>
          {event.location && (
            <div className="timeline__location">
              Location: {event.location}
            </div>
          )}
          {event.flight_number && (
            <div className="timeline__flight">
              Flight: {event.flight_number} ({event.airline_name || 'N/A'})
            </div>
          )}
          <div className="timeline__time">
            {formatDate(event.timestamp)}
          </div>
        </div>
      ))}
    </div>
  );
}

export default Timeline;
