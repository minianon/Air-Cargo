# High-Level Design (HLD)

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                           Frontend                                   │
│                     React + Vite (Port 5173)                        │
│   ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐               │
│   │ Create  │  │ Search  │  │ Booking │  │  Route  │               │
│   │ Booking │  │ Booking │  │ Detail  │  │ Search  │               │
│   └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘               │
│        └────────────┴────────────┴────────────┘                     │
│                           │                                          │
│                    API Service Layer                                 │
└───────────────────────────┼──────────────────────────────────────────┘
                            │ HTTP/REST
┌───────────────────────────┼──────────────────────────────────────────┐
│                    Backend (Port 3001)                               │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                      Express.js Server                        │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐           │   │
│  │  │   Request   │  │    CORS     │  │    Error    │           │   │
│  │  │   Logger    │──│   Handler   │──│   Handler   │           │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘           │   │
│  └──────────────────────────┬───────────────────────────────────┘   │
│                             │                                        │
│  ┌──────────────────────────┼───────────────────────────────────┐   │
│  │                    Controller Layer                           │   │
│  │     ┌───────────────┐       ┌───────────────┐                │   │
│  │     │    Route      │       │   Booking     │                │   │
│  │     │  Controller   │       │  Controller   │                │   │
│  │     └───────┬───────┘       └───────┬───────┘                │   │
│  └─────────────┼───────────────────────┼────────────────────────┘   │
│                │                       │                             │
│  ┌─────────────┼───────────────────────┼────────────────────────┐   │
│  │                    Service Layer                              │   │
│  │  ┌──────────┴──────────┐  ┌────────┴────────┐  ┌──────────┐  │   │
│  │  │   Route Service     │  │ Booking Service │  │ Timeline │  │   │
│  │  │ - Direct flights    │  │ - State machine │  │ Service  │  │   │
│  │  │ - Transit routes    │  │ - Atomic ops    │  │ - Events │  │   │
│  │  └─────────┬───────────┘  └────────┬────────┘  └────┬─────┘  │   │
│  └────────────┼───────────────────────┼────────────────┼────────┘   │
│               │                       │                │             │
│  ┌────────────┼───────────────────────┼────────────────┼────────┐   │
│  │                   Repository Layer                            │   │
│  │  ┌─────────┴───────┐  ┌────────┴───────┐  ┌─────────┴──────┐ │   │
│  │  │     Flight      │  │    Booking     │  │    Timeline    │ │   │
│  │  │   Repository    │  │   Repository   │  │   Repository   │ │   │
│  │  └─────────────────┘  └────────────────┘  └────────────────┘ │   │
│  └──────────────────────────────┬───────────────────────────────┘   │
│                                 │                                    │
│  ┌──────────────────────────────┴───────────────────────────────┐   │
│  │                    SQLite Database                            │   │
│  │  ┌─────────┐  ┌───────────┐  ┌────────────────┐              │   │
│  │  │ flights │  │ bookings  │  │ timeline_events │              │   │
│  │  │ ~100K   │  │   CRUD    │  │   Immutable     │              │   │
│  │  └─────────┘  └───────────┘  └────────────────┘              │   │
│  └──────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Component Description

### Frontend
- **React SPA**: Single-page application with tab-based navigation
- **Components**: CreateBookingForm, SearchBooking, BookingDetail, Timeline, RouteSearch
- **API Service**: Centralized HTTP client with error handling

### Backend
- **Express.js**: REST API server with middleware pipeline
- **Controllers**: HTTP request handlers, input validation
- **Services**: Business logic, state machine enforcement
- **Repositories**: Database operations with prepared statements
- **SQLite**: File-based database with WAL mode for concurrency

---

## Data Flow

### Create Booking Flow
```
User → CreateBookingForm → API Service → POST /api/bookings
    → BookingController.createBooking()
    → BookingService.createBooking()
        [Transaction Start]
        → BookingRepository.create() → INSERT INTO bookings
        → TimelineService.recordCreated() → INSERT INTO timeline_events
        [Transaction End]
    → Response { booking, timeline }
```

### Route Search Flow
```
User → RouteSearch → API Service → GET /api/routes?origin=DEL&destination=BOM&date=2026-01-20
    → RouteController.searchRoutes()
    → RouteService.findRoutes()
        → FlightRepository.findDirectFlights() ─┐
        → RouteService.findBestTransitRoute()   ├→ Combined Results
            → FlightRepository.findFlightsFromOrigin()
            → FlightRepository.findConnectingFlights()
    → Response { directFlights, transitRoute }
```

---

## Concurrency Control

### Why Optimistic Locking vs Distributed Locks?

The assignment mentions "distributed locks" for concurrency. We deliberately chose **optimistic locking** instead:

| Factor | Distributed Locks | Optimistic Locking ✓ |
|--------|-------------------|---------------------|
| Infrastructure | Requires Redis/external service | Database-native |
| Complexity | High (lock management, timeouts) | Low (version field) |
| Contention | Blocks concurrent access | Allows parallel reads |
| Failure handling | Lock leaks if holder crashes | No cleanup needed |
| Performance | Network round-trips for lock | Single SQL query |

> [!NOTE]
> Optimistic locking is more appropriate for this use case because:
> 1. **Low contention** - Each booking is typically updated by one user at a time
> 2. **Short transactions** - Updates are fast (< 100ms)
> 3. **Simplicity** - No external dependencies required
> 4. **Retry-friendly** - Easy for clients to retry on conflict

### Implementation

```javascript
// Version check in UPDATE query
UPDATE bookings 
SET status = ?, updated_at = ?, version = version + 1
WHERE ref_id = ? AND version = ?;

// If 0 rows affected → Concurrent modification detected → 409 Conflict
```

---

## Caching Strategy

### Route Query Caching

Route searches are read-heavy and flights don't change frequently, making them ideal for caching:

```
┌─────────────┐      Cache Miss      ┌─────────────┐
│   Client    │ ──────────────────→  │   Database  │
│   Request   │                      │   Query     │
└──────┬──────┘                      └──────┬──────┘
       │                                    │
       │         Cache Hit                  ▼
       │      ┌─────────────┐        ┌─────────────┐
       └────→ │ LRU Cache   │ ←───── │  Cache Set  │
              │ (5 min TTL) │        └─────────────┘
              └─────────────┘
```

| Cache | TTL | Max Size | Eviction |
|-------|-----|----------|----------|
| Route Cache | 5 minutes | 100 entries | LRU |
| Airport Cache | 30 minutes | 1 entry | TTL |

### Cache Key Format
```
{origin}-{destination}-{date}
Example: DEL-BOM-2026-01-20
```

---

## Scalability Considerations

| Aspect | Current | Future Scale |
|--------|---------|--------------| 
| Database | SQLite (file) | PostgreSQL cluster |
| Caching | In-memory LRU | Redis cluster |
| Locking | Optimistic (version) | Optimistic + Redis distributed |
| API | Single instance | Load balanced + rate limited |

---

## Technology Choices

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Frontend | React + Vite | Fast HMR, modern tooling |
| Backend | Node.js + Express | Async I/O, ecosystem |
| Database | SQLite | Zero-config, ACID, portable |
| Caching | In-memory LRU | No external deps, simple |
| ORM | Raw SQL | Full control, performance |
| Testing | Jest | Standard, fast |

