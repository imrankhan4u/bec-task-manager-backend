const crypto = require("crypto");
const User = require("../models/User");
const sendEmail = require("../utils/sendEmail");
const resetPasswordTemplate = require("../utils/emailTemplates/resetPasswordTemplate");

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const resetToken = user.generatePasswordReset();
    await user.save();

    const resetURL = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;


    await sendEmail({
      to: user.email,
      subject: "Reset your password",
      html: resetPasswordTemplate(resetUrl),
    });

    res.status(200).json({ message: "Reset link sent to your email" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};


exports.resetPassword = async (req, res) => {
    const { token } = req.params;
    const { password } = req.body;
  
    try {
      const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
  
      const user = await User.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordExpires: { $gt: Date.now() },
      });
  
      if (!user) return res.status(400).json({ message: "Token is invalid or expired" });
  
      user.password = password;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
  
      await user.save();
  
      res.status(200).json({ message: "Password reset successful" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  };
