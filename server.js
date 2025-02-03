const express = require('express');

const app = express();
const PORT = process.env.PORT || 5000;

app.get('/', (req, res) => {
    res.send("Connected to express server");
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on ${PORT}`);
});
