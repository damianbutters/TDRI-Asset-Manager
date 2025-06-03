import sgMail from '@sendgrid/mail';
import { randomBytes } from 'crypto';
import { db, pool } from './db';
import { users, magicLinks } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Check if SendGrid API key exists
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;

// Dynamically determine the app URL based on environment
const getAppUrl = () => {
  // Check for explicit APP_URL environment variable first
  if (process.env.APP_URL) {
    return process.env.APP_URL;
  }
  
  // Check for Replit deployment domain
  if (process.env.REPLIT_DOMAINS) {
    const domains = process.env.REPLIT_DOMAINS.split(',');
    if (domains.length > 0) {
      return `https://${domains[0]}`;
    }
  }
  
  // Check for other common deployment environment variables
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  
  if (process.env.RAILWAY_STATIC_URL) {
    return process.env.RAILWAY_STATIC_URL;
  }
  
  if (process.env.RENDER_EXTERNAL_URL) {
    return process.env.RENDER_EXTERNAL_URL;
  }
  
  // Fallback to localhost for development
  return 'http://localhost:5000';
};

const APP_URL = getAppUrl();

// Log the detected URL for debugging
console.log('Detected APP_URL:', APP_URL);

// Define email sender - customize this as needed
const EMAIL_SENDER = 'support@tdrisolutions.com';

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
    // Find user by email using direct SQL
    const findUserQuery = `
      SELECT * FROM users WHERE email = $1
    `;
    const userResult = await pool.query(findUserQuery, [email]);
    const user = userResult.rows[0];
    
    if (!user) {
      console.error(`No user found with email: ${email}`);
      return false;
    }

    // Generate a secure random token
    const token = randomBytes(32).toString('hex');
    
    // Set expiration time (1 hour from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);
    
    // Insert the magic link using direct SQL
    const insertTokenQuery = `
      INSERT INTO magic_links (user_id, token, expires_at, used)
      VALUES ($1, $2, $3, $4)
    `;
    await pool.query(insertTokenQuery, [user.id, token, expiresAt, false]);
    
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
      } catch (emailError: any) {
        console.error('=== SendGrid Email Error Details ===');
        console.error('Error code:', emailError.code);
        console.error('Error message:', emailError.message);
        console.error('Response status:', emailError.response?.status);
        console.error('Response body errors:', JSON.stringify(emailError.response?.body?.errors, null, 2));
        console.error('Full response body:', JSON.stringify(emailError.response?.body, null, 2));
        
        if (emailError.code === 403) {
          console.error('FORBIDDEN ERROR: This likely means:');
          console.error('1. The sender email "support@tdrisolutions.com" is not verified in SendGrid');
          console.error('2. Your SendGrid account needs sender authentication setup');
          console.error('3. Domain authentication may be required');
        }
        
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
    // Find the magic link in the database using direct SQL
    const findTokenQuery = `
      SELECT * FROM magic_links WHERE token = $1
    `;
    const tokenResult = await pool.query(findTokenQuery, [token]);
    const magicLink = tokenResult.rows[0];
    
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
    const updateTokenQuery = `
      UPDATE magic_links SET used = true WHERE id = $1
    `;
    await pool.query(updateTokenQuery, [magicLink.id]);
    
    // Return success with the user ID
    return { valid: true, userId: magicLink.user_id };
  } catch (error) {
    console.error('Error verifying magic link token:', error);
    return { valid: false, error: 'Server error' };
  }
}