const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const User = require("../models/User");
const { authMiddleware, authorizeRoles } = require("../middleware/authMiddleware");

const router = express.Router();

// ❌ Remove Public Signup Route

// ✅ Protected Route: Only Admin Can Create Users
router.post(
  "/create-user",
  authMiddleware, // Ensure user is authenticated
  authorizeRoles(["Admin"]), // Only allow Admins
  [
    body("name").notEmpty().withMessage("Name is required"),
    body("email").isEmail().withMessage("Valid email is required"),
    body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
    body("role").notEmpty().withMessage("Role is required"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password, role } = req.body;

    try {
      let user = await User.findOne({ email });
      if (user) {
        return res.status(400).json({ message: "User already exists" });
      }

      // Validate role
      const validRoles = ["Admin", "Principal"];
      const departmentRoles = ["HOD", "Faculty"];
      const validDepartments = ["CSE", "ECE", "MECH", "EEE", "CIVIL", "CBDS", "AIML", "IT"];
      
      if (!validRoles.includes(role) && !departmentRoles.some(r => validDepartments.some(dept => role === `${r}-${dept}`))) {
        return res.status(400).json({ message: "Invalid role format. HOD and Faculty must include a department (e.g., HOD-CSE, Faculty-ECE)." });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      user = new User({ name, email, password: hashedPassword, role });
      await user.save();

      res.status(201).json({ message: "User created successfully" });
    } catch (error) {
      res.status(500).json({ message: "Server error", error });
    }
  }
);

// ✅ Login Route
router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Valid email is required"),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(400).json({ message: "Invalid credentials" });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: "Invalid credentials" });
      }

      const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
        expiresIn: "1d",
      });

      res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
    } catch (error) {
      res.status(500).json({ message: "Server error", error });
    }
  }
);

module.exports = router;
