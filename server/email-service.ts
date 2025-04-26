import sgMail from '@sendgrid/mail';
import { randomBytes } from 'crypto';
import { db, pool } from './db';
import { magicLinks, users } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Check if SendGrid API key exists
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const APP_URL = process.env.APP_URL || 'http://localhost:5000';

// Define email sender - customize this as needed
const EMAIL_SENDER = 'no-reply@tdri-planner.com';

// Setup SendGrid client if API key is available
if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
  console.log('SendGrid client initialized');
} else {
  console.warn('SENDGRID_API_KEY not found. Email functionality will be limited.');
}

/**
 * Send a magic link email to the user
 */
export async function sendMagicLinkEmail(email: string): Promise<boolean> {
  try {
    // Find user by email
    const query = `
      SELECT * FROM users 
      WHERE email = $1
    `;
    
    const result = await pool.query(query, [email]);
    const user = result.rows[0];
    
    if (!user) {
      console.error(`No user found with email: ${email}`);
      return false;
    }

    // Generate a secure random token
    const token = randomBytes(32).toString('hex');
    
    // Set expiration time (1 hour from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);
    
    // Store the token in the database
    await db.insert(magicLinks).values({
      userId: user.id,
      token,
      expiresAt,
      used: false
    });
    
    // Create the magic link URL
    const magicLinkUrl = `${APP_URL}/api/auth/verify?token=${token}`;
    
    // If SendGrid API key is not available, just log the magic link for development
    if (!SENDGRID_API_KEY) {
      console.log('SendGrid API key not available. Magic link for development:');
      console.log(magicLinkUrl);
      return true;
    }
    
    // Prepare email message
    const msg = {
      to: email,
      from: EMAIL_SENDER,
      subject: 'Your Login Link for TDRIPlanner',
      text: `Click this link to log in: ${magicLinkUrl}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3b82f6;">Welcome to TDRIPlanner</h2>
          <p>You requested a magic link to sign in to your account.</p>
          <p>This link will expire in 1 hour and can only be used once.</p>
          <a href="${magicLinkUrl}" 
             style="display: inline-block; background-color: #3b82f6; color: white; 
                    padding: 12px 24px; text-decoration: none; border-radius: 4px; 
                    margin: 20px 0;">
            Sign In to TDRIPlanner
          </a>
          <p style="color: #6b7280; font-size: 14px;">If you didn't request this link, you can safely ignore this email.</p>
        </div>
      `
    };
    
    // Send the email
    await sgMail.send(msg);
    console.log(`Magic link email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('Error sending magic link email:', error);
    return false;
  }
}

/**
 * Verify a magic link token
 */
export async function verifyMagicLinkToken(token: string): Promise<{
  valid: boolean;
  userId?: number;
  error?: string;
}> {
  try {
    // Find the magic link in the database
    const query = `
      SELECT * FROM magic_links 
      WHERE token = $1
    `;
    
    const result = await pool.query(query, [token]);
    const magicLink = result.rows[0];
    
    if (!magicLink) {
      return { valid: false, error: 'Invalid token' };
    }
    
    // Check if the token has already been used
    if (magicLink.used) {
      return { valid: false, error: 'Token has already been used' };
    }
    
    // Check if the token has expired
    if (new Date() > new Date(magicLink.expires_at)) {
      return { valid: false, error: 'Token has expired' };
    }
    
    // Mark the token as used
    const updateQuery = `
      UPDATE magic_links
      SET used = true
      WHERE id = $1
    `;
    
    await pool.query(updateQuery, [magicLink.id]);
    
    // Return success with the user ID
    return { valid: true, userId: magicLink.user_id };
  } catch (error) {
    console.error('Error verifying magic link token:', error);
    return { valid: false, error: 'Server error' };
  }
}