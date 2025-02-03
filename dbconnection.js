var config = require('./dbconfig');
const sql = require('mssql');

let poolPromise = null;

async function connectToDatabase() {
    if (!poolPromise) {
        poolPromise = sql.connect(config)
            .then(pool => {
                console.log('Connected to the database');
                return pool;
            })
            .catch(err => {
                poolPromise = null;
                console.error('SQL error:', err);
                throw err;
            });
    }
    return poolPromise;
}

module.exports = {
    connectToDatabase,
};
