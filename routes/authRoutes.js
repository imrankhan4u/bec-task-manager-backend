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
  authorizeRoles(["Admin"]), // Only allow Admins to create users
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

      // Validate role format
      const validRoles = ["Admin", "Principal"];
      const departmentRoles = ["HOD", "Faculty"];
      const validDepartments = ["CSE", "ECE", "MECH", "EEE", "CIVIL", "CBDS", "AIML", "IT"];

      if (
        !validRoles.includes(role) &&
        !departmentRoles.some((r) => validDepartments.some((dept) => role === `${r}-${dept}`))
      ) {
        return res.status(400).json({
          message: "Invalid role format. HOD and Faculty must include a department (e.g., HOD-CSE, Faculty-ECE).",
        });
      }

      // Constraint: Only One Principal Allowed
      if (role === "Principal") {
        const principalExists = await User.findOne({ role: "Principal" });
        if (principalExists) {
          return res.status(400).json({ message: "A Principal already exists in the system" });
        }
      }

      // Constraint: Only One HOD Per Department
      if (role.startsWith("HOD-")) {
        const department = role.split("-")[1]; // Extract department name
        const hodExists = await User.findOne({ role: `HOD-${department}` });
        if (hodExists) {
          return res.status(400).json({ message: `An HOD already exists for the ${department} department` });
        }
      }

      // Create and save new user
      user = new User({ name, email, password, role });
      await user.save();

      res.status(201).json({ message: "User created successfully" });
    } catch (error) {
      res.status(500).json({ message: "Server error", error });
    }
  }
);


// // ✅ Login Route
// router.post(
//   "/login",
//   [
//     body("email").isEmail().withMessage("Valid email is required"),
//     body("password").notEmpty().withMessage("Password is required"),
//   ],
//   async (req, res) => {

//     console.log("Login route hit"); // Debugging
//     console.log(req.body); // See received data


//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       return res.status(400).json({ errors: errors.array() });
//     }

//     const { email, password } = req.body;

//     try {
//       const user = await User.findOne({ email });
//       if (!user) {
//         return res.status(400).json({ message: "Invalid credentials" });
//       }

//       const isMatch = await bcrypt.compare(password, user.password);
//       if (!isMatch) {
//         return res.status(400).json({ message: "Invalid credentials" });
//       }

//       const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
//         expiresIn: "1d",
//       });

//       res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
//     } catch (error) {
//       res.status(500).json({ message: "Server error", error });
//     }
//   }
// );


// this one worked very well previously

router.post("/login", async (req, res) => {
  console.log("Login route hit");
  console.log("Request Body:", req.body);

  // const { email, password } = req.body;

  // try {
  //     const user = await User.findOne({ email });
  //     if (!user) {
  //         console.log("❌ User not found in database");
  //         return res.status(400).json({ message: "Invalid credentials" });
  //     }

  //     console.log("✅ User found:", user);
  //     console.log("🔍 Stored Password:", user.password);
  //     console.log("🔍 Password Sent for Login:", password);

  //     const isMatch = await bcrypt.compare(password, user.password);
  //     console.log("🔍 Password Comparison Result:", isMatch);

  //     if (!isMatch) {
  //         console.log("❌ Password incorrect");
  //         return res.status(400).json({ message: "Invalid credentials" });
  //     }

  //     const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
  //         expiresIn: "1d",
  //     });

  //     res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  // } catch (error) {
  //     console.error("❌ Server Error:", error);
  //     res.status(500).json({ message: "Server error", error });
  // }

  try {
    const { email, password } = req.body;

    // Find the user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    console.log("🛠 Received Password:", password);
    console.log("🔍 Hashed Password from DB:", user.password);

    // Compare the password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Generate a JWT token
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "1h" });

    res.json({ token, user });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});


// router.post('/login', async (req, res) => {
//   try {
//     console.log("Login route hit");
//     console.log("Request Body:", req.body);

//     const { email, password } = req.body;

//     if (!email || !password) {
//       console.log("Missing email or password");
//       return res.status(400).json({ message: 'All fields are required' });
//     }

//     const user = await User.findOne({ email });
//     if (!user) {
//       console.log("User not found");
//       return res.status(400).json({ message: 'Invalid credentials' });
//     }

//     console.log("User found:", user);
//     console.log("Received password:", password);
//     console.log("User password from DB:", user.password);

//     const isMatch = await bcrypt.compare(password, user.password);
//     console.log("Password match result:", isMatch);

