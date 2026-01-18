# Low-Level Design (LLD)

## 1. Database Schema

### Entity Relationship Diagram

```
┌─────────────────┐       ┌────────────────────┐       ┌──────────────────┐
│     flights     │       │     bookings       │       │ timeline_events  │
├─────────────────┤       ├────────────────────┤       ├──────────────────┤
│ PK flight_id    │       │ PK id              │       │ PK id            │
│    flight_number│       │ UK ref_id          │◄──────│ FK booking_ref_id│
│    airline_name │       │    origin          │       │    event_type    │
│    departure_dt │       │    destination     │       │    location      │
│    arrival_dt   │       │    pieces          │       │ FK flight_id     │────┐
│    origin       │       │    weight_kg       │       │    timestamp     │    │
│    destination  │       │    status          │       └──────────────────┘    │
└─────────────────┘       │    created_at      │                               │
         ▲                │    updated_at      │                               │
         │                │    version         │                               │
         └────────────────┴────────────────────┴───────────────────────────────┘
```

### Table: flights

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| flight_id | TEXT | PRIMARY KEY | Unique flight ID (FL0000001) |
| flight_number | TEXT | NOT NULL | Airline flight code (AI101) |
| airline_name | TEXT | NOT NULL | Carrier name |
| departure_datetime | TEXT | NOT NULL | ISO 8601 departure |
| arrival_datetime | TEXT | NOT NULL | ISO 8601 arrival |
| origin | TEXT | NOT NULL | 3-letter airport code |
| destination | TEXT | NOT NULL | 3-letter airport code |

**Indexes:**
- `idx_flights_origin_dest_date(origin, destination, date(departure_datetime))`
- `idx_flights_origin_date(origin, date(departure_datetime))`

### Table: bookings

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Internal ID |
| ref_id | TEXT | UNIQUE NOT NULL | Human-readable ID (ACB-XXXXXX) |
| origin | TEXT | NOT NULL | Origin airport |
| destination | TEXT | NOT NULL | Destination airport |
| pieces | INTEGER | NOT NULL, CHECK > 0 | Number of cargo pieces |
| weight_kg | INTEGER | NOT NULL, CHECK > 0 | Total weight |
| status | TEXT | NOT NULL | BOOKED/DEPARTED/ARRIVED/DELIVERED/CANCELLED |
| created_at | TEXT | NOT NULL | ISO 8601 creation time |
| updated_at | TEXT | NOT NULL | ISO 8601 last update |
| version | INTEGER | NOT NULL DEFAULT 1 | Optimistic lock version |

**Indexes:**
- `idx_bookings_ref_id(ref_id)` - UNIQUE
- `idx_bookings_status(status)`

### Table: timeline_events

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Event ID |
| booking_ref_id | TEXT | FK → bookings.ref_id | Parent booking |
| event_type | TEXT | NOT NULL | CREATED/DEPARTED/ARRIVED/DELIVERED/CANCELLED |
| location | TEXT | NULL | Airport/location code |
| flight_id | TEXT | FK → flights.flight_id | Optional flight reference |
| timestamp | TEXT | NOT NULL | ISO 8601 event time |

**Indexes:**
- `idx_timeline_booking_time(booking_ref_id, timestamp)`

---

## 2. Booking State Machine

### State Diagram

```
                    ┌─────────────┐
                    │   BOOKED    │
                    └──────┬──────┘
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
       ┌─────────────┐           ┌─────────────┐
       │  DEPARTED   │           │  CANCELLED  │◄────┐
       └──────┬──────┘           └─────────────┘     │
              │                                       │
              ├───────────────────────────────────────┘
              ▼
       ┌─────────────┐
       │   ARRIVED   │  ← Cannot cancel after this point
       └──────┬──────┘
              │
              ▼
       ┌─────────────┐
       │  DELIVERED  │
       └─────────────┘
```

### Transition Rules

```javascript
const validTransitions = {
    BOOKED:    ['DEPARTED', 'CANCELLED'],
    DEPARTED:  ['ARRIVED', 'CANCELLED'],
    ARRIVED:   ['DELIVERED'],           // No cancel allowed
    DELIVERED: [],                       // Terminal
    CANCELLED: []                        // Terminal
};
```

### Idempotency
- Cancel operation is idempotent
- If booking is already CANCELLED, return success without modification

---

## 3. Route Search Algorithm

### Direct Flight Query
```sql
SELECT * FROM flights 
WHERE origin = ?
  AND destination = ?
  AND date(departure_datetime) = date(?)
ORDER BY departure_datetime
```

