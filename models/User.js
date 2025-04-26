const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Department = require("./Department");
const crypto = require("crypto");

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
      validator: async function (role) {
        const validRoles = ["Admin", "Principal"];
        const departmentRoles = ["HOD", "Faculty"];

        if (validRoles.includes(role)) return true;

        const departments = await Department.find().select("name");
        const validDepartments = departments.map(dep => dep.name);

        return departmentRoles.some(r =>
          validDepartments.some(dept => role === `${r}-${dept}`)
        );
      },
      message: "Invalid role format. HOD and Faculty must include a department (e.g., HOD-CSE, Faculty-ECE)."
    }
  },
  resetPasswordToken: String,
  resetPasswordExpires: Date
});

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});




userSchema.methods.generatePasswordReset = function () {
  const resetToken = crypto.randomBytes(20).toString("hex");

  this.resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex");
  this.resetPasswordExpires = Date.now() + 60 * 1000; // ✅ 1 minute

  return resetToken;
};


const User = mongoose.model("User", userSchema);
module.exports = User;
