const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const sendEmail = async (to, subject, html) => {
  try {
    await transporter.sendMail({
      from: `"LastMile Delivery" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html
    });
    console.log(`Email sent to ${to}`);
  } catch (err) {
    console.error('Email send failed:', err.message);
  }
};

const statusEmailTemplate = (customerName, orderId, status, note = '') => `
  <div style="font-family: Arial, sans-serif; padding: 20px; background: #f9f9f9;">
    <div style="max-width: 600px; margin: auto; background: white; border-radius: 8px; padding: 30px; border-top: 4px solid #2563eb;">
      <h2 style="color: #2563eb;">LastMile Delivery Tracker</h2>
      <p>Hi <strong>${customerName}</strong>,</p>
      <p>Your order <strong>#${orderId}</strong> status has been updated.</p>
      <div style="background: #eff6ff; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <p style="margin:0; font-size: 18px; font-weight: bold; color: #1e40af;">📦 ${status}</p>
        ${note ? `<p style="margin: 8px 0 0; color: #555;">${note}</p>` : ''}
      </div>
      <p style="color: #888; font-size: 13px;">Log in to your dashboard to view full tracking timeline.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="color: #aaa; font-size: 12px;">LastMile Delivery Tracker &mdash; Automated Notification</p>
    </div>
  </div>
`;

const rescheduleEmailTemplate = (customerName, orderId, newDate) => `
  <div style="font-family: Arial, sans-serif; padding: 20px; background: #f9f9f9;">
    <div style="max-width: 600px; margin: auto; background: white; border-radius: 8px; padding: 30px; border-top: 4px solid #dc2626;">
      <h2 style="color: #dc2626;">Delivery Attempt Failed</h2>
      <p>Hi <strong>${customerName}</strong>,</p>
      <p>We were unable to deliver your order <strong>#${orderId}</strong>.</p>
      <p>Your delivery has been <strong>rescheduled for ${newDate}</strong>. A new agent will be assigned.</p>
      <p style="color: #888; font-size: 13px;">For any queries, please contact our support team.</p>
    </div>
  </div>
`;

module.exports = { sendEmail, statusEmailTemplate, rescheduleEmailTemplate };
