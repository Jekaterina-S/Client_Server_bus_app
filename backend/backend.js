const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { connectToDatabase } = require('./dbconnection');
const sql = require('mssql');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());
app.use(cors());
app.use(express.static('../frontend'));

app.get("*", (req, res) => { //our GET route needs to point to the index.html in our build
    res.sendFile(path.resolve(__dirname, "../frontend/index.html"));
  });

const PORT = process.env.PORT || 5000;

let poolPromise = connectToDatabase();

app.get('/', (req, res) => {
    res.send("Connected to express server");
});

// Get bus stop areas
app.get('/areas', async (req, res) => {
    try {
        const query = `
        SELECT DISTINCT stop_area AS area
        FROM [dbo].[BusStops]
        ORDER BY stop_area ASC;
        `;

        const pool = await poolPromise;
        const result = await pool.request().query(query);
        const areas = result.recordset;
        // Remove null first line from json
        res.json(areas.slice(1));
    } catch (err) {
        console.error('Error fetching areas:', err);
        res.status(500).send('Internal Server Error');
    }
});

// Get stops for a specific area
app.get('/stops', async (req, res) => {
    const { area } = req.query;

    if (!area) {
        return res.status(400).send({ error: 'stop_area is required' });
    }

    try {
        const query = `
        SELECT stop_id, stop_name, stop_code
        FROM [dbo].[BusStops]
        WHERE stop_area = @area
        ORDER BY stop_name ASC;
        `;

        const pool = await poolPromise;
        const result = await pool.request()
            .input('area', sql.VarChar, area)
            .query(query);
        const stops = result.recordset;
        res.json(stops);
    } catch (err) {
        console.error('Error fetching stops:', err);
        res.status(500).send('Internal Server Error');
    }
});

// Get buses for a specific stop in ascending order
app.get('/buses', async (req, res) => {
    const { stop } = req.query;

    if (!stop) {
        return res.status(400).send({ error: 'stop_id is required' });
    }
    
    try {
        const query = `
            SELECT route_id, route_short_name
            FROM (
                SELECT DISTINCT
                    r.route_id,
                    r.route_short_name,
                    CAST(
                        CASE
                            WHEN PATINDEX('%[0-9]%', r.route_short_name) > 0 THEN
                                LEFT(r.route_short_name, PATINDEX('%[^0-9]%', r.route_short_name + 'x') - 1)
                            ELSE '0'
                        END AS INT) AS numeric_part,
                    RIGHT(r.route_short_name, LEN(r.route_short_name) - PATINDEX('%[^0-9]%', r.route_short_name + 'x') + 1) AS string_part
                FROM [dbo].[BusStops] s
                JOIN [dbo].[BusStopTimes] st ON s.stop_id = st.stop_id
                JOIN [dbo].[BusTrips] t ON st.trip_id = t.trip_id
                JOIN [dbo].[BusRoutes] r ON t.route_id = r.route_id
                WHERE s.stop_id = @stop
            ) AS sorted_routes
            ORDER BY numeric_part, string_part, route_short_name;
        `;

        const pool = await poolPromise;
        const result = await pool.request()
            .input('stop', sql.Int, stop)
            .query(query);
        const buses = result.recordset;
        res.json(buses);
    } catch (err) {
        console.error('Error fetching buses:', err);
        res.status(500).send({ err: 'Internal server error' });
    }
});

// Get the nearest stop, based on geolocation
app.get('/nearest-stop', async (req, res) => {
    const { latitude, longitude } = req.query;

    // Check if latitude and longitude are valid numbers
    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lon)) {
        return res.status(400).send({ error: 'Invalid latitude or longitude' });
    }

    try {
        const query = `
            SELECT TOP 1
                stop_id,
                stop_name,
                stop_area,
                stop_lat,
                stop_lon,
                ( 6371 * ACOS(COS(RADIANS(@userLatitude)) 
                * COS(RADIANS(stop_lat)) 
                * COS(RADIANS(stop_lon) - RADIANS(@userLongitude)) 
                + SIN(RADIANS(@userLatitude)) 
                * SIN(RADIANS(stop_lat))) ) AS distance
            FROM [dbo].[BusStops]
            ORDER BY distance;
            `;

        const pool = await poolPromise;
        const result = await pool.request()
            .input('userLatitude', sql.Float, latitude)
            .input('userLongitude', sql.Float, longitude)
            .query(query);
        const nearestStop = result.recordset[0];
        res.json(nearestStop);
    } catch (err) {
        console.error('Error fetching nearest stop:', err);
        res.status(500).send({ error: 'Internal server error' });
    }
});

// Get arrival times for a bus at specific stop
app.get('/arrival-times', async (req, res) => {
    const { stop, route, reference_date, offset } = req.query;

    if (!route || !stop || !reference_date || !offset) {
        return res.status(400).send({ error: 'route_id, stop_id, and reference_date are required' });
    }

    try {
        const query = `
            SELECT t.trip_long_name, st.arrival_time, st.departure_time
            FROM [dbo].[BusTrips] t
            JOIN [dbo].[BusStopTimes] st ON t.trip_id = st.trip_id
            WHERE t.route_id = @route_id AND st.stop_id = @stop_id
            ORDER BY st.arrival_time
        `;

        const pool = await poolPromise;
        const result = await pool.request()
            .input('route_id', sql.NVarChar, route)
            .input('stop_id', sql.Int, stop)
            .query(query);

        const referenceDate = new Date(reference_date);
        // Used timezone offset to reflect client side time
        referenceDate.setHours(referenceDate.getHours() - offset / 60);
        
        const arrivalTimes = result.recordset.map(row => ({
            trip_long_name: row.trip_long_name,
            arrival_time: parseTimeString(row.arrival_time, referenceDate)
        }));

        // Filter by arrival times greater than referenceDate
        let filteredArrivalTimes = arrivalTimes.filter(item => item.arrival_time > referenceDate);

        // If there are less than 5 items, add additional times with rolled-over day
        if (filteredArrivalTimes.length < 5) {
            const additionalTimes = arrivalTimes.map(item => ({
                ...item,
                arrival_time: new Date(item.arrival_time.getTime() + 24 * 60 * 60 * 1000) // Adding one day
            })).filter(item => item.arrival_time > referenceDate);

            // Concatenate and slice to ensure only 5 items
            filteredArrivalTimes = filteredArrivalTimes.concat(additionalTimes).slice(0, 5);
        } else {
            // Ensure to slice if 5 or more items
            filteredArrivalTimes = filteredArrivalTimes.slice(0, 5);
        }

        res.json(filteredArrivalTimes);
    } catch (err) {
        console.error('Error fetching nearest arrival times:', err);
        res.status(500).send({ error: 'Internal server error' });
    }
});

// Function to parse time strings to JavaScript Date objects
// Times are stored as varchars in database due to there being 24 and 25 hour times 
function parseTimeString(timeStr, referenceDate) {
    const [hours, minutes, seconds] = timeStr.split(':').map(Number);
    const validHours = hours % 24;
    const additionalDays = Math.floor(hours / 24);
    
    const date = new Date(referenceDate);
    // Add the days rolled over
    date.setDate(date.getDate() + additionalDays);
    date.setHours(validHours, minutes, seconds);
    return date;
}

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
