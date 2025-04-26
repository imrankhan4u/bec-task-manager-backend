const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Department = require("../models/Department");
const { body, validationResult } = require("express-validator");
const { authMiddleware, authorizeRoles } = require("../middleware/authMiddleware");

const { forgotPassword, resetPassword } = require("../controllers/authController");


router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);



// Admin registration

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



// ❌ Remove Public Signup Route

// ✅ Protected Route: Only Admin Can Create Users
// router.post(
//   "/create-user",
//   authMiddleware, // Ensure user is authenticated
//   authorizeRoles(["Admin"]), // Only allow Admins to create users
//   [
//     body("name").notEmpty().withMessage("Name is required"),
//     body("email").isEmail().withMessage("Valid email is required"),
//     body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
//     body("role").notEmpty().withMessage("Role is required"),
//   ],
//   async (req, res) => {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       return res.status(400).json({ errors: errors.array() });
//     }

//     const { name, email, password, role } = req.body;

//     try {
//       let user = await User.findOne({ email });
//       if (user) {
//         return res.status(400).json({ message: "User already exists" });
//       }

//       // Validate role format
//       const validRoles = ["Admin", "Principal"];
//       const departmentRoles = ["HOD", "Faculty"];
//       const validDepartments = ["CSE", "ECE", "MECH", "EEE", "CIVIL", "CBDS", "AIML", "IT"];

//       if (
//         !validRoles.includes(role) &&
//         !departmentRoles.some((r) => validDepartments.some((dept) => role === `${r}-${dept}`))
//       ) {
//         return res.status(400).json({
//           message: "Invalid role format. HOD and Faculty must include a department (e.g., HOD-CSE, Faculty-ECE).",
//         });
//       }

//       // Constraint: Only One Principal Allowed
//       if (role === "Principal") {
//         const principalExists = await User.findOne({ role: "Principal" });
//         if (principalExists) {
//           return res.status(400).json({ message: "A Principal already exists in the system" });
//         }
//       }

//       // Constraint: Only One HOD Per Department
//       if (role.startsWith("HOD-")) {
//         const department = role.split("-")[1]; // Extract department name
//         const hodExists = await User.findOne({ role: `HOD-${department}` });
//         if (hodExists) {
//           return res.status(400).json({ message: `An HOD already exists for the ${department} department` });
//         }
//       }

//       // Create and save new user
//       user = new User({ name, email, password, role });
//       await user.save();

//       res.status(201).json({ message: "User created successfully" });
//     } catch (error) {
//       res.status(500).json({ message: "Server error", error });
//     }
//   }
// );





// after adding department as a new document in database

