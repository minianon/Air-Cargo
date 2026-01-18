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

## Scalability Considerations

| Aspect | Current | Future Scale |
|--------|---------|--------------|
| Database | SQLite (file) | PostgreSQL cluster |
| Caching | None | Redis for route queries |
| Locking | Optimistic (version) | Distributed locks (Redis) |
| API | Single instance | Load balanced + rate limited |

---

## Technology Choices

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Frontend | React + Vite | Fast HMR, modern tooling |
| Backend | Node.js + Express | Async I/O, ecosystem |
| Database | SQLite | Zero-config, ACID, portable |
| ORM | Raw SQL | Full control, performance |
| Testing | Jest | Standard, fast |
