import sgMail from '@sendgrid/mail';

// Test SendGrid API key configuration
async function testSendGridConfig() {
  const apiKey = process.env.SENDGRID_API_KEY;
  
  console.log('=== SendGrid Configuration Test ===');
  console.log('API Key exists:', !!apiKey);
  console.log('API Key length:', apiKey ? apiKey.length : 0);
  console.log('API Key starts with SG.:', apiKey ? apiKey.startsWith('SG.') : false);
  
  if (!apiKey) {
    console.log('❌ No SendGrid API key found');
    return;
  }
  
  // Set the API key
  sgMail.setApiKey(apiKey);
  
  // Test with a real email send to validate the key
  try {
    const msg = {
      to: 'test@example.com', // This won't actually send since it's a test email
      from: 'no-reply@tdri-planner.com',
      subject: 'SendGrid Test',
      text: 'This is a test email to validate SendGrid configuration.',
      html: '<p>This is a test email to validate SendGrid configuration.</p>',
      mail_settings: {
        sandbox_mode: {
          enable: true // Enable sandbox mode to test without actually sending
        }
      }
    };
    
    await sgMail.send(msg);
    console.log('✅ SendGrid API key is valid and working');
  } catch (error: any) {
    console.log('❌ SendGrid API key test failed:');
    console.log('Error status:', error.code);
    console.log('Error message:', error.message);
    console.log('Full error response:', error.response?.body);
    
    if (error.code === 403) {
      console.log('🔑 This suggests the API key may be invalid or lack permissions');
    }
  }
}

testSendGridConfig().catch(console.error);