router.post(
  "/create-user",
  authMiddleware,
  authorizeRoles(["Admin"]),
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

      // Fetch departments from the database
      const departments = await Department.find().select("name");
      const validDepartments = departments.map((dept) => dept.name);

      const validBaseRoles = ["Admin", "Principal"];
      const departmentRoles = ["HOD", "Faculty"];

      let isValidRole = false;

      if (validBaseRoles.includes(role)) {
        isValidRole = true;
      } else {
        for (const deptRole of departmentRoles) {
          for (const dept of validDepartments) {
            if (role === `${deptRole}-${dept}`) {
              isValidRole = true;
              break;
            }
          }
        }
      }

      if (!isValidRole) {
        return res.status(400).json({
          message:
            "Invalid role format. Must be Admin, Principal, or HOD/Faculty with department (e.g., HOD-CSE, Faculty-IT)",
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
      console.error(error);
      res.status(500).json({ message: "Server error", error });
    }
  }
);


// ➕ Add Department
router.post(
  "/departments",
  authMiddleware,
  authorizeRoles(["Admin"]),
  [body("name").notEmpty().withMessage("Department name is required")],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name } = req.body;

    try {
      const existingDepartment = await Department.findOne({ name });
      if (existingDepartment) {
        return res.status(400).json({ message: "Department already exists" });
      }

      const department = new Department({ name });
      await department.save();

      res.status(201).json({ message: "Department created successfully", department });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// 📄 Get All Departments
router.get(
  "/departments",
  authMiddleware,
  authorizeRoles(["Admin"]),
  async (req, res) => {
    try {
      const departments = await Department.find();
      res.status(200).json({ departments });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// // 📝 Update Department
// router.patch(
//   "/departments/:id",
//   authMiddleware,
//   authorizeRoles(["Admin"]),
//   [body("name").notEmpty().withMessage("Department name is required")],
//   async (req, res) => {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       return res.status(400).json({ errors: errors.array() });
//     }

//     const { id } = req.params;
//     const { name } = req.body;

//     try {
//       const department = await Department.findById(id);
//       if (!department) {
//         return res.status(404).json({ message: "Department not found" });
//       }

//       department.name = name;
//       await department.save();

//       res.status(200).json({ message: "Department updated successfully", department });
//     } catch (error) {
//       console.error(error);
//       res.status(500).json({ message: "Server error" });
//     }
//   }
// );

// 📝 Update Department
router.patch(
  "/departments/:id",
  authMiddleware,
  authorizeRoles(["Admin"]),
  [body("name").notEmpty().withMessage("Department name is required")],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { name: newDeptName } = req.body;

    try {
      const department = await Department.findById(id);
      if (!department) {
        return res.status(404).json({ message: "Department not found" });
      }

      const oldDeptName = department.name;
      department.name = newDeptName;
      await department.save();

      // 🔁 Update all user roles referencing the old department name
      const departmentRoles = ["HOD", "Faculty"];
      for (const rolePrefix of departmentRoles) {
        const oldRole = `${rolePrefix}-${oldDeptName}`;
        const newRole = `${rolePrefix}-${newDeptName}`;

        const updateResult = await User.updateMany(
          { role: oldRole },
          { $set: { role: newRole } }
        );

        if (updateResult.nModified === 0) {
          console.log(`No users found with the role: ${oldRole}`);
        } else {
          console.log(`Updated ${updateResult.nModified} users with the role: ${oldRole}`);
        }
      }

      res.status(200).json({ message: "Department and user roles updated", department });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  }
);



// 🗑️ Delete Department
router.delete(
  "/departments/:id",
  authMiddleware,
  authorizeRoles(["Admin"]),
  async (req, res) => {
    try {
      const deletedDept = await Department.findByIdAndDelete(req.params.id);

      if (!deletedDept) {
        return res.status(404).json({ message: "Department not found" });
      }

      res.status(200).json({ message: "Department deleted successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  }
);


router.post("/login", async (req, res) => {
  console.log("Login route hit");
  console.log("Request Body:", req.body);

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

// ✅ Get current user profile
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password'); // remove password field
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});



// GET /api/auth/stats
router.get(
  "/stats",
  authMiddleware,
  authorizeRoles(["Admin"]),
  async (req, res) => {
    try {
      const totalUsers = await User.countDocuments();
      const totalDepartments = await Department.countDocuments();
      const totalFaculty = await User.countDocuments({ role: /Faculty-/ });
      const totalHODs = await User.countDocuments({ role: /HOD-/ });

      res.status(200).json({
        totalUsers,
        totalDepartments,
        totalFaculty,
        totalHODs,
      });
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// GET /api/admin/hierarchy
router.get(
  "/hierarchy",
  authMiddleware,
  authorizeRoles(["Admin"]),
  async (req, res) => {
    try {
      const principal = await User.findOne({ role: "Principal" }).select("-password");

      const departments = await Department.find();
      const hierarchy = [];

      for (const dept of departments) {
        const hod = await User.findOne({ role: `HOD-${dept.name}` }).select("-password");
        const faculty = await User.find({ role: `Faculty-${dept.name}` }).select("-password");

        hierarchy.push({
          department: dept.name,
          hod,
          faculty,
        });
      }

      res.status(200).json({
        principal,
        departments: hierarchy,
      });
    } catch (error) {
      console.error("Error fetching hierarchy:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// 📝 Update User (Admin only)
router.patch(
  "/users/:id",
  authMiddleware,
  authorizeRoles(["Admin"]), // Only Admin can update user details
  [
    body("name").optional().notEmpty().withMessage("Name must not be empty"),
    body("email").optional().isEmail().withMessage("Invalid email address"),
    body("role").optional().notEmpty().withMessage("Role must not be empty"),
    // ❌ Removed password validation to comply with privacy policy
  ],

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { name, email, role } = req.body; // ❌ password destructuring removed

    try {
      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // ✅ Only update allowed fields
      if (name) user.name = name;
      if (email) user.email = email;
      if (role) user.role = role;

      await user.save();
      res.status(200).json({ message: "User updated successfully", user });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error", error });
    }
  }
);




module.exports = router;
