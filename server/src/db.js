'use strict';
const { Sequelize } = require('sequelize');
const config = require('./config');

const sequelize = new Sequelize(config.databaseUrl, {
  dialect: 'postgres',
  logging: false,
  define: { underscored: true, freezeTableName: true },
  pool: { max: 10, min: 0, idle: 10000 },
});

module.exports = { sequelize };
