'use strict';
const bcrypt = require('bcryptjs');

const COST = 12;
const DUMMY_HASH = '$2a$12$C6UzMDM.H6dfI/f/IKcEe.9rJ4kmU9m2x0h4m2xq2o5Q1X2e0M1bG';

const hash = (plain) => bcrypt.hash(plain, COST);

async function verify(plain, hashed) {
  const target = hashed || DUMMY_HASH;
  const ok = await bcrypt.compare(plain, target);
  return Boolean(hashed) && ok;
}

module.exports = { hash, verify };
