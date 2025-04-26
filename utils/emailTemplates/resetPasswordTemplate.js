const resetPasswordTemplate = (resetUrl) => `
  <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
    <h2>Password Reset Request</h2>
    <p>You requested to reset your password. Click the button below to reset it:</p>
    <a href="${resetUrl}" target="_blank" 
       style="display: inline-block; padding: 10px 20px; margin: 20px 0; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">
      Reset Password
    </a>
    <p>This link will expire in <strong>1 minute</strong>.</p>
    <p>If you didn’t request this, you can ignore this email.</p>
    <br />
    <p>– Codeverse Team</p>
  </div>
`;

module.exports = resetPasswordTemplate;
