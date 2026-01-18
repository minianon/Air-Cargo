import { initDb } from '../src/config/database.js';

// Airlines for realistic data
const AIRLINES = [
    { code: 'AI', name: 'Air India' },
    { code: 'UK', name: 'Vistara' },
    { code: '6E', name: 'IndiGo' },
    { code: 'SG', name: 'SpiceJet' },
    { code: 'G8', name: 'GoAir' },
    { code: 'EK', name: 'Emirates' },
    { code: 'SQ', name: 'Singapore Airlines' },
    { code: 'QR', name: 'Qatar Airways' },
    { code: 'LH', name: 'Lufthansa' },
    { code: 'BA', name: 'British Airways' }
];

// Major airports 
const AIRPORTS = [
    'DEL', 'BOM', 'BLR', 'HYD', 'MAA', 'CCU', 'GOI', 'COK', 'AMD', 'PNQ',
    'DXB', 'SIN', 'LHR', 'FRA', 'DOH', 'JFK', 'LAX', 'SFO', 'ORD', 'CDG'
];

// Flight duration ranges (in hours) for realistic scheduling
const DURATION_RANGES = {
    domestic: { min: 1, max: 3 },
    regional: { min: 3, max: 6 },
    international: { min: 6, max: 14 }
};

function getFlightType(origin, destination) {
    const domesticAirports = ['DEL', 'BOM', 'BLR', 'HYD', 'MAA', 'CCU', 'GOI', 'COK', 'AMD', 'PNQ'];
    const isDomesticOrigin = domesticAirports.includes(origin);
    const isDomesticDest = domesticAirports.includes(destination);

    if (isDomesticOrigin && isDomesticDest) return 'domestic';
    if ((isDomesticOrigin || isDomesticDest) && ['DXB', 'SIN', 'DOH'].includes(isDomesticOrigin ? destination : origin)) {
        return 'regional';
    }
    return 'international';
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateFlightNumber(airline) {
    return `${airline.code}${randomInt(100, 999)}`;
}

function generateFlights(startDate, numDays, flightsPerRoute = 3) {
    const flights = [];
    let flightId = 1;

    // Generate date range
    const dates = [];
    for (let d = 0; d < numDays; d++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + d);
        dates.push(date.toISOString().split('T')[0]);
    }

    // Generate flights for each route
    for (const origin of AIRPORTS) {
        for (const destination of AIRPORTS) {
            if (origin === destination) continue;

            const flightType = getFlightType(origin, destination);
            const durationRange = DURATION_RANGES[flightType];

            for (const date of dates) {
                const dailyFlights = randomInt(Math.max(1, flightsPerRoute - 1), flightsPerRoute);

                for (let i = 0; i < dailyFlights; i++) {
                    const airline = AIRLINES[randomInt(0, AIRLINES.length - 1)];
                    const flightNumber = generateFlightNumber(airline);

                    const departureHour = randomInt(6, 22);
                    const departureMinute = randomInt(0, 3) * 15;

                    const departureTime = new Date(`${date}T${String(departureHour).padStart(2, '0')}:${String(departureMinute).padStart(2, '0')}:00`);

                    const durationMinutes = randomInt(durationRange.min * 60, durationRange.max * 60);
                    const arrivalTime = new Date(departureTime.getTime() + durationMinutes * 60 * 1000);

                    flights.push({
                        flight_id: `FL${String(flightId++).padStart(7, '0')}`,
                        flight_number: flightNumber,
                        airline_name: airline.name,
                        departure_datetime: departureTime.toISOString(),
                        arrival_datetime: arrivalTime.toISOString(),
                        origin,
                        destination
                    });
                }
            }
        }
    }

    return flights;
}

// Main seeding logic
async function seed() {
    console.log('Initializing database...');
    const db = await initDb();

    console.log('Clearing existing flights...');
    db.run('DELETE FROM flights');
    db.save();

    // Generate flights for 14 days
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);

    console.log('Generating flight data...');
    const flights = generateFlights(startDate, 14, 3);
    console.log(`Generated ${flights.length} flights.`);

    // Insert without transaction for simplicity
    console.log('Inserting flights...');

    for (let i = 0; i < flights.length; i++) {
        const flight = flights[i];
        db.run(`
            INSERT INTO flights (flight_id, flight_number, airline_name, 
                departure_datetime, arrival_datetime, origin, destination)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
            flight.flight_id,
            flight.flight_number,
            flight.airline_name,
            flight.departure_datetime,
            flight.arrival_datetime,
            flight.origin,
            flight.destination
        ]);

        if (i % 1000 === 0) {
            console.log(`Inserted ${i} / ${flights.length} flights...`);
        }
    }

    db.save();

    const count = db.get('SELECT COUNT(*) as count FROM flights');
    console.log('Flight seeding completed!');
    console.log(`Total flights in database: ${count ? count.count : 0}`);

    process.exit(0);
}

seed().catch(err => {
    console.error('Seeding failed:', err);
    process.exit(1);
});
