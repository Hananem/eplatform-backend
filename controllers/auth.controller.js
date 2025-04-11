const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET;

//  Register
exports.register = async (req, res) => {
    try {
      const { firstName, lastName, email, password, role } = req.body;
  
      // Check if the user already exists
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) return res.status(400).json({ message: 'Email already exists' });
  
      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);
  
      // Create the new user
      const user = await prisma.user.create({
        data: {
          firstName,       // Add firstName here
          lastName,        // Add lastName here
          email,
          password: hashedPassword,
          role
        },
      });
  
      // Respond with the new user's details (excluding password)
      res.status(201).json({
        message: 'User registered',
        user: { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role },
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };
  

//  Login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

  
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ message: 'Invalid email or password' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid email or password' });

    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture || 'https://img.freepik.com/free-vector/user-circles-set_78370-4704.jpg?ga=GA1.1.1018217121.1741645330&semt=ais_hybrid&w=740',
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


//  Logout
exports.logout = async (req, res) => {
 
  res.status(200).json({ message: 'Logout successful (client should remove token)' });
};

//  Forget Password
exports.forgetPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ message: 'Email not found' });

    const resetToken = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '15m' });

    await prisma.user.update({
      where: { email },
      data: {
        resetToken,
        resetTokenExp: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
      }
    });

    // Send email
    const transporter = nodemailer.createTransport({
      service: 'gmail', 
      auth: {
        user: process.env.APP_EMAIL_ADDRESS,
        pass: process.env.APP_EMAIL_PASSWORD, 
      }
    });

    const resetLink = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

    await transporter.sendMail({
      to: email,
      subject: 'Reset Your Password',
      html: `<p>Click <a href="${resetLink}">here</a> to reset your password. This link expires in 15 minutes.</p>`
    });

    res.status(200).json({ message: 'Reset password email sent' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

//  Reset Password
exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });

    if (!user || user.resetToken !== token || new Date() > user.resetTokenExp) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExp: null
      }
    });

    res.status(200).json({ message: 'Password has been reset successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
