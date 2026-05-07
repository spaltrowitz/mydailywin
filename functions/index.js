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
          subject: `🏆 ${recipient.name}, your daily tasks are ready`,
          html: `
            <div style="font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #ffffff;">
              <!-- Header -->
              <div style="background: linear-gradient(135deg, #4a9e06, #2d6e01); padding: 32px 24px; text-align: center; border-radius: 0 0 24px 24px;">
                <div style="font-size: 40px; margin-bottom: 8px;">🏆</div>
                <div style="color: white; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">MyDailyWin</div>
              </div>

              <!-- Body -->
              <div style="padding: 28px 24px;">
                <p style="font-size: 20px; color: #1a1a1a; margin: 0 0 16px; font-weight: 700;">Good morning, ${recipient.name}!</p>
                
                <!-- Quote Card -->
                <div style="background: #f0fdf4; border-left: 4px solid #4a9e06; border-radius: 0 12px 12px 0; padding: 16px 20px; margin-bottom: 24px;">
                  <p style="font-size: 16px; color: #2d6e01; margin: 0; font-style: italic; line-height: 1.5;">"${todayQuote}"</p>
                </div>

                <p style="font-size: 16px; color: #555; line-height: 1.6; margin: 0 0 28px;">Your tasks are ready. Open the app, check a few off, and keep your streak alive.</p>

                <!-- CTA Button -->
                <div style="text-align: center; margin-bottom: 28px;">
                  <a href="${appUrl}" style="display: inline-block; background: #3d8a02; color: white; padding: 16px 40px; border-radius: 50px; font-size: 17px; font-weight: 700; text-decoration: none; letter-spacing: 0.3px;">Open MyDailyWin →</a>
                </div>

                <!-- Footer -->
                <div style="border-top: 1px solid #eee; padding-top: 16px; text-align: center;">
                  <p style="font-size: 13px; color: #999; margin: 0;">Keep that streak going! 🔥</p>
                </div>
              </div>
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
