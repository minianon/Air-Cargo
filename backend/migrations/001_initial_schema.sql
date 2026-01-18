-- Air Cargo Booking & Tracking System - Database Schema
-- Migration 001: Initial Schema

-- Flights table (~100K records expected)
CREATE TABLE IF NOT EXISTS flights (
    flight_id TEXT PRIMARY KEY,
    flight_number TEXT NOT NULL,
    airline_name TEXT NOT NULL,
    departure_datetime TEXT NOT NULL,  -- ISO 8601 format
    arrival_datetime TEXT NOT NULL,    -- ISO 8601 format
    origin TEXT NOT NULL,
    destination TEXT NOT NULL
);

-- Indexes for route search optimization
-- Composite index for direct flight queries
CREATE INDEX IF NOT EXISTS idx_flights_origin_dest_date 
    ON flights(origin, destination, date(departure_datetime));

-- Index for first-hop queries (origin + date)
CREATE INDEX IF NOT EXISTS idx_flights_origin_date 
    ON flights(origin, date(departure_datetime));

-- Index for second-hop queries (destination + date range)
CREATE INDEX IF NOT EXISTS idx_flights_dest_arrival 
    ON flights(destination, arrival_datetime);

-- Bookings table
CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ref_id TEXT UNIQUE NOT NULL,
    origin TEXT NOT NULL,
    destination TEXT NOT NULL,
    pieces INTEGER NOT NULL CHECK(pieces > 0),
    weight_kg INTEGER NOT NULL CHECK(weight_kg > 0),
    status TEXT NOT NULL DEFAULT 'BOOKED' 
        CHECK(status IN ('BOOKED', 'DEPARTED', 'ARRIVED', 'DELIVERED', 'CANCELLED')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1  -- Optimistic locking
);

-- Unique index on ref_id for fast lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_ref_id ON bookings(ref_id);

-- Index for status-based queries
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);

-- Index for date-based queries
CREATE INDEX IF NOT EXISTS idx_bookings_created ON bookings(created_at);

-- Timeline/Events table (immutable - append only)
CREATE TABLE IF NOT EXISTS timeline_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_ref_id TEXT NOT NULL,
    event_type TEXT NOT NULL 
        CHECK(event_type IN ('CREATED', 'DEPARTED', 'ARRIVED', 'DELIVERED', 'CANCELLED')),
    location TEXT,
    flight_id TEXT,
    timestamp TEXT NOT NULL,
    FOREIGN KEY (booking_ref_id) REFERENCES bookings(ref_id) ON DELETE CASCADE,
    FOREIGN KEY (flight_id) REFERENCES flights(flight_id)
);

-- Composite index for fetching timeline by booking in chronological order
CREATE INDEX IF NOT EXISTS idx_timeline_booking_time 
    ON timeline_events(booking_ref_id, timestamp);

-- Index for event type queries
CREATE INDEX IF NOT EXISTS idx_timeline_event_type ON timeline_events(event_type);
