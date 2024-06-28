const jwt = require('jsonwebtoken');

const authMiddleware = (req,res,next) =>{
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.JWT_SECRET, (err, decoced) =>{
        if(err) {
            return res.status(401).json({Error: "Invalid Token"})
        }
        req.user = decoced.id;
        next();
    });
}

module.exports = authMiddleware;