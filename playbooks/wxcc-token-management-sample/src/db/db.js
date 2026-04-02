/**
 * Sequelize database connection. Default is file-backed SQLite under ./db/db.sqlite (relative to cwd).
 *
 * Override with DB_DIALECT and DB_STORAGE if you move to Postgres/MySQL (not demonstrated here).
 */
const { Sequelize } = require('sequelize');
require('dotenv').config();

module.exports.db = new Sequelize({
  dialect: process.env.DB_DIALECT || 'sqlite',
  storage: process.env.DB_STORAGE || './db/db.sqlite',
});
