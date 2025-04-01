import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.SMTP_EMAIL, 
        pass: process.env.SMTP_PASSWORD, 
    },
});

export const sendVerificationEmail = async (toEmail, verificationLink) => {
    try {
        const mailOptions = {
            from: `"Inventory Management Team" <${process.env.SMTP_EMAIL}>`,
            to: toEmail,
            subject: "Verify Your Email - Inventory Management System",
            text: `Click the link to verify your email: ${verificationLink}`,
            html: `<p>Click the link below to verify your email:</p><a href="${verificationLink}">Verify Email</a>`,
        };

        await transporter.sendMail(mailOptions);
        console.log("✅ Verification email sent!");
    } catch (error) {
        console.error("❌ Error sending email:", error);
    }
};