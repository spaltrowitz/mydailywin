const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const fetch = require("node-fetch");
const nodemailer = require("nodemailer");

admin.initializeApp();

// EmailJS credentials — for invitation emails
const EMAILJS_SERVICE_ID = "service_lzv2w8n";
const EMAILJS_TEMPLATE_ID = "template_ka99fef";
const EMAILJS_PUBLIC_KEY = "zj5fBo7DU8vtJg44g";

// Gmail app password for daily reminders
const GMAIL_APP_PASSWORD = defineSecret("GMAIL_APP_PASSWORD");

/**
 * sendInviteEmail — callable Cloud Function
 * Sends an admin invitation email via EmailJS REST API.
 * Requires authenticated caller.
 */
exports.sendInviteEmail = onCall(
  { region: "us-central1", cors: true },
  async (request) => {
    // Auth check
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "You must be signed in to send invitations."
      );
    }

    const { recipientEmail, senderName, profileName, profileId, appUrl } =
      request.data;

    // Validate required fields
    if (!recipientEmail || !profileName || !profileId || !appUrl) {
      throw new HttpsError(
        "invalid-argument",
        "Missing required fields: recipientEmail, profileName, profileId, appUrl"
      );
    }

    // Basic email format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
      throw new HttpsError("invalid-argument", "Invalid email address format.");
    }

    const adminUrl = `${appUrl}/admin.html?profile=${encodeURIComponent(profileId)}`;
    const loginUrl = `${appUrl}/login.html`;
    const guideUrl = `${appUrl}/admin-guide.html`;

    const templateParams = {
      to_email: recipientEmail,
      to_name: recipientEmail.split("@")[0],
      from_name: senderName || "A MyDailyWin user",
      profile_name: profileName,
      admin_url: adminUrl,
      login_url: loginUrl,
      guide_url: guideUrl,
      app_url: appUrl,
    };

    try {
      const response = await fetch(
        "https://api.emailjs.com/api/v1.0/email/send",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            service_id: EMAILJS_SERVICE_ID,
            template_id: EMAILJS_TEMPLATE_ID,
            user_id: EMAILJS_PUBLIC_KEY,
            template_params: templateParams,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("EmailJS API error:", response.status, errorText);
        throw new HttpsError(
          "internal",
          "Email service returned an error. Please try again."
        );
      }

      console.log(
        `✅ Invite email sent to ${recipientEmail} for profile ${profileId}`
      );
      return { success: true };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      console.error("Email send failed:", error);
      throw new HttpsError(
        "internal",
        "Failed to send invitation email. Please try again later."
      );
    }
  }
);

/**
 * sendDailyReminder — scheduled Cloud Function
 * Fires daily at 8:00 AM ET. Sends a reminder email via Gmail SMTP.
 */
exports.sendDailyReminder = onSchedule(
  {
    schedule: "0 8 * * *",
    timeZone: "America/New_York",
    region: "us-central1",
    secrets: [GMAIL_APP_PASSWORD],
  },
  async () => {
    const recipients = [
      { email: "stuartpaltrowitz@gmail.com", name: "Stu", profileId: "stu" }
    ];

    const quotes = [
      "Every day is a chance to get better. 💪",
      "Small daily improvements lead to big results. 🌟",
      "Your streak is waiting for you! 🔥",
      "A quick check-in keeps the momentum going. ⭐",
      "You've got tasks ready — let's earn some points! 🏆",
      "Consistency beats perfection. Keep it up! 💰",
      "Your daily win is just a tap away. ✨",
    ];
    const todayQuote = quotes[new Date().getDay() % quotes.length];

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "sharipaltrowitz@gmail.com",
        pass: GMAIL_APP_PASSWORD.value(),
      },
    });

    for (const recipient of recipients) {
      const appUrl = `https://my-daily-win.web.app/app.html?profile=${recipient.profileId}`;

      try {
        await transporter.sendMail({
          from: '"MyDailyWin" <sharipaltrowitz@gmail.com>',
          to: recipient.email,
          subject: "🏆 Your daily tasks are ready!",
          html: `
            <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 30px 20px;">
              <div style="text-align: center; margin-bottom: 25px;">
                <span style="font-size: 48px;">🏆</span>
                <h1 style="color: #2d6e01; font-size: 24px; margin: 10px 0 0;">MyDailyWin</h1>
              </div>
              <p style="font-size: 18px; color: #3c3c3c; line-height: 1.6;">Hey ${recipient.name}!</p>
              <p style="font-size: 18px; color: #595959; font-style: italic; line-height: 1.6;">${todayQuote}</p>
              <p style="font-size: 18px; color: #3c3c3c; line-height: 1.6;">Your tasks are ready — open the app and keep your streak going!</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${appUrl}" style="display: inline-block; background: #3d8a02; color: white; padding: 16px 32px; border-radius: 30px; font-size: 18px; font-weight: 700; text-decoration: none;">Open MyDailyWin →</a>
              </div>
              <p style="font-size: 14px; color: #999; text-align: center;">Keep that streak going! 🔥</p>
            </div>
          `,
        });
        console.log(`✅ Daily reminder sent to ${recipient.email}`);
      } catch (error) {
        console.error(`Reminder send error for ${recipient.email}:`, error);
      }
    }
  }
);
