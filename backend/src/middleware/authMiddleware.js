const jwt = require('jsonwebtoken');
const knex = require('knex')(require('../../knexfile').development); // Adjust path as needed

const protect = async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            // Get user from the token and attach to request object
            // Ensure to select only non-sensitive fields or fields needed for authorization
            req.user = await knex('users').where({ id: decoded.id }).select('id', 'email', 'username', 'is_staff', 'is_superuser').first();
            if (!req.user) {
                return res.status(401).json({ message: 'Not authorized, user not found' });
            }
            next();
        } catch (error) {
            console.error(error);
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }
    if (!token) {
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};

const admin = (req, res, next) => {
    if (req.user && (req.user.is_staff || req.user.is_superuser)) {
        next();
    } else {
        res.status(403).json({ message: 'Not authorized as an admin' });
    }
};

module.exports = { protect, admin };
