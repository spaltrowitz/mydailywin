        function togglePassword() {
            const pw = document.getElementById('password');
            const btn = document.getElementById('togglePwBtn');
            if (pw.type === 'password') {
                pw.type = 'text';
                btn.textContent = '🙈';
                btn.setAttribute('aria-label', 'Hide password');
            } else {
                pw.type = 'password';
                btn.textContent = '👁️';
                btn.setAttribute('aria-label', 'Show password');
            }
        }

        const auth = firebase.auth();
        
        // Check for redirect URL parameter
        const urlParams = new URLSearchParams(window.location.search);
        const redirectUrl = urlParams.get('redirect');

        // Prevent open-redirect attacks: only allow relative paths or same-origin URLs
        function isSafeRedirect(url) {
            if (!url) return false;
            if (url.startsWith('/') && !url.startsWith('//')) return true;
            try {
                return new URL(url).origin === window.location.origin;
            } catch {
                return false;
            }
        }

        // Check auth state on load
        auth.onAuthStateChanged(user => {
            if (user) {
                // Check if there's a pending profile to link (from admin page redirect)
                const pendingProfile = sessionStorage.getItem('hr_pending_profile');
                const pendingProfileName = sessionStorage.getItem('hr_pending_profile_name');
                if (pendingProfile) {
                    const userProfilesKey = 'hr_user_profiles_' + user.uid;
                    let userProfiles = JSON.parse(localStorage.getItem(userProfilesKey) || '[]');
                    if (!userProfiles.find(p => p.id === pendingProfile)) {
                        userProfiles.push({ id: pendingProfile, name: pendingProfileName || pendingProfile });
                        localStorage.setItem(userProfilesKey, JSON.stringify(userProfiles));
                    }
                    sessionStorage.removeItem('hr_pending_profile');
                    sessionStorage.removeItem('hr_pending_profile_name');
                    
                    // If there's a redirect URL, go there (origin-validated)
                    if (redirectUrl && isSafeRedirect(redirectUrl)) {
                        window.location.href = redirectUrl;
                        return;
                    }
                }
                
                showUserLoggedIn(user);
                loadUserProfiles(user);
            } else {
                showLoginForm();
            }
        });

        function showError(message) {
            const el = document.getElementById('errorMessage');
            el.textContent = message;
            el.classList.add('show');
        }

        function hideError() {
            document.getElementById('errorMessage').classList.remove('show');
        }

        function showLoading() {
            document.getElementById('loading').classList.add('show');
            document.getElementById('authButtons').style.display = 'none';
        }

        function hideLoading() {
            document.getElementById('loading').classList.remove('show');
        }

        function showUserLoggedIn(user) {
            hideLoading();
            document.getElementById('authButtons').style.display = 'none';
            document.getElementById('userInfo').classList.add('show');
            document.getElementById('userName').textContent = user.displayName || 'User';
            document.getElementById('userEmail').textContent = user.email;
            
            const avatar = document.getElementById('userAvatar');
            if (user.photoURL) {
                const img = document.createElement('img');
                img.src = user.photoURL || '';
                img.alt = 'Avatar';
                avatar.innerHTML = '';
                avatar.appendChild(img);
            } else {
                avatar.textContent = (user.displayName || user.email || 'U')[0].toUpperCase();
            }
        }

        function showLoginForm() {
            hideLoading();
            document.getElementById('authButtons').style.display = 'block';
            document.getElementById('userInfo').classList.remove('show');
            document.getElementById('profileSection').style.display = 'none';
        }

        function showEmailForm() {
            document.getElementById('emailForm').classList.add('active');
            document.getElementById('resetForm').classList.remove('active');
        }

        function showSuccess(message) {
            const el = document.getElementById('successMessage');
            el.textContent = message;
            el.classList.add('show');
        }

        function hideSuccess() {
            document.getElementById('successMessage').classList.remove('show');
        }

        function showResetForm() {
            hideError();
            hideSuccess();
            const emailVal = document.getElementById('email').value;
            document.getElementById('resetEmail').value = emailVal;
            document.getElementById('emailForm').classList.remove('active');
            document.getElementById('resetForm').classList.add('active');
        }

        function hideResetForm() {
            hideError();
            hideSuccess();
            document.getElementById('resetForm').classList.remove('active');
            document.getElementById('emailForm').classList.add('active');
        }

        async function sendResetEmail() {
            hideError();
            hideSuccess();
            const email = document.getElementById('resetEmail').value.trim();

            if (!email) {
                showError('Please enter your email address.');
                return;
            }

            try {
                await auth.sendPasswordResetEmail(email);
                hideError();
                showSuccess('Reset link sent! Check your email.');
            } catch (error) {
                if (error.code === 'auth/user-not-found') {
                    showError('No account found with that email.');
                } else if (error.code === 'auth/invalid-email') {
                    showError('Please enter a valid email address.');
                } else if (error.code === 'auth/too-many-requests') {
                    showError('Too many attempts. Please try again later.');
                } else {
                    showError('Something went wrong. Please try again.');
                }
            }
        }

        async function signInWithGoogle() {
            hideError();
            hideSuccess();
            showLoading();
            try {
                const provider = new firebase.auth.GoogleAuthProvider();
                await auth.signInWithPopup(provider);
            } catch (error) {
                hideLoading();
                showError(error.message);
            }
        }

        async function signInWithApple() {
            hideError();
            hideSuccess();
            showLoading();
            try {
                const provider = new firebase.auth.OAuthProvider('apple.com');
                provider.addScope('email');
                provider.addScope('name');
                await auth.signInWithPopup(provider);
            } catch (error) {
                hideLoading();
                showError(error.message);
            }
        }

        async function signInWithEmail() {
            hideError();
            hideSuccess();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            if (!email || !password) {
                showError('Please enter email and password');
                return;
            }
            
            showLoading();
            try {
                await auth.signInWithEmailAndPassword(email, password);
            } catch (error) {
                hideLoading();
                showError(error.message);
            }
        }

        async function createAccount() {
            hideError();
            hideSuccess();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            if (!email || !password) {
                showError('Please enter email and password');
                return;
            }
            
            if (password.length < 6) {
                showError('Password must be at least 6 characters');
                return;
            }
            
            showLoading();
            try {
                await auth.createUserWithEmailAndPassword(email, password);
            } catch (error) {
                hideLoading();
                showError(error.message);
            }
        }

        async function signOut() {
            await auth.signOut();
            // Clear sensitive profile/admin data from localStorage (shared device safety)
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && (key.startsWith('hr_profile_') || key.startsWith('hr_state') || key.startsWith('hr_admin') || key.startsWith('hr_pending_') || key.startsWith('hr_user_profiles_') || key.startsWith('hr_additional_admins'))) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(k => localStorage.removeItem(k));
        }

        async function loadUserProfiles(user) {
            // Get profiles created by this user
            const userProfilesKey = 'hr_user_profiles_' + user.uid;
            const savedProfiles = localStorage.getItem(userProfilesKey);
            let profiles = savedProfiles ? JSON.parse(savedProfiles) : [];
            
            // Get profiles this user manages (was added as admin)
            const managedProfilesKey = 'hr_managed_profiles_' + user.email;
            const savedManaged = localStorage.getItem(managedProfilesKey);
            let managedProfiles = savedManaged ? JSON.parse(savedManaged) : [];
            
            // Also check Firestore for profiles this user owns or manages
            try {
                const db = firebase.firestore();
                const email = user.email.toLowerCase();
                
                // Check all profiles where user is owner
                const ownedSnap = await db.collection('profiles')
                    .where('ownerEmail', '==', email).get();
                ownedSnap.forEach(doc => {
                    if (!profiles.find(p => p.id === doc.id)) {
                        profiles.push({ id: doc.id, name: doc.data().name || doc.id });
                    }
                });
                
                // Also always include "stu" profile check for legacy support
                if (!profiles.find(p => p.id === 'stu')) {
                    try {
                        const stuAdminDoc = await db.collection('profiles').doc('stu').collection('admins').doc(email).get();
                        if (stuAdminDoc.exists) {
                            const stuDoc = await db.collection('profiles').doc('stu').get();
                            const stuName = stuDoc.exists && stuDoc.data().name ? stuDoc.data().name : 'Stu';
                            managedProfiles.push({ id: 'stu', name: stuName });
                        }
                    } catch(e) { console.log('Stu profile check skipped'); }
                }
                
                // Persist discovered profiles to localStorage for offline access
                localStorage.setItem(userProfilesKey, JSON.stringify(profiles));
                if (managedProfiles.length > 0) {
                    localStorage.setItem(managedProfilesKey, JSON.stringify(managedProfiles));
                }
            } catch(e) {
                console.warn('Firestore profile discovery failed:', e.message);
            }
            
            const profileList = document.getElementById('profileList');
            const managedList = document.getElementById('managedList');
            const managedSection = document.getElementById('managedSection');
            profileList.innerHTML = '';
            managedList.innerHTML = '';
            
            document.getElementById('profileSection').style.display = 'block';
            
            // Show owned profiles
            if (profiles.length === 0) {
                profileList.innerHTML = '<p style="color: var(--text-light); font-size: 14px; text-align: center;">No profiles created yet.</p>';
            } else {
                profiles.forEach(profile => {
                    const div = document.createElement('div');
                    div.className = 'profile-item';
                    div.style.cssText = 'flex-direction: column; align-items: stretch; cursor: default;';
                    div.innerHTML = `
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                            <span class="profile-name" style="font-size: 16px;">👤 ${escapeHtml(profile.name)}</span>
                            <span style="background: #dcfce7; color: #16a34a; padding: 2px 8px; border-radius: 12px; font-size: 11px;">Owner</span>
                        </div>
                        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                            <button data-profile-id="${escapeHtml(profile.id)}" data-action="open" style="flex: 1; padding: 10px 16px; background: var(--primary); color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">📱 Open App</button>
                            <button data-profile-id="${escapeHtml(profile.id)}" data-action="admin" style="flex: 1; padding: 10px 16px; background: #e0e7ff; color: #4338ca; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">⚙️ Admin</button>
                        </div>
                    `;
                    div.querySelector('[data-action="open"]').addEventListener('click', () => openProfile(profile.id));
                    div.querySelector('[data-action="admin"]').addEventListener('click', () => openAdmin(profile.id));
                    profileList.appendChild(div);
                });
            }
            
            // Show managed profiles
            if (managedProfiles.length > 0) {
                managedSection.style.display = 'block';
                managedProfiles.forEach(profile => {
                    const div = document.createElement('div');
                    div.className = 'profile-item';
                    div.style.cssText = 'flex-direction: column; align-items: stretch; cursor: default;';
                    div.innerHTML = `
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                            <span class="profile-name" style="font-size: 16px;">👥 ${escapeHtml(profile.name)}</span>
                            <span style="background: #e0e7ff; color: #4338ca; padding: 2px 8px; border-radius: 12px; font-size: 11px;">Admin</span>
                        </div>
                        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                            <button data-profile-id="${escapeHtml(profile.id)}" data-action="open" style="flex: 1; padding: 10px 16px; background: var(--primary); color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">📱 Open App</button>
                            <button data-profile-id="${escapeHtml(profile.id)}" data-action="admin" style="flex: 1; padding: 10px 16px; background: #e0e7ff; color: #4338ca; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">⚙️ Admin</button>
                        </div>
                    `;
                    div.querySelector('[data-action="open"]').addEventListener('click', () => openProfile(profile.id));
                    div.querySelector('[data-action="admin"]').addEventListener('click', () => openAdmin(profile.id));
                    managedList.appendChild(div);
                });
            } else {
                managedSection.style.display = 'none';
            }
        }

        function openProfile(profileId) {
            window.location.href = '/app.html?profile=' + profileId;
        }

        function openAdmin(profileId) {
            window.location.href = '/admin.html?profile=' + profileId;
        }

        function createNewProfile() {
            // Store user ID for linking after survey
            const user = auth.currentUser;
            if (user) {
                localStorage.setItem('hr_onboarding_uid', user.uid);
                if (user.email) {
                    localStorage.setItem('hr_onboarding_email', user.email);
                }
            }
            window.location.href = '/get-started.html';
        }

// ========== EVENT DELEGATION (CSP-compliant, replaces inline handlers) ==========
document.addEventListener('click', function(e) {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const action = el.getAttribute('data-action');

    switch(action) {
        case 'signOut': signOut(); break;
        case 'signInWithGoogle': signInWithGoogle(); break;
        case 'signInWithApple': signInWithApple(); break;
        case 'showEmailForm': showEmailForm(); break;
        case 'togglePassword': togglePassword(); break;
        case 'signInWithEmail': signInWithEmail(); break;
        case 'showResetForm': showResetForm(); break;
        case 'createAccount': createAccount(); break;
        case 'sendResetEmail': sendResetEmail(); break;
        case 'hideResetForm': hideResetForm(); break;
        case 'createNewProfile': createNewProfile(); break;
    }
});
