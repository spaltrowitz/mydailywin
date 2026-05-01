        // Hamburger menu toggle
        function toggleMenu() {
            document.querySelector('.hamburger').classList.toggle('active');
            document.querySelector('.menu-overlay').classList.toggle('active');
            document.querySelector('.slide-menu').classList.toggle('active');
        }

        // Load user profiles from localStorage
        function loadProfiles() {
            const profilesList = document.getElementById('profilesList');
            const profilesSection = document.getElementById('profilesSection');
            let profiles = [];

            // Check for legacy Stu profile
            const stuState = localStorage.getItem('hr_state');
            if (stuState) {
                profiles.push({ id: 'stu', name: 'Stu', isLegacy: true });
            }

            // Check for other profiles
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.startsWith('hr_profile_') && !key.includes('admins') && !key.includes('invites')) {
                    try {
                        const profileId = key.replace('hr_profile_', '');
                        const data = JSON.parse(localStorage.getItem(key));
                        if (data.name && !profiles.find(p => p.id === profileId)) {
                            profiles.push({ id: profileId, name: data.name });
                        }
                    } catch (e) {}
                }
            }

            if (profiles.length === 0) {
                profilesSection.style.display = 'none';
                return;
            }

            profilesSection.style.display = 'block';
            profilesList.innerHTML = profiles.map(p => `
                <a href="app.html?profile=${p.id}" class="profile-card">
                    <div class="profile-avatar">${p.name.charAt(0).toUpperCase()}</div>
                    <div class="profile-info">
                        <div class="profile-name">${p.name}</div>
                        <div class="profile-role">Open App</div>
                    </div>
                    <span style="color: var(--primary);">→</span>
                </a>
                <a href="admin.html?profile=${p.id}" class="menu-link" style="margin-left: 52px; padding: 8px 15px; font-size: 13px;">
                    ⚙️ Admin Dashboard
                </a>
            `).join('');
        }

        // Close menu on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && document.querySelector('.slide-menu').classList.contains('active')) {
                toggleMenu();
            }
            if (e.key === 'Escape' && document.querySelector('.demo-modal').classList.contains('active')) {
                closeDemo();
            }
        });

        // Load profiles on page load
        loadProfiles();

        // Demo Modal Functions
        function openDemo() {
            document.querySelector('.demo-modal').classList.add('active');
            document.body.style.overflow = 'hidden';
        }

        function closeDemo() {
            document.querySelector('.demo-modal').classList.remove('active');
            document.body.style.overflow = '';
        }

        // PWA Install Prompt
        let deferredInstallPrompt = null;

        window.addEventListener('beforeinstallprompt', function(e) {
            e.preventDefault();
            deferredInstallPrompt = e;
            document.getElementById('pwaInstallBannerHome').style.display = 'block';
        });

        window.addEventListener('appinstalled', function() {
            document.getElementById('pwaInstallBannerHome').style.display = 'none';
            deferredInstallPrompt = null;
        });

        function triggerInstallPrompt() {
            if (deferredInstallPrompt) {
                deferredInstallPrompt.prompt();
                deferredInstallPrompt.userChoice.then(function(result) {
                    document.getElementById('pwaInstallBannerHome').style.display = 'none';
                    deferredInstallPrompt = null;
                });
            }
        }

// ========== EVENT DELEGATION (CSP-compliant, replaces inline handlers) ==========
document.addEventListener('click', function(e) {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const action = el.getAttribute('data-action');

    switch(action) {
        case 'toggleMenu': toggleMenu(); break;
        case 'triggerInstallPrompt': triggerInstallPrompt(); break;
        case 'openDemo': openDemo(); break;
        case 'closeDemo': closeDemo(); break;
        case 'inline-1':
            // Close demo modal when clicking backdrop
            if (e.target === el) closeDemo();
            break;
    }
});
