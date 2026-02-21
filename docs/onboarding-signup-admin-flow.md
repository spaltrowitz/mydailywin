# Onboarding → Signup → Admin Dashboard Flow

```mermaid
flowchart TD
    A[User signs in / creates account on login.html] --> B[Click Create New Profile]
    B --> C[Store hr_pending_user_uid + hr_pending_user_email in sessionStorage]
    C --> D[Complete onboarding survey on get-started.html]
    D --> E[saveProfileSetup writes hr_profile_{profileId}]
    E --> F[Profile stores survey settings + ownerEmail/creatorEmail]
    E --> G[Link profile to hr_user_profiles_{uid}]
    E --> H[Summary shows app/admin links]
    H --> I[Open admin.html?profile={profileId}]
    I --> J[Admin auth checks profile owner via ownerEmail/creatorEmail]
    J --> K[Admin dashboard loads for owner]
    K --> L[Owner can invite additional admins]
    L --> M[Invite link sent to login + admin profile URL]
```

## Key invite/link touchpoints

- New owner access links are created on the onboarding summary page:
  - `/app.html?profile={profileId}`
  - `/admin.html?profile={profileId}`
- Additional admin invites are sent from **Admin → Additional Admins** and include:
  - A sign-in link (`/login.html`)
  - Admin access link for the specific profile (`/admin.html?profile={profileId}`)
