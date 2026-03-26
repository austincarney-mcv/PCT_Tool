require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { sign, verify } = require('../utils/jwt');

// Parse APP_USERS=user:pass:role,user2:pass2:role2
function getUsers() {
  const raw = process.env.APP_USERS || '';
  return raw.split(',').reduce((acc, entry) => {
    const [username, password, role] = entry.trim().split(':');
    if (username) acc[username] = { password, role };
    return acc;
  }, {});
}

function login(req, res) {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  const users = getUsers();
  const user = users[username];
  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = sign({ username, role: user.role });
  res.json({ token, user: { username, role: user.role } });
}

function refresh(req, res) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    const old = verify(header.slice(7));
    const token = sign({ username: old.username, role: old.role });
    res.json({ token, user: { username: old.username, role: old.role } });
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = { login, refresh };
