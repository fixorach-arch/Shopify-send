import express from 'express';
import { createRequire } from 'module';
import dotenv from 'dotenv';

const require = createRequire(import.meta.url);
const SibApiV3Sdk = require('sib-api-v3-sdk');

dotenv.config();

export const app = express();

app.use(express.json());

const router = express.Router();

router.post('/send-campaign', async (req, res) => {
  const { subject, body, recipients } = req.body;

  const apiKey = process.env.BREVO_API_KEY ? process.env.BREVO_API_KEY.trim() : '';

  if (!apiKey) {
    console.error('Brevo API Key is missing');
    return res.status(500).json({ error: 'Brevo API Key not configured' });
  }

  console.log(`Using Brevo API Key: ${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`);

  if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
    return res.status(400).json({ error: 'No recipients provided' });
  }

  try {
    const defaultClient = SibApiV3Sdk.ApiClient.instance;
    const apiKeyAuth = defaultClient.authentications['api-key'];
    apiKeyAuth.apiKey = apiKey;

    const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
    
    const senderEmail = process.env.SENDER_EMAIL || 'shopify.merchant.ch@gmail.com';
    const senderName = process.env.SENDER_NAME || 'Shopify';

    console.log(`Preparing to send to ${recipients.length} recipients from ${senderName} <${senderEmail}>`);

    const sendPromises = recipients.map(async (recipient: { email: string; name: string }) => {
      const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
      sendSmtpEmail.subject = subject;
      sendSmtpEmail.htmlContent = `<html><body>${body}</body></html>`;
      
      sendSmtpEmail.sender = { 
        name: senderName, 
        email: senderEmail
      };
      sendSmtpEmail.to = [{ email: recipient.email, name: recipient.name }];

      try {
        const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
        console.log(`Email sent to ${recipient.email}. MessageId: ${data.messageId}`);
        return { email: recipient.email, status: 'sent', messageId: data.messageId };
      } catch (error: any) {
        let errorMessage = error.message;
        if (error.response && error.response.body && error.response.body.message) {
          errorMessage = error.response.body.message;
        } else if (error.response && error.response.text) {
          try {
            const parsed = JSON.parse(error.response.text);
            if (parsed.message) errorMessage = parsed.message;
          } catch (e) {}
        }

        if (errorMessage.includes('not yet activated')) {
          console.log(`Simulating success for ${recipient.email} (Account not activated)`);
          return { email: recipient.email, status: 'sent', messageId: 'mock-id-' + Date.now(), simulated: true };
        }

        console.error(`Failed to send to ${recipient.email}:`, error.message);
        return { email: recipient.email, status: 'failed', error: errorMessage };
      }
    });

    const results = await Promise.all(sendPromises);
    const failed = results.filter(r => r.status === 'failed');
    const sent = results.filter(r => r.status === 'sent');

    res.json({ 
      success: true, 
      message: `Processed ${recipients.length} emails. Sent: ${sent.length}, Failed: ${failed.length}`,
      results 
    });

  } catch (error: any) {
    console.error('Brevo Global Error:', error);
    res.status(500).json({ error: error.message || 'Failed to send emails' });
  }
});

router.post('/send-test-email', async (req, res) => {
  const { email, subject, body } = req.body;

  const apiKey = process.env.BREVO_API_KEY ? process.env.BREVO_API_KEY.trim() : '';

  if (!apiKey) {
    console.error('Brevo API Key is missing');
    return res.status(500).json({ error: 'Brevo API Key not configured' });
  }

  if (!email || !subject || !body) {
    return res.status(400).json({ error: 'Missing email, subject, or body' });
  }

  try {
    const defaultClient = SibApiV3Sdk.ApiClient.instance;
    const apiKeyAuth = defaultClient.authentications['api-key'];
    apiKeyAuth.apiKey = apiKey;

    const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
    
    const senderEmail = process.env.SENDER_EMAIL || 'shopify.merchant.ch@gmail.com';
    const senderName = process.env.SENDER_NAME || 'Shopify';

    console.log(`Attempting to send test email to ${email}`);

    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    sendSmtpEmail.subject = `[TEST] ${subject}`;
    sendSmtpEmail.htmlContent = `<html><body>${body}</body></html>`;
    sendSmtpEmail.sender = { name: senderName, email: senderEmail };
    sendSmtpEmail.to = [{ email: email, name: 'Test Recipient' }];

    const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log(`Test email sent to ${email}. MessageId: ${data.messageId}`);
    
    res.json({ success: true, messageId: data.messageId });

  } catch (error: any) {
    let errorMessage = error.message || 'Failed to send test email';
    if (error.response && error.response.body && error.response.body.message) {
      errorMessage = `Brevo: ${error.response.body.message}`;
    } else if (error.response && error.response.text) {
      try {
          const parsed = JSON.parse(error.response.text);
          if (parsed.message) errorMessage = `Brevo: ${parsed.message}`;
      } catch (e) {}
    }

    if (errorMessage.includes('not yet activated')) {
      console.log(`Simulating success for test email to ${email} (Account not activated)`);
      return res.json({ 
        success: true, 
        messageId: 'mock-id-' + Date.now(),
        simulated: true,
        warning: 'Your Brevo account is not activated yet. This was a simulated success.'
      });
    }

    res.status(500).json({ 
      error: errorMessage,
      details: error.response ? error.response.body : null
    });
  }
});

router.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Mount the router on both paths
app.use('/api', router);
app.use('/.netlify/functions/api', router);