//     if (!isMatch) {
//       console.log("Password mismatch");
//       return res.status(400).json({ message: 'Invalid credentials' });
//     }

//     console.log("User authenticated successfully");

//     const token = jwt.sign(
//       { _id: user._id, role: user.role },
//       process.env.JWT_SECRET,
//       { expiresIn: '7d' }
//     );

//     res.status(200).json({
//       token,
//       user: {
//         _id: user._id,
//         name: user.name,
//         email: user.email,
//         role: user.role
//       }
//     });
//   } catch (error) {
//     console.error("Login error:", error);
//     res.status(500).json({ message: 'Server error', error });
//   }
// });




// router.post(
//   "/register-admin",
//   [
//     body("name").notEmpty(),
//     body("email").isEmail(),
//     body("password").isLength({ min: 6 }),
//   ],
//   async (req, res) => {
// //     // const { name, email, password } = req.body;

// //     // const existingAdmin = await User.findOne({ role: "Admin" });
// //     // if (existingAdmin) {
// //     //   return res.status(403).json({ message: "Admin already exists" });
// //     // }

// //     // const hashedPassword = await bcrypt.hash(password, 10);
// //     // const adminUser = new User({ name, email, password: hashedPassword, role: "Admin" });

// //     // await adminUser.save();
// //     // res.status(201).json({ message: "Admin registered successfully" });

//     try {
//       const { name, email, password, role } = req.body;
  
//       // Hash the password
//       // const salt = await bcrypt.genSalt(10);
//       // const hashedPassword = await bcrypt.hash(password, salt);
  
//       const user = new User({ name, email, password, role: "Admin" });
// // console.log("🔑 Hashed Password Before Saving:", hashedPassword);

//       await user.save();
  
//       res.status(201).json({ message: "User registered successfully" });
//     } catch (error) {
//       console.error("❌ Server Error:", error);  // Log the actual error
//       res.status(500).json({ message: "Server error", error: error.message });
//     }
    
//   }
// );

// Get Faculty Members in the HOD’s Department

router.get("/faculty", authMiddleware, async (req, res) => {
  try {
    // Only HODs can fetch faculty members
    if (!req.user.role.startsWith("HOD")) {
      return res.status(403).json({ message: "Access denied. Only HODs can view faculty members." });
    }

    // Extract department from HOD's role (e.g., "HOD-CSE" → "CSE")
    const department = req.user.role.split("-")[1];

    // Find faculty members in the same department
    const facultyMembers = await User.find({ role: `Faculty-${department}` }).select("-password");

    res.status(200).json(facultyMembers);
  } catch (error) {
    res.status(500).json({ message: "Error fetching faculty members", error });
  }
});

// Get All HODs (For Principal)

router.get("/hods", authMiddleware, async (req, res) => {
  try {
    // Only Principal can fetch HODs
    if (req.user.role !== "Principal") {
      return res.status(403).json({ message: "Access denied. Only the Principal can view HODs." });
    }

    // Find all HODs
    const hods = await User.find({ role: { $regex: /^HOD-/ } }).select("-password");

    res.status(200).json(hods);
  } catch (error) {
    res.status(500).json({ message: "Error fetching HODs", error });
  }
});

// router.get("/users", authMiddleware, async (req, res) => {
//   try {
//     // Only Principal can fetch HODs
//     if (req.user.role !== "Admin") {
//       return res.status(403).json({ message: "Access denied. Only the Admin can view Users." });
//     }

//     // Find all users
//     const users = await User.find({});

//     res.status(200).json(users);
//   } catch (error) {
//     res.status(500).json({ message: "Error fetching users", error });
//   }
// });



router.get('/all-users', authMiddleware, async (req, res) => {
  try {
    const requester = req.user;
    let filter = {};

    if (requester.role === 'Principal') {
      filter = { role: { $regex: /^HOD-/ } };
    } else if (requester.role.startsWith('HOD-')) {
      const department = requester.role.split('-')[1];
      filter = { role: `Faculty-${department}` };
    }

    const users = await User.find(filter, 'name email role department');
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Server error while fetching users' });
  }
});

router.put('/change-password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmNewPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({ message: 'New passwords do not match' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    const user = await User.findById(req.user._id);
    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Don't hash manually! Just assign plain text
    user.password = newPassword;
    await user.save(); // pre-save hook will hash

    res.status(200).json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error });
  }
});



module.exports = router;
