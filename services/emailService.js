// services/emailService.js
const nodemailer = require('nodemailer');

class emailService {
  constructor() {
    this.transporter = this.createTransporter();
  }

  createTransporter() {
    console.log('🔧 Email config check:');
    console.log('EMAIL_USER:', process.env.EMAIL_USER);
    console.log('EMAIL_APP_PASSWORD present:', !!process.env.EMAIL_APP_PASSWORD);
    
    return nodemailer.createTransport({
      service: 'gmail', 
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD
      },
      tls: {
        rejectUnauthorized: false
      }
    });
  }

  async sendOTPEmail(email, otp, userName = 'User') {
    const mailOptions = {
      from: {
        name: 'CANOVA Support',
        address: process.env.EMAIL_USER
      },
      to: email,
      subject: '🔐 Your Password Reset OTP - CANOVA',
      html: this.getOTPEmailTemplate(otp, userName),
      text: `Your OTP for password reset is: ${otp}. This OTP is valid for 10 minutes only.`
    };

    try {
      console.log(`Attempting to send OTP to: ${email}`);
      const info = await this.transporter.sendMail(mailOptions);
      console.log('OTP email sent successfully!');
      console.log('Message ID:', info.messageId);
      console.log('Response:', info.response);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Failed to send OTP email:');
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Full error:', error);
      throw new Error(`Failed to send OTP email: ${error.message}`);
    }
  }

  getOTPEmailTemplate(otp, userName) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #69b5f8 0%, #5a9de8 100%); padding: 40px 30px; text-align: center; }
          .header h1 { color: #ffffff; margin: 0; font-size: 28px; }
          .content { padding: 40px 30px; }
          .otp-box { background: #f8f9fa; border: 3px solid #69b5f8; border-radius: 15px; padding: 25px; text-align: center; margin: 30px 0; }
          .otp-code { font-size: 36px; font-weight: bold; color: #69b5f8; letter-spacing: 8px; font-family: monospace; }
          .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 20px; margin: 30px 0; border-radius: 8px; }
          .footer { background-color: #f8f9fa; padding: 25px; text-align: center; color: #6c757d; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Password Reset</h1>
          </div>
          <div class="content">
            <h2>Hello ${userName}!</h2>
            <p>Your verification code for password reset:</p>
            <div class="otp-box">
              <div class="otp-code">${otp}</div>
              <p style="margin: 10px 0 0 0; color: #666; font-size: 12px;">Valid for 10 minutes</p>
            </div>
            <div class="warning">
              <strong>🔒 Security Guidelines:</strong><br>
              • This code expires in <strong>10 minutes</strong><br>
              • Never share this code with anyone<br>
              • Use only on CANOVA website
            </div>
          </div>
          <div class="footer">
            <p>This is an automated message from CANOVA.</p>
            <p>© 2025 CANOVA. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  async testConnection() {
    try {
      console.log('🔍 Testing Gmail connection...');
      await this.transporter.verify();
      console.log('Gmail is ready to send emails!');
      return true;
    } catch (error) {
      console.error('Gmail connection failed:', error);
      console.error('Error details:', error.message);
      return false;
    }
  }
}

module.exports = new emailService();
