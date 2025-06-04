module.exports = {
  databaseUrl: process.env.DATABASE_URL || 'postgres://user:password@db:5432/appdb',
  migrationsTable: 'pgmigrations',
  dir: 'migrations',
  log: (message) => console.log(message), // Optional: Custom logger
  // Set to false to disable transactions per migration (if needed)
  // checkOrder: false, // Set to false to disable checking migration order
  // schema: 'public', // Optional: Specify schema
};
