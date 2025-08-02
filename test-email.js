// test-email.js
require('dotenv').config(); // 🔥 ADD THIS LINE AT THE TOP
const emailService = require('./services/emailService');

async function testGmailSetup() {
  console.log('🧪 Testing Gmail setup with App Password...');
  console.log('📧 Using email:', process.env.EMAIL_USER);
  console.log('🔑 App password loaded:', process.env.EMAIL_APP_PASSWORD ? 'Yes' : 'No');
  
  // Check if all required env vars are loaded
  if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
    console.error('❌ Missing environment variables:');
    console.error('EMAIL_USER:', process.env.EMAIL_USER ? '✅' : '❌ Missing');
    console.error('EMAIL_APP_PASSWORD:', process.env.EMAIL_APP_PASSWORD ? '✅' : '❌ Missing');
    console.error('\n🔧 Make sure your .env file exists and contains:');
    console.error('EMAIL_USER=t.mailservice0112@gmail.com');
    console.error('EMAIL_APP_PASSWORD=xirq ndwn wika etwg');
    return;
  }
  
  try {
    // Test connection first
    const isReady = await emailService.testConnection();
    
    if (isReady) {
      console.log('✅ Gmail connection successful!');
      
      // Send test OTP email
      const testEmail = 't.mailservice0112@gmail.com'; // Replace with your email
      const testOTP = '123456';
      
      console.log(`📤 Sending test OTP to: ${testEmail}`);
      
      await emailService.sendOTPEmail(testEmail, testOTP, 'Test User');
      
      console.log('🎉 SUCCESS! Test OTP email sent successfully!');
      console.log(`📱 Check your inbox at ${testEmail} for the OTP email`);
      
    } else {
      console.log('❌ Gmail connection failed - check your configuration');
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n🔧 Troubleshooting tips:');
    console.log('1. Make sure EMAIL_APP_PASSWORD is correct in .env');
    console.log('2. Verify EMAIL_USER is correct');
    console.log('3. Check that 2-Step Verification is enabled on Gmail');
  }
}

// Run the test
testGmailSetup();
