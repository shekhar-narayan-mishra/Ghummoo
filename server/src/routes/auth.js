const router = require('express').Router();
const { register, login, logout, getMe } = require('../controllers/AuthController');
const { verifyToken } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.get('/me', verifyToken, getMe);

module.exports = router;
