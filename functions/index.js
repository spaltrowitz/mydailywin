/**
 * HabitRewards Cloud Functions
 * 
 * Handles email sending for admin invitations
 */

const { setGlobalOptions, defineString } = require("firebase-functions/params");
const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const sgMail = require("@sendgrid/mail");

// Define parameters (set via Firebase console or CLI)
const sendgridApiKey = defineString("SENDGRID_API_KEY");
const senderEmail = defineString("SENDER_EMAIL");

// Cost control - limit concurrent instances
setGlobalOptions({ maxInstances: 10 });

/**
 * Send admin invitation email
 * 
 * Expects POST body:
 * {
 *   recipientEmail: string,
 *   recipientName: string,
 *   profileName: string,
 *   profileId: string,
 *   senderName: string,
 *   appUrl: string
 * }
 */
exports.sendAdminInvite = onRequest(
  { cors: true },
  async (request, response) => {
    // Only allow POST
    if (request.method !== "POST") {
      response.status(405).json({ error: "Method not allowed" });
      return;
    }

    try {
      const {
        recipientEmail,
        recipientName,
        profileName,
        profileId,
        senderName,
        appUrl,
      } = request.body;

      // Validate required fields
      if (!recipientEmail || !profileName || !profileId || !senderName) {
        response.status(400).json({ error: "Missing required fields" });
        return;
      }

      // Initialize SendGrid
      sgMail.setApiKey(sendgridApiKey.value());

      // Build the URLs
      const baseUrl = appUrl || "https://habitrewards-131.web.app";
      const adminUrl = `${baseUrl}/admin.html?profile=${encodeURIComponent(profileId)}`;
      const guideUrl = `${baseUrl}/admin-guide.html`;

      // Create email HTML
      const emailHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #4f46e5; margin: 0;">
              <a href="${baseUrl}" style="color: #4f46e5; text-decoration: none;">HabitRewards</a>
            </h1>
            <p style="color: #6b7280; margin-top: 5px;">Gamified Habit Tracking</p>
          </div>
          
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 30px; color: white; margin-bottom: 20px;">
            <h2 style="margin: 0 0 15px 0;">You're Invited! 🎉</h2>
            <p style="margin: 0; font-size: 16px; line-height: 1.6;">
              <strong>${senderName}</strong> has invited you to become an admin for <strong>${profileName}</strong>'s HabitRewards profile.
            </p>
          </div>
          
          <div style="background: #f9fafb; border-radius: 12px; padding: 25px; margin-bottom: 20px;">
            <h3 style="color: #374151; margin: 0 0 15px 0;">What can you do as an admin?</h3>
            <ul style="color: #4b5563; padding-left: 20px; margin: 0;">
              <li style="margin-bottom: 8px;">✅ Create and manage habits</li>
              <li style="margin-bottom: 8px;">🎁 Add rewards to the catalog</li>
              <li style="margin-bottom: 8px;">📊 Track progress and streaks</li>
              <li style="margin-bottom: 8px;">💰 Set point values (100 pts = $1.00)</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${adminUrl}" 
               style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 15px 40px; border-radius: 30px; font-weight: 600; font-size: 16px;">
              Accept Invitation
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; text-align: center;">
            New to HabitRewards? <a href="${guideUrl}" style="color: #4f46e5;">Read our Admin Guide</a> to get started.
          </p>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          
          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
            This invitation was sent by ${senderName} via 
            <a href="${baseUrl}" style="color: #4f46e5;">HabitRewards</a>.
            <br>If you weren't expecting this, you can safely ignore this email.
          </p>
        </div>
      `;

      // Create plain text version
      const emailText = `
You're Invited to HabitRewards!

${senderName} has invited you to become an admin for ${profileName}'s HabitRewards profile.

As an admin, you can:
- Create and manage habits
- Add rewards to the catalog
- Track progress and streaks
- Set point values (100 pts = $1.00)

Accept the invitation here: ${adminUrl}

New to HabitRewards? Read our Admin Guide: ${guideUrl}

---
This invitation was sent by ${senderName} via HabitRewards (${baseUrl}).
If you weren't expecting this, you can safely ignore this email.
      `.trim();

      // Send the email
      const msg = {
        to: recipientEmail,
        from: senderEmail.value(),
        subject: `${senderName} invited you to manage ${profileName}'s HabitRewards`,
        text: emailText,
        html: emailHtml,
      };

      await sgMail.send(msg);

      logger.info("Admin invitation sent successfully", {
        to: recipientEmail,
        profileId,
        senderName,
      });

      response.status(200).json({ 
        success: true, 
        message: "Invitation sent successfully" 
      });

    } catch (error) {
      logger.error("Error sending admin invitation", { error: error.message });
      
      response.status(500).json({ 
        success: false, 
        error: "Failed to send invitation email" 
      });
    }
  }
);
