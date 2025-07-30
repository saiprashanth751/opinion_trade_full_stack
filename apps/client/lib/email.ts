import nodemailer from 'nodemailer';
import { randomBytes } from 'crypto';
import prisma from '@repo/db/client';

// Create transporter - FIXED: use createTransport instead of createTransporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

export async function sendVerificationEmail(email: string) {
  try {
    // Generate verification token
    const token = randomBytes(32).toString('hex');
    const expires = new Date();
    expires.setHours(expires.getHours() + 24); // Token expires in 24 hours

    // Delete any existing tokens for this email
    await prisma.emailVerificationToken.deleteMany({
      where: { email },
    });

    // Create new verification token
    await prisma.emailVerificationToken.create({
      data: {
        email,
        token,
        expires,
      },
    });

    const verificationUrl = `${process.env.NEXTAUTH_URL}/auth/verify-email?token=${token}`;

    // Send email
    await transporter.sendMail({
      from: process.env.FROM_EMAIL,
      to: email,
      subject: 'Verify your email address',
      html: `
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
          <h2 style="color: #333; text-align: center;">Verify Your Email Address</h2>
          <p style="color: #666; font-size: 16px;">
            Thank you for signing up! Please click the button below to verify your email address.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="background-color: #000; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Verify Email
            </a>
          </div>
          <p style="color: #999; font-size: 14px;">
            If the button doesn't work, you can copy and paste this link into your browser:
          </p>
          <p style="color: #999; font-size: 14px; word-break: break-all;">
            ${verificationUrl}
          </p>
          <p style="color: #999; font-size: 14px;">
            This link will expire in 24 hours.
          </p>
        </div>
      `,
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to send verification email:', error);
    return { success: false, error: 'Failed to send verification email' };
  }
}

export async function verifyEmailToken(token: string) {
  try {
    const verificationToken = await prisma.emailVerificationToken.findUnique({
      where: { token },
    });

    if (!verificationToken) {
      return { success: false, error: 'Invalid verification token' };
    }

    if (verificationToken.expires < new Date()) {
      // Delete expired token
      await prisma.emailVerificationToken.delete({
        where: { token },
      });
      return { success: false, error: 'Verification token has expired' };
    }

    // Update user's email verification status
    await prisma.user.update({
      where: { email: verificationToken.email },
      data: { emailVerified: new Date() },
    });

    // Delete the used token
    await prisma.emailVerificationToken.delete({
      where: { token },
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to verify email token:', error);
    return { success: false, error: 'Failed to verify email' };
  }
}