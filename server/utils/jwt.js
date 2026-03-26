const jwt = require('jsonwebtoken');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const SECRET = process.env.JWT_SECRET;
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

function sign(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN });
}

function verify(token) {
  return jwt.verify(token, SECRET);
}

module.exports = { sign, verify };
