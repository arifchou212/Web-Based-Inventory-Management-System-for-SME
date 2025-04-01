const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

admin.initializeApp();

// Configure nodemailer with your email service (e.g., Gmail)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "your-email@gmail.com", // Replace with your email
    pass: "your-email-password", // Replace with your email password or app-specific password
  },
});

// Function to send email on signup
exports.sendSignupEmail = functions.firestore
  .document("users/{userId}")
  .onCreate(async (snapshot, context) => {
    const userData = snapshot.data();
    const { email, firstName, lastName, role } = userData;

    const mailOptions = {
      from: "your-email@gmail.com",
      to: email,
      subject: "Welcome to the Inventory Management System",
      text: `Hello ${firstName} ${lastName},\n\nWelcome to the Inventory Management System! Your account has been successfully created.\n\nYour Role: ${role}\n\nSystem Functionalities:\n- Manage inventory\n- Track orders\n- Generate reports\n\nThank you for joining us!\n\nBest regards,\nThe Inventory Management Team`,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log("Signup email sent to:", email);
    } catch (error) {
      console.error("Error sending signup email:", error);
    }
  });

// Function to send email on login
exports.sendLoginEmail = functions.https.onCall(async (data, context) => {
  const { email, firstName, lastName, role } = data;

  const mailOptions = {
    from: "your-email@gmail.com",
    to: email,
    subject: "New Login to the Inventory Management System",
    text: `Hello ${firstName} ${lastName},\n\nA new login was detected for your account.\n\nYour Role: ${role}\n\nSystem Functionalities:\n- Manage inventory\n- Track orders\n- Generate reports\n\nIf this was not you, please contact support immediately.\n\nBest regards,\nThe Inventory Management Team`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("Login email sent to:", email);
    return { success: true };
  } catch (error) {
    console.error("Error sending login email:", error);
    return { success: false, error: error.message };
  }
});