### 1-Transit Route Algorithm

```
function findBestTransitRoute(origin, destination, date):
    firstHopFlights = getFlightsFromOrigin(origin, date)
    bestRoute = null
    shortestTime = Infinity
    
    for each firstHop in firstHopFlights:
        if firstHop.destination == destination:
            continue  // Skip direct flights
        
        intermediate = firstHop.destination
        arrivalTime = firstHop.arrival_datetime
        nextDayEnd = arrivalTime + 1 day (23:59:59)
        
        connectingFlights = getConnectingFlights(
            origin=intermediate,
            destination=destination,
            after=arrivalTime,
            before=nextDayEnd
        )
        
        for each secondHop in connectingFlights:
            connectionTime = secondHop.departure - firstHop.arrival
            
            if connectionTime < 1 hour:
                continue  // Minimum connection time
            
            totalTime = secondHop.arrival - firstHop.departure
            
            if totalTime < shortestTime:
                shortestTime = totalTime
                bestRoute = { firstHop, secondHop, intermediate }
    
    return bestRoute
```

### Transit Rules
1. Second hop must depart on **same day or next day** of first hop arrival
2. Minimum **1 hour** connection time required
3. Return **only the best** (shortest total time) transit option

---

## 4. Concurrency Control

### Optimistic Locking Pattern

```sql
-- Read with version
SELECT * FROM bookings WHERE ref_id = ?;
-- Returns: { id: 1, ref_id: 'ACB-ABC123', status: 'BOOKED', version: 1 }

-- Update with version check
UPDATE bookings 
SET status = ?, updated_at = ?, version = version + 1
WHERE ref_id = ? AND version = ?;
-- If 0 rows affected → Concurrent modification detected
```

### Transaction Wrapper

```javascript
function transitionStatus(refId, newStatus, sideEffect) {
    return db.transaction(() => {
        // 1. Read current state
        const booking = bookingRepository.getByRefId(refId);
        
        // 2. Validate transition
        if (!isValidTransition(booking.status, newStatus)) {
            throw new Error('Invalid state transition');
        }
        
        // 3. Update with version check
        const updated = bookingRepository.updateStatus(
            refId, newStatus, booking.version
        );
        
        if (!updated) {
            throw new Error('Concurrent update detected');
        }
        
        // 4. Execute side effect (timeline event)
        if (sideEffect) sideEffect();
        
        return updated;
    })();
}
```

---

## 5. Reference ID Generation

### Format
```
ACB-XXXXXX
│   │
│   └── 6 alphanumeric characters (excluding confusing: 0,1,I,O)
└────── Prefix: Air Cargo Booking
```

### Character Set
```
ABCDEFGHJKLMNPQRSTUVWXYZ23456789
```

### Collision Probability
- 32^6 = ~1 billion possible IDs
- With 50K bookings/day: ~18M/year
- Collision probability remains negligible

---

## 6. API Request/Response Format

### Create Booking

**Request:**
```json
POST /api/bookings
{
    "origin": "DEL",
    "destination": "BOM",
    "pieces": 5,
    "weight_kg": 150
}
```

**Response:**
```json
{
    "success": true,
    "data": {
        "id": 1,
        "ref_id": "ACB-XK9M2P",
        "origin": "DEL",
        "destination": "BOM",
        "pieces": 5,
        "weight_kg": 150,
        "status": "BOOKED",
        "created_at": "2026-01-18T12:00:00.000Z",
        "updated_at": "2026-01-18T12:00:00.000Z",
        "version": 1
    }
}
```

### Get Booking with Timeline

**Response:**
```json
{
    "success": true,
    "data": {
        "booking": { /* booking fields */ },
        "timeline": [
            {
                "id": 1,
                "event_type": "CREATED",
                "location": "DEL",
                "timestamp": "2026-01-18T12:00:00.000Z"
            },
            {
                "id": 2,
                "event_type": "DEPARTED",
                "location": "DEL",
                "flight_id": "FL0001234",
                "flight_number": "AI101",
                "timestamp": "2026-01-18T14:00:00.000Z"
            }
        ]
    }
}
```

---

## 7. Error Handling

### HTTP Status Codes

| Status | Condition |
|--------|-----------|
| 200 | Success |
| 201 | Created |
| 400 | Validation error |
| 404 | Not found |
| 409 | Conflict (invalid transition, concurrent update) |
| 500 | Server error |

### Error Response Format
```json
{
    "success": false,
    "error": "Cannot cancel booking after arrival"
}
```
