const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

// Register
router.post('/register', authController.register);

// Login
router.post('/login', authController.login);

// Logout
router.post('/logout', authController.logout);

// Forget password
router.post('/forgot-password', authController.forgetPassword);

// Reset password
router.post('/reset-password/:token', authController.resetPassword);

module.exports = router;
