const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Name is required"]
  },
  email: {
    type: String,
    required: [true, "Email is required"],
    unique: true,
    match: [/\S+@\S+\.\S+/, "Please use a valid email address"]
  },
  password: {
    type: String,
    required: [true, "Password is required"],
    minlength: 6
  },
  role: {
    type: String,
    required: [true, "Role is required"],
    validate: {
      validator: function (role) {
        const validRoles = ["Admin", "Principal"];
        const departmentRoles = ["HOD", "Faculty"];
        const validDepartments = ["CSE", "ECE", "MECH", "EEE", "CIVIL", "CBDS", "AIML", "IT"]; // Add more as needed

        if (validRoles.includes(role)) return true;

        return departmentRoles.some(r => 
          validDepartments.some(dept => role === `${r}-${dept}`)
        );
      },
      message: "Invalid role format. HOD and Faculty must include a department (e.g., HOD-CSE, Faculty-ECE)."
    }
  }
});

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

const User = mongoose.model("User", userSchema);
module.exports = User;
