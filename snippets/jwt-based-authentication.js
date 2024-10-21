const express = require('express');
const app = express();
const secretKey = "secretK/key";
const jwt = require('jsonwebtoken');

app.use(express.json());

// Authenticate user
app.post('/login', (req, res) => {
    const user = {
        id: 1,
        username: "abc",
        email: "abc@gmail.com"
    };
   // Sign the token with user information
    jwt.sign({ user }, secretKey, { expiresIn: '300s' }, (err, token) => {
        if (err) {
            return res.sendStatus(500);
        }
        res.json({ token });
    });
});
// Profile route that requires token verification
app.get("/profile", verifyToken, (req, res) => {
        // Verify the token
    jwt.verify(req.token, secretKey, (err, authData) => {
        if (err) {
            console.error('Token verification failed:', err);
            return res.status(401).json({ result: "Invalid token" });
        }
        res.json({ message: "Profile accessed", authData });
    });
});
// Middleware to verify the token
function verifyToken(req, res, next) {
    
    const bearerHeader = req.headers['authorization'];
    console.log("Bearer Header:", bearerHeader);

    if (bearerHeader) {
        const bearer = bearerHeader.split(' ');
        const token = bearer[1];
        console.log("Token:", token);
        req.token = token;
        next();
    } else {
        res.sendStatus(403);
    }
}

app.listen(3000, () => {
    console.log('Server started on port 3000');
});

// No need to export in this context as it's not a module, but if you do:
module.exports = verifyToken;
