const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  // Hum testing ke liye Ethereal (Free temporary SMTP) ya Gmail SMTP use kar sakte hain
  const transporter = nodemailer.createTransport({
    host: 'smtp.mailtrap.io', // Ya apna Gmail SMTP (App Password ke sath)
    port: 2525,
    auth: {
      user: 'test_user',
      pass: 'test_password'
    }
  });

  // Fallback console log agar SMTP config na ho, taaki app crash na ho
  console.log(`[Email Simulation] To: ${options.email} | Subject: ${options.subject} | Message: ${options.message}`);
};

module.exports = sendEmail;