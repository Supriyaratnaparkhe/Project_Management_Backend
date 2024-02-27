const jwt = require('jsonwebtoken');
const dotenv = require('dotenv')
dotenv.config();

const authenticate = (req, res, next) => {
    const { token } = req.headers;
    if (!token) {
        return res.status(401).json({ error: "unauthorized Or missing token" });
    }

    try {
        req.user = jwt.verify(token, process.env.JWT_Token).user;
        next();
    } catch {
        res.status(401).json({ error: "Invalid Token" })
    }
}
module.exports = authenticate;