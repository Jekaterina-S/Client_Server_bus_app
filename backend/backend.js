const express = require('express');
const cors = require('cors');
const sql = require('mssql');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname, '../frontend')));

app.get('/nearest-stop', async (req, res) => {
  const { latitude, longitude } = req.query;

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

    const pool = await sql.connect(process.env.DATABASE_CONNECTION_STRING);
    const result = await pool.request()
      .input('userLatitude', sql.Float, lat)
      .input('userLongitude', sql.Float, lon)
      .query(query);
    const nearestStop = result.recordset[0];
    res.json(nearestStop);
  } catch (err) {
    console.error('Error fetching nearest stop:', err);
    res.status(500).send({ error: 'Internal server error' });
  }
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
