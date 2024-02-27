const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
dotenv.config();
const router = express.Router();
const User = require('../models/user');
const authenticate = require('../middleware/authenticate');

const errorhandler = (res, error) => {
    res.status(error.status || 500).json({ error: "Something went wrong! Please try after some time." });
};

// Route to register new user
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, confirmpassword } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        if (!name || !email || !password || !confirmpassword) {
            return res.status(400).json({ error: 'Name, email, password and confirmpassword are required fields.' });
        } else if (password !== confirmpassword) {
            return res.status(400).json({ error: 'Password does not match' })
        }

        const existingUser = await User.findOne({ email })
        if (existingUser) {
            return res.status(400).json({ error: 'User with this email already exists.' });
        }
        const newUser = new User({
            name,
            email,
            password: hashedPassword,
        });

        await newUser.save();
        const token = jwt.sign({ userId: newUser._id }, process.env.JWT_Token, { expiresIn: '24h' })
        res.status(200).json({
            token,
            userId: newUser._id,
            createrName: newUser.name,
            message: "user register successfully"
        });
    } catch (error) {
        console.log(error);
        errorhandler(res, error);
    }
});

// Route to login authorized User
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' })
        }
        const user = await User.findOne({ email });
        if (user) {
            let hasPasswordMatched = await bcrypt.compare(password, user.password);
            if (hasPasswordMatched) {
                const token = jwt.sign({ userId: user._id }, process.env.JWT_Token, { expiresIn: '24h' })

                res.status(200).json({
                    token,
                    userId: user._id,
                    createrName: user.name,
                    message: "You have logged In successfully"
                })
            } else {
                res.status(500).json({
                    message: "Incorrect credentials"
                })
            }
        } else {
            res.status(400).json({
                message: "User does not exist"
            })
        }
    } catch (error) {
        errorhandler(res, error);
    }
});
// setting page
router.put("/settings/:userId", authenticate, async (req, res) => {
    try {
        const { userId } = req.params;
        const { oldPassword, newPassword, name } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        if (oldPassword.length > 0) {
            var passwordMatch = await bcrypt.compare(oldPassword, user.password);
            if (!passwordMatch) {
                return res.status(400).json({ error: "Old password does not match" });
            }
        }
        if (newPassword.length > 0 && passwordMatch) {
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            user.password = hashedPassword;
        } else {
            user.password = user.password;
        }
        if (name.lenth > 0) {
            user.name = name;

        } else {
            user.name = user.name;
        }
        await user.save();
        res.status(200).json({ message: "Name and password updated successfully" });
    } catch (error) {
        errorhandler(res, error);
    }
});


module.exports = router;



