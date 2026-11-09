'use strict';
const fs = require('node:fs');
const config = require('./config');
const { sequelize } = require('./models');
const { createApp } = require('./app');

async function main() {
  fs.mkdirSync(config.uploads.dir, { recursive: true });
  await sequelize.authenticate();
  const app = createApp();
  app.listen(config.port, () => {
    console.log(`ShelfFlow listening on ${config.port} under ${config.basePath}`);
  });
}

main().catch((err) => {
  console.error('startup failed:', err.message);
  process.exit(1);
});
