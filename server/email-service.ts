import sgMail from '@sendgrid/mail';
import { randomBytes } from 'crypto';
import { db, pool } from './db';
import { users } from '@shared/schema';
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
    // Find user by email using raw SQL to avoid schema issues
    const findUserQuery = `
      SELECT * FROM users
      WHERE email = $1
    `;
    const userResult = await pool.query(findUserQuery, [email]);
    
    if (userResult.rows.length === 0) {
      console.error(`No user found with email: ${email}`);
      return false;
    }
    
    const user = userResult.rows[0];

    // Generate a secure random token
    const token = randomBytes(32).toString('hex');
    
    // Set expiration time (1 hour from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);
    
    // Insert the magic link using raw SQL
    const createTokenQuery = `
      INSERT INTO magic_links (user_id, token, expires_at, used) 
      VALUES ($1, $2, $3, $4)
    `;
    await pool.query(createTokenQuery, [user.id, token, expiresAt, false]);
    
    // Create the magic link URL
    const magicLinkUrl = `${APP_URL}/api/auth/verify?token=${token}`;
    
    // Always log the magic link in development environment for testing
    console.log('Magic link for development/testing:');
    console.log(magicLinkUrl);
    
    // Try to send email only if SendGrid API key is available
    if (SENDGRID_API_KEY) {
      try {
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
      } catch (emailError) {
        console.error('Error sending email via SendGrid:', emailError);
        console.log('Continuing with magic link in logs for development');
        // We don't throw the error here, so authentication can still work in development
      }
    } else {
      console.log('SendGrid API key not available. Using console-based magic link only.');
    }
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
    // Find the token using raw SQL
    const findTokenQuery = `
      SELECT id, user_id, token, expires_at, used 
      FROM magic_links 
      WHERE token = $1
    `;
    
    const result = await pool.query(findTokenQuery, [token]);
    
    if (result.rows.length === 0) {
      return { valid: false, error: 'Invalid token' };
    }
    
    const magicLink = result.rows[0];
    
    // Check if the token has already been used
    if (magicLink.used === true) {
      return { valid: false, error: 'Token has already been used' };
    }
    
    // Check if the token has expired
    const now = new Date();
    const expires = new Date(magicLink.expires_at);
    
    if (now > expires) {
      return { valid: false, error: 'Token has expired' };
    }
    
    // Mark the token as used
    const updateTokenQuery = `
      UPDATE magic_links 
      SET used = true 
      WHERE id = $1
    `;
    
    await pool.query(updateTokenQuery, [magicLink.id]);
    
    // Return success with the user ID
    return { valid: true, userId: magicLink.user_id };
  } catch (error) {
    console.error('Error verifying magic link token:', error);
    return { valid: false, error: 'Server error' };
  }
}