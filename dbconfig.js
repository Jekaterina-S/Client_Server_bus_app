const config = {
    user: 'dbuser',
    password: 'M{#VHCmXg:%Uz5;8I}!@>kQ',
    server: 'mysqlserverjeksn367.database.windows.net',
    database: 'myTestDatabase',
    options: {
        encrypt: true,
    },
    // wait time for initial connection
    connectionTimeout: 30000,
    requestTimeout: 30000,
};

module.exports = config;
