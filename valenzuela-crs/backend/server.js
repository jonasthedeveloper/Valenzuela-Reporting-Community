const app = require('./app');
const env = require('./config/env');
const { assertConnection } = require('./config/db');

async function start() {
  try {
    await assertConnection();
    console.log(`  MySQL connected  (${env.db.name} @ ${env.db.host}:${env.db.port})`);
  } catch (err) {
    console.error('\n  Cannot reach MySQL. Start Apache + MySQL in XAMPP, then run `npm run db:import`.');
    console.error(`  ${err.message}\n`);
    process.exit(1);
  }

  app.listen(env.port, () => {
    console.log(`  API running      http://localhost:${env.port}/api`);
    console.log(`  Allowed client   ${env.clientUrl}`);
    console.log(`  Environment      ${env.nodeEnv}\n`);
  });
}

process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
});

start();
