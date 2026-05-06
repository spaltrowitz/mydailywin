        let db, auth;
        try {
            db = firebase.firestore();
            auth = firebase.auth();
        } catch (e) {
            console.error('Firebase init failed:', e);
            document.title = '⚠️ Firebase Error';
        }

        // Check auth state — only if auth initialized
        if (auth) auth.onAuthStateChanged(async user => {
            if (user) {
                const profileParam = new URLSearchParams(window.location.search).get('profile');
                let profileName = profileParam === 'stu' ? 'Stu' : profileParam;
                const userEmail = user.email?.toLowerCase();
                
                console.log('🔐 Auth check for:', userEmail, 'on profile:', profileParam);
                
                // Check if user is authorized to access this admin dashboard
                let isAuthorized = false;
                
                try {
                    // Check Firestore for admin status
                    const profileRef = db.collection('profiles').doc(profileParam);
                    const profileDoc = await profileRef.get();
                    
                    console.log('📄 Firestore profile exists:', profileDoc.exists);
                    
                    // Use Firestore profile name if available
                    if (profileDoc.exists && profileDoc.data().name) {
                        profileName = profileDoc.data().name;
                        // Cache profile to localStorage for cross-device access
                        localStorage.setItem('hr_profile_' + profileParam, JSON.stringify(profileDoc.data()));
                    }
                    
                    // Check if user is the profile owner
                    if (profileDoc.exists && profileDoc.data().ownerEmail?.toLowerCase() === userEmail) {
                        isAuthorized = true;
                        console.log('✅ User is profile owner in Firestore');
                    }
                    
                    // Check if user is in the admins subcollection
                    if (!isAuthorized) {
                        const adminDoc = await profileRef.collection('admins').doc(userEmail).get();
                        console.log('📄 Admin doc exists:', adminDoc.exists);
                        if (adminDoc.exists) {
                            isAuthorized = true;
                            console.log('✅ User is in admins collection');
                            
                            // Mark as accepted if not already
                            if (!adminDoc.data().acceptedAt) {
                                const displayName = user.displayName || null;
                                const firstName = displayName ? displayName.split(' ')[0] : null;
                                
                                await profileRef.collection('admins').doc(userEmail).update({
                                    acceptedAt: firebase.firestore.FieldValue.serverTimestamp(),
                                    name: displayName,
                                    firstName: firstName
                                });
                                
                                await profileRef.collection('notifications').add({
                                    type: 'invite_accepted',
                                    email: userEmail,
                                    name: firstName || userEmail.split('@')[0],
                                    displayName: displayName,
                                    acceptedAt: firebase.firestore.FieldValue.serverTimestamp(),
                                    read: false
                                });
                            }
                        }
                    }
                } catch (error) {
                    console.warn('⚠️ Firestore unavailable — admin access denied (offline):', error.message);
                    // Never fall back to localStorage for authorization — it's user-writable.
                    // Show an offline message instead.
                    isAuthorized = false;
                }
                
                console.log('🔐 Final authorization:', isAuthorized);
                
                if (isAuthorized) {
                    // User is authorized - hide overlay and continue
                    document.getElementById('authOverlay').style.display = 'none';
                    document.getElementById('noPermissionOverlay').style.display = 'none';
                    
                    // Auto-link this profile to the user's account
                    const userProfilesKey = 'hr_user_profiles_' + user.uid;
                    let userProfiles = JSON.parse(localStorage.getItem(userProfilesKey) || '[]');
                    if (!userProfiles.find(p => p.id === profileParam)) {
                        userProfiles.push({ id: profileParam, name: profileName });
                        localStorage.setItem(userProfilesKey, JSON.stringify(userProfiles));
                    }
                } else {
                    // User is logged in but NOT an admin - show no permission overlay
                    document.getElementById('authOverlay').style.display = 'none';
                    document.getElementById('noPermissionOverlay').style.display = 'flex';
                    document.getElementById('profileOwnerName').textContent = profileName;
                    document.getElementById('goToAppLink').href = 'app.html?profile=' + profileParam;
                }
            } else {
                // Not signed in - store the profile we're trying to access, then show overlay
                const profileParam = new URLSearchParams(window.location.search).get('profile');
                if (profileParam) {
                    sessionStorage.setItem('hr_pending_profile', profileParam);
                    // Try localStorage first for a human-readable name
                    let pendingName = profileParam === 'stu' ? 'Stu' : profileParam;
                    try {
                        const cached = localStorage.getItem('hr_profile_' + profileParam);
                        if (cached) {
                            const parsed = JSON.parse(cached);
                            if (parsed.name) pendingName = parsed.name;
                        }
                    } catch (e) {}
                    sessionStorage.setItem('hr_pending_profile_name', pendingName);
                    // Update sign-in link to include redirect back to this page
                    const signInLink = document.getElementById('signInLink');
                    if (signInLink) {
                        signInLink.href = `login.html?redirect=${encodeURIComponent(window.location.href)}`;
                    }
                }
                document.getElementById('authOverlay').style.display = 'flex';
            }
        });

        // ========== PROFILE DETECTION ==========
        const urlParams = new URLSearchParams(window.location.search);
        const rawProfileId = urlParams.get('profile');
        const PROFILE_ID = (rawProfileId && /^[a-zA-Z0-9_-]+$/.test(rawProfileId)) ? rawProfileId : null;
        if (rawProfileId && !PROFILE_ID) {
            console.warn('⚠️ Invalid profile ID rejected:', rawProfileId);
        }
        const IS_LEGACY_PROFILE = PROFILE_ID === 'stu';
        
        // Storage key prefix based on profile
        const STORAGE_KEY = IS_LEGACY_PROFILE ? 'hr_state' : (PROFILE_ID ? 'hr_state_' + PROFILE_ID : 'hr_state');
        const ADMIN_KEY = IS_LEGACY_PROFILE ? 'hr_admin' : (PROFILE_ID ? 'hr_admin_' + PROFILE_ID : 'hr_admin');

        // If no profile, redirect to get-started
        if (!PROFILE_ID) {
            window.location.href = '/get-started.html';
        }

        // Load profile info if available
        let PROFILE_NAME = 'User';
        if (IS_LEGACY_PROFILE) {
            PROFILE_NAME = 'Stu';
            document.title = "Stu's Admin Mode";
        } else {
            const profileData = localStorage.getItem('hr_profile_' + PROFILE_ID);
            if (profileData) {
                const profile = JSON.parse(profileData);
                PROFILE_NAME = profile.name || 'User';
                document.title = PROFILE_NAME + "'s Admin Mode";
            } else {
                // Fallback: load from Firestore (handled in onAuthStateChanged above)
                // Name will be updated once Firestore responds
                db.collection('profiles').doc(PROFILE_ID).get().then(function(doc) {
                    if (doc.exists && doc.data().name) {
                        PROFILE_NAME = doc.data().name;
                        document.title = PROFILE_NAME + "'s Admin Mode";
                        localStorage.setItem('hr_profile_' + PROFILE_ID, JSON.stringify(doc.data()));
                        updateUserNames();
                    }
                }).catch(function(err) {
                    console.warn('Firestore profile fetch failed:', err);
                });
            }
        }

        // Replace all user name placeholders with actual name
        function updateUserNames() {
            document.querySelectorAll('.user-name').forEach(el => {
                el.textContent = PROFILE_NAME;
            });
        }
        
        // Run immediately and also when DOM is ready
        updateUserNames();
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', updateUserNames);
        }

        // ========== TAB FUNCTIONALITY ==========
        function showTab(tabId) {
            document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab').forEach(t => {
                t.classList.remove('active');
                t.setAttribute('aria-selected', 'false');
            });
            document.getElementById(tabId).classList.add('active');
            document.querySelectorAll('.tab').forEach(t => {
                if (t.textContent.toLowerCase().includes(tabId.toLowerCase()) || 
                    t.getAttribute('data-arg') === tabId) {
                    t.classList.add('active');
                    t.setAttribute('aria-selected', 'true');
                }
            });
            // Save current tab to sessionStorage
            sessionStorage.setItem('hr_admin_tab', tabId);
        }

        function openModal(id) { const el = document.getElementById(id); if (el) el.classList.add('active'); }
        function closeModal(id) { const el = document.getElementById(id); if (el) el.classList.remove('active'); }

        // ========== HELPERS ==========
        function getProfileSuffix() {
            return (PROFILE_ID && !IS_LEGACY_PROFILE) ? '_' + PROFILE_ID : '';
        }

        function formatDollar(amount) {
            return parseFloat(amount).toFixed(2);
        }

        // ========== STATE MANAGEMENT ==========
        function loadState() {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (!saved) return { balance: 0, totalEarned: 0, streak: 0 };
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.warn('loadState: corrupted localStorage, resetting', e);
                return { balance: 0, totalEarned: 0, streak: 0 };
            }
        }

        function saveState(state) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
            // Dual-write for stu profile — app.html reads from hr_state_stu
            if (IS_LEGACY_PROFILE) {
                localStorage.setItem('hr_state_stu', JSON.stringify(state));
            }
        }

        function loadAdminData() {
            const saved = localStorage.getItem(ADMIN_KEY);
            if (!saved) return { payments: [], customTasks: {} };
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.warn('loadAdminData: corrupted localStorage, resetting', e);
                return { payments: [], customTasks: {} };
            }
        }

        function saveAdminData(data) {
            localStorage.setItem(ADMIN_KEY, JSON.stringify(data));
        }

        // ========== TASK LISTS (from main app) ==========
        const DEFAULT_DAILY_TASKS = [
            { id: 1, name: "🚶 Go for a walk", value: 25 },
            { id: 4, name: "📝 Do a crossword puzzle", value: 50 },
            { id: 5, name: "🟩 Play Wordle", value: 10 }
        ];

        const DEFAULT_DAILY_BONUSES = [
            { id: 101, name: "📸 Take a photo of something interesting", value: 50 },
            { id: 102, name: "🧹 Organize one drawer or shelf", value: 50 },
            { id: 103, name: "🌳 Spend 10 minutes outside", value: 50 },
            { id: 104, name: "🎵 Listen to a new song", value: 50 },
            { id: 105, name: "📞 Call or text a friend", value: 100 },
            { id: 106, name: "🔋 Charge devices overnight", value: 50 },
            { id: 107, name: "🗑️ Throw away one thing you don't need", value: 50 },
            { id: 108, name: "🧽 Wipe down a counter or surface", value: 50 },
            { id: 109, name: "🛏️ Make the bed", value: 50 },
            { id: 110, name: "🧘 Do 5 minutes of stretching", value: 50 },
            { id: 111, name: "💊 Take vitamins", value: 50 },
            { id: 112, name: "📖 Read for 10 minutes", value: 50 },
            { id: 113, name: "🎧 Listen to a podcast", value: 50 },
            { id: 114, name: "📺 Watch something new on streaming", value: 50 },
            { id: 115, name: "📱 Delete an unused app", value: 50 },
            { id: 116, name: "📧 Clear out old emails", value: 50 },
            { id: 117, name: "📝 Make a to-do list for tomorrow", value: 50 },
            { id: 118, name: "🚗 Clean out the car", value: 50 }
        ];

        const DEFAULT_PERMANENT_WEEKLY = [
            { id: 200, name: "🎾 Tennis/pickleball 3x this week", value: 30 }
        ];

        const DEFAULT_WEEKLY_BONUSES = [
            { id: 301, name: "💿 Sell your coins or vinyls", value: 500 },
            { id: 302, name: "💑 Take your wife out to lunch or dinner", value: 500 },
            { id: 303, name: "🍽️ Try a new restaurant", value: 300 },
            { id: 304, name: "📦 Get rid of 3 items from office", value: 300 },
            { id: 305, name: "❤️ Do something nice for your wife", value: 300 },
            { id: 312, name: "🍔 Lunch with tennis friends", value: 300 },
            { id: 306, name: "👕 Donate clothing items", value: 250 },
            { id: 307, name: "👟 Donate sneakers", value: 250 },
            { id: 308, name: "📺 Find a new show on Netflix", value: 200 },
            { id: 309, name: "📺 Find a new show on Amazon Video", value: 200 },
            { id: 310, name: "📺 Find a new show on Apple TV", value: 200 },
            { id: 311, name: "💌 Tell one of your kids you are thinking of them", value: 200 },
            { id: 313, name: "🤖 Use ChatGPT to solve a problem", value: 200 },
            { id: 314, name: "📞 Call a friend or family member", value: 200 },
            { id: 315, name: "🕵️ Apply for a Mystery Shop", value: 200 },
            { id: 316, name: "🛒 Check Aisle for grocery deals", value: 150 },
            { id: 317, name: "🛍️ Buy a new item from the grocery store", value: 150 },
            { id: 318, name: "🍿 Use the microwave", value: 50 },
            { id: 319, name: "🗑️ Throw away 5 items you no longer need", value: 200 }
        ];

        function getTasks(type) {
            const admin = loadAdminData();
            if (admin.customTasks && admin.customTasks[type]) {
                return [...admin.customTasks[type]];
            }
            if (type === 'daily') return [...DEFAULT_DAILY_TASKS];
            if (type === 'dailyBonus') return [...DEFAULT_DAILY_BONUSES];
            if (type === 'permanentWeekly') return [...DEFAULT_PERMANENT_WEEKLY];
            if (type === 'weekly') return [...DEFAULT_WEEKLY_BONUSES];
            return [];
        }

        function saveTasks(type, tasks) {
            const admin = loadAdminData();
            if (!admin.customTasks) admin.customTasks = {};
            admin.customTasks[type] = tasks;
            saveAdminData(admin);
        }

        // ========== LEVELS ==========
        function getLevel(totalPoints) {
            if (totalPoints >= 100000) return { name: "🔥 Hall of Fame", color: "#ff4500" };
            if (totalPoints >= 50000) return { name: "🌟 Superstar", color: "#ff69b4" };
            if (totalPoints >= 25000) return { name: "👑 Legend", color: "#9400d3" };
            if (totalPoints >= 10000) return { name: "💎 Diamond", color: "#00bfff" };
            if (totalPoints >= 5000) return { name: "🏆 Champion", color: "#ffd700" };
            if (totalPoints >= 2500) return { name: "⭐ Expert", color: "#c0c0c0" };
            if (totalPoints >= 1000) return { name: "🌟 Pro", color: "#cd7f32" };
            if (totalPoints >= 500) return { name: "🌿 Regular", color: "#4ade80" };
            if (totalPoints >= 150) return { name: "🌱 Starter", color: "#86efac" };
            return { name: "🥚 Beginner", color: "#58cc02" };
        }

        // ========== DISPLAY FUNCTIONS ==========
        function displayStats() {
            const state = loadState();
            const totalEarned = state.totalEarned || 0;
            const balance = state.balance || 0;
            const streak = state.streak || 0;
            
            const els = {
                totalPts: document.getElementById('totalPts'),
                totalDollars: document.getElementById('totalDollars'),
                currentBalance: document.getElementById('currentBalance'),
                balanceDollars: document.getElementById('balanceDollars'),
                streak: document.getElementById('streak'),
                currentOwed: document.getElementById('currentOwed'),
                currentLevel: document.getElementById('currentLevel'),
                streakBonusInfo: document.getElementById('streakBonusInfo'),
                streakBonusText: document.getElementById('streakBonusText')
            };

            els.totalPts.textContent = Math.floor(totalEarned).toLocaleString();
            els.totalDollars.textContent = '$' + (totalEarned / 100).toFixed(2);
            els.currentBalance.textContent = Math.floor(balance).toLocaleString();
            els.balanceDollars.textContent = '$' + (balance / 100).toFixed(2);
            els.streak.textContent = streak;
            els.currentOwed.textContent = '$' + (balance / 100).toFixed(2);
            
            const level = getLevel(totalEarned);
            els.currentLevel.textContent = level.name;
            els.currentLevel.style.color = level.color;

            if (streak >= 14) {
                els.streakBonusInfo.style.display = 'block';
                els.streakBonusText.textContent = '2x points on all tasks (14+ day streak)';
            } else if (streak >= 7) {
                els.streakBonusInfo.style.display = 'block';
                els.streakBonusText.textContent = '1.5x points on all tasks (7+ day streak)';
            }
        }

        function renderTaskRow(t, category) {
            return `<tr class="editable-row" onclick="openEditTask('${category}', ${t.id})">
                        <td class="task-name-cell">${escapeHtml(t.name)}</td>
                        <td class="points-cell">${t.value}</td>
                        <td class="dollar-cell">$${(t.value/100).toFixed(2)}</td>
                        <td>✏️</td>
                    </tr>`;
        }

        function displayTasks() {
            const categories = [
                { key: 'daily', tableId: 'dailyTasksTable' },
                { key: 'dailyBonus', tableId: 'dailyBonusTable' },
                { key: 'permanentWeekly', tableId: 'permanentWeeklyTable' },
                { key: 'weekly', tableId: 'weeklyBonusTable' }
            ];

            categories.forEach(({ key, tableId }) => {
                const table = document.getElementById(tableId);
                const tasks = getTasks(key);
                const html = ['<tr><th>Task</th><th>Points</th><th>$</th><th></th></tr>'];
                tasks.forEach(t => html.push(renderTaskRow(t, key)));
                table.innerHTML = html.join('');
            });
        }

        function displayLevels() {
            const state = loadState();
            const totalEarned = state.totalEarned || 0;
            const currentLevel = getLevel(totalEarned);
            
            const allLevels = [
                { name: "🥚 Beginner", pts: 0 },
                { name: "🌱 Starter", pts: 150 },
                { name: "🌿 Regular", pts: 500 },
                { name: "🌟 Pro", pts: 1000 },
                { name: "⭐ Expert", pts: 2500 },
                { name: "🏆 Champion", pts: 5000 },
                { name: "💎 Diamond", pts: 10000 },
                { name: "👑 Legend", pts: 25000 },
                { name: "🌟 Superstar", pts: 50000 },
                { name: "🔥 Hall of Fame", pts: 100000 }
            ];

            const container = document.getElementById('levelsDisplay');
            container.innerHTML = allLevels.map(lvl => {
                const isCurrent = currentLevel.name === lvl.name;
                const isUnlocked = totalEarned >= lvl.pts;
                let className = isCurrent ? 'current' : (isUnlocked ? '' : 'locked');
                return `
                    <div class="level-row ${className}">
                        <div class="level-name">${escapeHtml(lvl.name)} ${isCurrent ? '<span class="badge badge-success">CURRENT</span>' : ''}</div>
                        <div class="level-pts">${lvl.pts.toLocaleString()} pts</div>
                    </div>
                `;
            }).join('');
        }

        function displayPayments() {
            const admin = loadAdminData();
            const payments = admin.payments || [];
            const container = document.getElementById('paymentsContainer');
            
            if (payments.length === 0) {
                container.innerHTML = '<div class="empty-state">No payments recorded yet</div>';
                document.getElementById('totalPaid').textContent = '$0';
            } else {
                let totalPaid = 0;
                container.innerHTML = payments.map(p => {
                    totalPaid += parseFloat(p.amount);
                    return `
                        <div class="payment-row paid">
                            <div>
                                <div style="font-weight: 700;">${escapeHtml(p.month)}</div>
                                <div style="font-size: 12px; color: var(--text-light);">${escapeHtml(p.notes) || 'Via Zelle'}</div>
                            </div>
                            <div class="payment-amount">$${formatDollar(p.amount)}</div>
                        </div>
                    `;
                }).join('');
                document.getElementById('totalPaid').textContent = '$' + totalPaid.toFixed(2);
            }
            
            // Display pending payout requests from Firestore
            displayPendingRequests();
        }
        
        async function displayPendingRequests() {
            const profileId = PROFILE_ID || 'stu';
            const card = document.getElementById('pendingRequestsCard');
            const container = document.getElementById('pendingRequestsContainer');
            
            try {
                // Query Firestore for pending requests for this profile
                // Using simple query first, then filter client-side to avoid index issues
                const snapshot = await db.collection('payoutRequests')
                    .where('profileId', '==', profileId)
                    .get();
                
                // Filter pending and sort client-side
                const pendingDocs = snapshot.docs
                    .filter(doc => doc.data().status === 'pending')
                    .sort((a, b) => {
                        const aTime = a.data().requestedAt?.toMillis?.() || 0;
                        const bTime = b.data().requestedAt?.toMillis?.() || 0;
                        return bTime - aTime;
                    });
                
                if (pendingDocs.length === 0) {
                    card.style.display = 'none';
                    return;
                }
                
                card.style.display = 'block';
                container.innerHTML = pendingDocs.map(doc => {
                    const r = doc.data();
                    const requestedDate = r.requestedAt?.toDate?.() || new Date();
                    const userName = r.profileName || PROFILE_NAME;
                    return `
                        <div class="payment-row" style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin-bottom: 10px; border-radius: 8px;">
                            <div style="flex: 1;">
                                <div style="font-weight: 700; font-size: 20px; color: #92400e;">$${formatDollar(r.amount)}</div>
                                <div style="font-size: 12px; color: #b45309; margin-bottom: 8px;">Requested ${requestedDate.toLocaleDateString()} at ${requestedDate.toLocaleTimeString()}</div>
                                <div style="font-size: 13px; color: #78350f; background: #fef9c3; padding: 8px 12px; border-radius: 6px; margin-top: 8px;">
                                    <strong>📋 Steps:</strong><br>
                                    1. Transfer $${formatDollar(r.amount)} to MyDailyWin account<br>
                                    2. MyDailyWin sends via Zelle to ${escapeHtml(userName)}<br>
                                    3. Click "Mark as Sent" below
                                </div>
                            </div>
                            <div style="display: flex; flex-direction: column; gap: 8px; min-width: 130px;">
                                <button class="btn btn-primary" style="padding: 10px 16px; font-size: 14px;" onclick="approvePayoutRequest('${escapeHtml(doc.id)}', ${r.amount}, ${r.points}, '${escapeHtml(userName)}')">✓ Mark as Sent</button>
                                <button class="btn btn-secondary" style="padding: 8px 16px; font-size: 12px;" onclick="dismissPayoutRequest('${escapeHtml(doc.id)}')">✕ Dismiss</button>
                            </div>
                        </div>
                    `;
                }).join('');
            } catch (err) {
                console.error('Error loading payout requests:', err);
                // Fallback to localStorage
                const suffix = getProfileSuffix();
                const requests = JSON.parse(localStorage.getItem('hr_payout_requests' + suffix) || '[]');
                const pendingRequests = requests.filter(r => r.status === 'pending');
                
                if (pendingRequests.length === 0) {
                    card.style.display = 'none';
                    return;
                }
                
                card.style.display = 'block';
                container.innerHTML = pendingRequests.map(r => `
                    <div class="payment-row" style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin-bottom: 10px; border-radius: 8px;">
                        <div style="flex: 1;">
                            <div style="font-weight: 700; font-size: 18px; color: #92400e;">$${formatDollar(r.amount)}</div>
                            <div style="font-size: 12px; color: #b45309;">Requested ${new Date(r.requestedAt).toLocaleDateString()} at ${new Date(r.requestedAt).toLocaleTimeString()}</div>
                        </div>
                        <div style="display: flex; gap: 8px;">
                            <button class="btn btn-primary" style="padding: 8px 16px; font-size: 14px;" onclick="approvePayoutRequest('${escapeHtml(r.id)}', ${r.amount}, ${r.points}, '${escapeHtml(PROFILE_NAME)}')">✓ Paid</button>
                            <button class="btn btn-secondary" style="padding: 8px 16px; font-size: 14px;" onclick="dismissPayoutRequest('${escapeHtml(r.id)}')">✕</button>
                        </div>
                    </div>
                `).join('');
            }
        }
        
        async function approvePayoutRequest(requestId, amount, points, userName) {
            try {
                await db.collection('payoutRequests').doc(requestId).update({
                    status: 'completed',
                    completedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    sentBy: 'MyDailyWin'
                });
                await saveUserNotification(userName, amount);
            } catch (err) {
                console.error('Firestore payout update failed, using localStorage:', err);
                const suffix = getProfileSuffix();
                const requests = JSON.parse(localStorage.getItem('hr_payout_requests' + suffix) || '[]');
                const request = requests.find(r => r.id === requestId);
                if (request) {
                    request.status = 'completed';
                    request.completedAt = new Date().toISOString();
                    localStorage.setItem('hr_payout_requests' + suffix, JSON.stringify(requests));
                }
            }

            const admin = loadAdminData();
            admin.payments = admin.payments || [];
            admin.payments.unshift({
                month: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
                amount: amount,
                notes: 'Payout request approved',
                date: new Date().toISOString(),
                recipient: userName
            });
            saveAdminData(admin);

            // Note: Balance was already deducted in app.js when the user requested the cashout
            // No need to deduct again here to prevent double-deduction

            showToast('✅ Payment of $' + formatDollar(amount) + ' recorded');
            displayPayments();
            displayStats();
        }
        
        async function saveUserNotification(userName, amount) {
            const profileId = PROFILE_ID || 'stu';
            try {
                await db.collection('userNotifications').add({
                    profileId: profileId,
                    type: 'payout_sent',
                    title: '💰 Payment Sent!',
                    message: `$${formatDollar(amount)} from MyDailyWin is on its way via Zelle!`,
                    amount: amount,
                    read: false,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            } catch (err) {
                console.error('Error saving user notification:', err);
            }
        }
        
        async function dismissPayoutRequest(requestId) {
            if (!confirm('Dismiss this payout request without paying?')) return;
            
            try {
                await db.collection('payoutRequests').doc(requestId).update({
                    status: 'dismissed',
                    dismissedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            } catch (err) {
                console.error('Firestore dismiss failed, using localStorage:', err);
                const suffix = getProfileSuffix();
                const requests = JSON.parse(localStorage.getItem('hr_payout_requests' + suffix) || '[]');
                const index = requests.findIndex(r => r.id === requestId);
                if (index > -1) {
                    requests[index].status = 'dismissed';
                    requests[index].dismissedAt = new Date().toISOString();
                    localStorage.setItem('hr_payout_requests' + suffix, JSON.stringify(requests));
                }
            }
            
            showToast('Request dismissed');
            displayPendingRequests();
        }

        function displayReports() {
            const suffix = getProfileSuffix();
            const reports = JSON.parse(localStorage.getItem('hr_reports' + suffix) || '[]');
            const container = document.getElementById('reportsContainer');
            
            if (reports.length === 0) {
                container.innerHTML = '<div class="empty-state">No reported tasks yet ✅</div>';
                return;
            }

            const reasonLabels = {
                'too-hard': '😓 Too difficult',
                'not-relevant': '🤷 Not relevant',
                'dont-like': "👎 Don't like it",
                'already-do': '✅ Already do this',
                'other': '📝 Other'
            };

            container.innerHTML = reports.map(r => `
                <div class="report-item">
                    <div class="task-name">${escapeHtml(r.taskName)}</div>
                    <div class="reason">${reasonLabels[r.reason] || escapeHtml(r.reason)}</div>
                    ${r.comment ? `<div class="reason" style="font-style: italic;">"${escapeHtml(r.comment)}"</div>` : ''}
                    <div class="date">${new Date(r.date).toLocaleDateString()} • ${escapeHtml(r.taskType)} task</div>
                </div>
            `).join('');
        }

        // ========== TASK EDITING ==========
        function openAddTaskModal(type) {
            document.getElementById('newTaskType').value = type;
            document.getElementById('newTaskName').value = '';
            document.getElementById('newTaskPoints').value = '';
            const titles = { 
                daily: 'Add Daily Task', 
                dailyBonus: 'Add Daily Bonus', 
                permanentWeekly: 'Add Permanent Weekly',
                weekly: 'Add Weekly Bonus' 
            };
            document.getElementById('addTaskTitle').textContent = titles[type];
            openModal('addTaskModal');
        }

        function saveNewTask() {
            const type = document.getElementById('newTaskType').value;
            const name = document.getElementById('newTaskName').value.trim();
            const points = parseInt(document.getElementById('newTaskPoints').value);

            if (!name || !points || points <= 0) {
                alert('Please enter task name and points (must be greater than 0)');
                return;
            }

            const tasks = getTasks(type);
            const newId = Math.max(...tasks.map(t => t.id), 0) + 1;
            tasks.push({ id: newId, name, value: points });
            saveTasks(type, tasks);
            
            closeModal('addTaskModal');
            displayTasks();
            alert('Task added successfully!');
        }

        function openEditTask(type, id) {
            const tasks = getTasks(type);
            const task = tasks.find(t => t.id === id);
            if (!task) return;

            document.getElementById('editTaskType').value = type;
            document.getElementById('editTaskId').value = id;
            document.getElementById('editTaskName').value = task.name;
            document.getElementById('editTaskPoints').value = task.value;
            document.getElementById('editTaskCategory').value = type;
            openModal('editTaskModal');
        }

        function saveEditTask() {
            const originalType = document.getElementById('editTaskType').value;
            const newType = document.getElementById('editTaskCategory').value;
            const id = parseInt(document.getElementById('editTaskId').value);
            const name = document.getElementById('editTaskName').value.trim();
            const points = parseInt(document.getElementById('editTaskPoints').value);

            if (!name || !points) {
                alert('Please enter task name and points');
                return;
            }

            // If moving to a different category
            if (originalType !== newType) {
                // Remove from original
                let oldTasks = getTasks(originalType);
                oldTasks = oldTasks.filter(t => t.id !== id);
                saveTasks(originalType, oldTasks);
                
                // Add to new category
                const newTasks = getTasks(newType);
                const newId = Math.max(...newTasks.map(t => t.id), 0) + 1;
                newTasks.push({ id: newId, name, value: points });
                saveTasks(newType, newTasks);
                
                closeModal('editTaskModal');
                displayTasks();
                alert('Task moved and updated!');
            } else {
                // Same category, just update
                const tasks = getTasks(originalType);
                const idx = tasks.findIndex(t => t.id === id);
                if (idx !== -1) {
                    tasks[idx].name = name;
                    tasks[idx].value = points;
                    saveTasks(originalType, tasks);
                }
                
                closeModal('editTaskModal');
                displayTasks();
                alert('Task updated!');
            }
        }

        function deleteTask() {
            if (!confirm('Delete this task?')) return;

            const type = document.getElementById('editTaskType').value;
            const id = parseInt(document.getElementById('editTaskId').value);
            
            let tasks = getTasks(type);
            tasks = tasks.filter(t => t.id !== id);
            saveTasks(type, tasks);
            
            closeModal('editTaskModal');
            displayTasks();
            alert('Task deleted!');
        }

        // ========== PAYMENTS ==========
        function populatePaymentMonths() {
            const select = document.getElementById('paymentMonth');
            select.innerHTML = '';
            
            const now = new Date();
            const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                           'July', 'August', 'September', 'October', 'November', 'December'];
            
            // Show last 3 months and next 9 months (12 total)
            for (let i = -3; i <= 8; i++) {
                const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
                const monthName = months[date.getMonth()];
                const year = date.getFullYear();
                const value = `${monthName} ${year}`;
                const option = document.createElement('option');
                option.value = value;
                option.textContent = value;
                // Select current month by default
                if (i === 0) option.selected = true;
                select.appendChild(option);
            }
        }
        
        function openPaymentModal() {
            populatePaymentMonths();
            document.getElementById('paymentAmount').value = '';
            document.getElementById('paymentNotes').value = '';
            openModal('paymentModal');
        }

        function savePayment() {
            const month = document.getElementById('paymentMonth').value;
            const amount = parseFloat(document.getElementById('paymentAmount').value);
            const notes = document.getElementById('paymentNotes').value;

            if (!amount || amount <= 0) {
                alert('Please enter a valid amount (must be greater than 0)');
                return;
            }

            const admin = loadAdminData();
            if (!admin.payments) admin.payments = [];
            admin.payments.push({ month, amount, notes, date: new Date().toISOString() });
            saveAdminData(admin);

            // Deduct payment from user balance (100 points = $1.00)
            const state = loadState();
            state.balance = Math.max(0, state.balance - (amount * 100));
            saveState(state);

            closeModal('paymentModal');
            displayPayments();
            displayStats();
            alert('Payment of $' + amount.toFixed(2) + ' recorded! Balance updated.');
        }

        // ========== DOWNLOADS ==========
        function downloadCSV(csv, filename) {
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
        }

        function downloadTaskResponses() {
            const suffix = getProfileSuffix();
            const log = JSON.parse(localStorage.getItem('hr_completed_log' + suffix) || '[]');
            if (log.length === 0) { alert('No data'); return; }
            let csv = 'Date,Type,Task,Points,Comment\n';
            log.forEach(e => csv += [escapeCSV(e.date), escapeCSV(e.type), escapeCSV(e.task), escapeCSV(e.points), escapeCSV(e.comment || '')].join(',') + '\n');
            downloadCSV(csv, 'mydailywin-tasks');
        }

        function downloadFeedbackLog() {
            const suffix = getProfileSuffix();
            const fb = JSON.parse(localStorage.getItem('hr_feedback' + suffix) || '[]');
            if (fb.length === 0) { alert('No data'); return; }
            let csv = 'Date,Mood,Energy,Overall,Comments\n';
            fb.forEach(f => csv += [escapeCSV(new Date(f.date).toLocaleDateString()), escapeCSV(f.mood || ''), escapeCSV(f.energy || ''), escapeCSV(f.overall || ''), escapeCSV(f.comments || '')].join(',') + '\n');
            downloadCSV(csv, 'mydailywin-feedback');
        }

        function downloadReports() {
            const suffix = getProfileSuffix();
            const rpts = JSON.parse(localStorage.getItem('hr_reports' + suffix) || '[]');
            if (rpts.length === 0) { alert('No data'); return; }
            let csv = 'Date,Type,Task,Reason,Comment\n';
            rpts.forEach(r => csv += [escapeCSV(new Date(r.date).toLocaleDateString()), escapeCSV(r.taskType), escapeCSV(r.taskName), escapeCSV(r.reason), escapeCSV(r.comment || '')].join(',') + '\n');
            downloadCSV(csv, 'mydailywin-reports');
        }

        function downloadAllData() {
            const suffix = getProfileSuffix();
            const data = {
                state: loadState(),
                admin: loadAdminData(),
                completedLog: JSON.parse(localStorage.getItem('hr_completed_log' + suffix) || '[]'),
                feedback: JSON.parse(localStorage.getItem('hr_feedback' + suffix) || '[]'),
                reports: JSON.parse(localStorage.getItem('hr_reports' + suffix) || '[]')
            };
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `mydailywin-${PROFILE_NAME}-backup-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
        }

        function exportSurveyDataCSV() {
            // Get all survey responses from the log
            const surveyLog = JSON.parse(localStorage.getItem('hr_survey_log') || '[]');
            
            if (surveyLog.length === 0) {
                alert('No survey data found. Survey data is collected when new profiles are created through the Get Started wizard.');
                return;
            }
            
            // CSV headers
            const headers = [
                'Profile ID',
                'Name',
                'For Who',
                'Relationship',
                'Phone Comfort',
                'Motivation',
                'Activities',
                'Custom Activities',
                'Payout Preference',
                'Template',
                'Admin Goals',
                'Admin Challenges',
                'Admin Notes',
                'Created At',
                'Survey Completed At'
            ];
            
            // Build CSV content
            let csv = headers.join(',') + '\n';
            
            surveyLog.forEach(entry => {
                const row = [
                    escapeCSV(entry.id || ''),
                    escapeCSV(entry.name || ''),
                    escapeCSV(entry.forWho || ''),
                    escapeCSV(entry.relationship || ''),
                    escapeCSV(entry.phoneComfort || ''),
                    escapeCSV(entry.motivation || ''),
                    escapeCSV((entry.activities || []).join('; ')),
                    escapeCSV(entry.customActivities || ''),
                    escapeCSV(entry.payoutPref || ''),
                    escapeCSV(entry.template || ''),
                    escapeCSV(entry.adminGoals || ''),
                    escapeCSV(entry.adminChallenges || ''),
                    escapeCSV(entry.adminNotes || ''),
                    escapeCSV(entry.createdAt || ''),
                    escapeCSV(entry.surveyCompletedAt || '')
                ];
                csv += row.join(',') + '\n';
            });
            
            downloadCSV(csv, 'mydailywin-survey-data');
        }
        
        function escapeCSV(value) {
            if (value === null || value === undefined) return '""';
            const str = String(value);
            // Escape quotes and wrap in quotes if contains comma, quote, or newline
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return '"' + str.replace(/"/g, '""') + '"';
            }
            return '"' + str + '"';
        }

        function clearReports() {
            const suffix = getProfileSuffix();
            if (confirm('Clear all reports?')) {
                localStorage.removeItem('hr_reports' + suffix);
                displayReports();
            }
        }
        
        function resetUserBalance() {
            if (!confirm('Reset current balance to 0 points?')) return;
            const state = loadState();
            state.balance = 0;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
            const appStateKey = PROFILE_ID ? 'hr_state_' + PROFILE_ID : 'hr_state';
            if (appStateKey !== STORAGE_KEY) {
                localStorage.setItem(appStateKey, JSON.stringify(state));
            }
            displayStats();
            showToast('✅ Balance reset to 0');
        }

        function resetUserData() {
            if (confirm('⚠️ DELETE ALL user data?\n\nThis removes:\n• Points & balance\n• Streak\n• Completed tasks\n• Achievements')) {
                if (confirm('Are you absolutely sure?')) {
                    const suffix = getProfileSuffix();
                    localStorage.removeItem('hr_state' + suffix);
                    localStorage.removeItem('hr_date' + suffix);
                    localStorage.removeItem('hr_week' + suffix);
                    localStorage.removeItem('hr_feedback' + suffix);
                    localStorage.removeItem('hr_completed_log' + suffix);
                    localStorage.removeItem('hr_reports' + suffix);
                    
                    // Update displays without changing tabs
                    displayStats();
                    displayReports();
                    displayLevels();
                    
                    // Show success message without navigating away
                    showToast('✅ All user data has been reset');
                }
            }
        }
        
        function showToast(message) {
            // Remove existing toast if any
            const existing = document.querySelector('.admin-toast');
            if (existing) existing.remove();
            
            const toast = document.createElement('div');
            toast.className = 'admin-toast';
            toast.textContent = message;
            toast.style.cssText = `
                position: fixed;
                bottom: 80px;
                left: 50%;
                transform: translateX(-50%);
                background: #333;
                color: white;
                padding: 12px 24px;
                border-radius: 8px;
                z-index: 10000;
                font-weight: 500;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            `;
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 3000);
        }

        // ========== SETTINGS ACTIONS ==========
        function contactDeveloper() {
            const subject = encodeURIComponent('MyDailyWin - Support Request');
            const body = encodeURIComponent('Hi,\n\nI have a question about MyDailyWin:\n\n');
            window.location.href = `mailto:developer@mydailywin.app?subject=${subject}&body=${body}`;
        }

        function referFriend() {
            const msg = encodeURIComponent('Hey! Check out MyDailyWin - a fun app that pays you for building good habits. https://mydailywin.web.app');
            if (navigator.share) {
                navigator.share({ title: 'MyDailyWin', text: msg });
            } else {
                window.location.href = `sms:?body=${msg}`;
            }
        }

        // ========== ADMIN MANAGEMENT ==========
        function getAdminsKey() {
            return PROFILE_ID ? 'hr_profile_admins_' + PROFILE_ID : 'hr_profile_admins';
        }

        function getInvitesKey() {
            return PROFILE_ID ? 'hr_profile_invites_' + PROFILE_ID : 'hr_profile_invites';
        }

        // Migrate localStorage admins to Firestore (one-time sync)
        async function syncLocalStorageToFirestore() {
            const localAdmins = JSON.parse(localStorage.getItem(getAdminsKey()) || '[]');
            const legacyAdmins = JSON.parse(localStorage.getItem('hr_additional_admins') || '[]');
            const allLocalAdmins = [...localAdmins, ...legacyAdmins];
            
            if (allLocalAdmins.length === 0) return;
            
            console.log('🔄 Syncing localStorage admins to Firestore:', allLocalAdmins.length);
            
            try {
                for (const admin of allLocalAdmins) {
                    const email = admin.email?.toLowerCase();
                    if (!email) continue;
                    
                    const adminRef = db.collection('profiles').doc(PROFILE_ID).collection('admins').doc(email);
                    const existing = await adminRef.get();
                    
                    if (!existing.exists) {
                        // Create in Firestore
                        await adminRef.set({
                            email: email,
                            addedAt: admin.addedAt ? new Date(admin.addedAt) : firebase.firestore.FieldValue.serverTimestamp(),
                            addedBy: admin.addedBy || 'migrated',
                            profileId: PROFILE_ID,
                            profileName: PROFILE_NAME,
                            acceptedAt: admin.acceptedAt ? new Date(admin.acceptedAt) : null,
                            name: admin.name || null,
                            firstName: admin.firstName || null
                        });
                        console.log('✅ Migrated admin to Firestore:', email);
                    }
                }
            } catch (error) {
                console.log('Firestore sync failed:', error.message);
            }
        }

        async function loadAdmins() {
            // First, sync any localStorage admins to Firestore
            await syncLocalStorageToFirestore();
            
            const currentUser = firebase.auth().currentUser;
            const container = document.getElementById('adminsList');
            container.innerHTML = '';
            
            // Always show the profile owner first
            const ownerName = currentUser ? (currentUser.displayName || currentUser.email) : 'Owner';
            const ownerDiv = document.createElement('div');
            ownerDiv.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: linear-gradient(135deg, #dcfce7, #bbf7d0); border-radius: 10px; margin-bottom: 8px;';
            ownerDiv.innerHTML = `
                <div>
                    <strong>${escapeHtml(ownerName)}</strong>
                    ${currentUser && currentUser.displayName ? `<span style="color: var(--text-light); font-size: 12px; margin-left: 5px;">(${escapeHtml(currentUser.email)})</span>` : ''}
                    <span style="background: var(--primary); color: white; padding: 2px 8px; border-radius: 20px; font-size: 11px; margin-left: 8px;">Owner</span>
                </div>
            `;
            container.appendChild(ownerDiv);
            
            // Try to load admins from Firestore first
            let admins = [];
            try {
                const adminsSnapshot = await db.collection('profiles').doc(PROFILE_ID).collection('admins').get();
                adminsSnapshot.forEach(doc => {
                    const data = doc.data();
                    admins.push({
                        id: doc.id,
                        ...data,
                        // Normalize Firestore Timestamp to ISO string for consistent checks
                        acceptedAt: data.acceptedAt?.toDate?.() ? data.acceptedAt.toDate().toISOString() : data.acceptedAt
                    });
                });
                console.log('✅ Loaded admins from Firestore:', admins.length);
                
                // Keep localStorage in sync so fallback always has fresh data
                const localAdmins = admins.map(a => ({
                    email: a.email,
                    addedAt: a.addedAt?.toDate?.() ? a.addedAt.toDate().toISOString() : (a.addedAt || new Date().toISOString()),
                    addedBy: a.addedBy || null,
                    acceptedAt: a.acceptedAt || null,
                    name: a.name || null,
                    firstName: a.firstName || null
                }));
                localStorage.setItem(getAdminsKey(), JSON.stringify(localAdmins));
            } catch (error) {
                console.log('Firestore not available, using localStorage:', error.message);
                admins = JSON.parse(localStorage.getItem(getAdminsKey()) || '[]');
            }
            
            // Show other admins
            admins.forEach((admin, index) => {
                const div = document.createElement('div');
                const hasAccepted = isAdminAccepted(admin);
                const statusBg = hasAccepted ? '#dcfce7' : '#fef3c7';
                const statusColor = hasAccepted ? '#166534' : '#92400e';
                const statusText = hasAccepted ? '✓ Active' : '⏳ Pending';
                
                // Use firstName if available, otherwise email
                const displayName = admin.firstName || admin.name || admin.email;
                
                div.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: var(--bg); border-radius: 10px; margin-bottom: 8px;';
                div.innerHTML = `
                    <div>
                        <strong>${escapeHtml(displayName)}</strong>
                        ${admin.firstName ? `<span style="color: var(--text-light); font-size: 12px;"> (${escapeHtml(admin.email)})</span>` : ''}
                        <span style="background: ${statusBg}; color: ${statusColor}; padding: 2px 8px; border-radius: 20px; font-size: 11px; margin-left: 8px;">${statusText}</span>
                    </div>
                    <button onclick="removeAdmin('${escapeHtml(admin.email || index)}')" style="background: #fee2e2; border: none; color: #dc2626; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px;">Remove</button>
                `;
                container.appendChild(div);
            });
            
            if (admins.length === 0) {
                const emptyDiv = document.createElement('p');
                emptyDiv.style.cssText = 'color: var(--text-light); font-size: 14px; padding: 10px;';
                emptyDiv.textContent = 'No additional admins yet. Add family members or caregivers above.';
                container.appendChild(emptyDiv);
            }
        }

        function cleanupPendingInvites() {
            // Auto-clean: Remove any invites for admins who have already accepted
            let invites = JSON.parse(localStorage.getItem(getInvitesKey()) || '[]');
            const admins = JSON.parse(localStorage.getItem(getAdminsKey()) || '[]');
            const acceptedEmails = admins
                .filter(isAdminAccepted)
                .map(a => a.email.toLowerCase());
            const originalLength = invites.length;
            invites = invites.filter(invite => !acceptedEmails.includes(invite.email.toLowerCase()));
            
            // Save cleaned list if any were removed
            if (invites.length !== originalLength) {
                localStorage.setItem(getInvitesKey(), JSON.stringify(invites));
            }
        }

        function getNotificationsKey() {
            return IS_LEGACY_PROFILE ? 'hr_admin_notifications' : 'hr_admin_notifications_' + PROFILE_ID;
        }
        
        function isAdminAccepted(admin) {
            return !!(admin.acceptedAt || admin.firstName || admin.name);
        }

        async function loadAdminNotifications() {
            const container = document.getElementById('adminNotifications');
            let unreadNotifications = [];
            
            // Try to load from Firestore first
            try {
                const notificationsSnapshot = await db.collection('profiles').doc(PROFILE_ID)
                    .collection('notifications')
                    .where('read', '==', false)
                    .get();
                
                notificationsSnapshot.forEach(doc => {
                    unreadNotifications.push({ id: doc.id, ...doc.data() });
                });
                console.log('✅ Loaded notifications from Firestore:', unreadNotifications.length);
            } catch (error) {
                console.log('Firestore notifications not available, using localStorage:', error.message);
                const notifications = JSON.parse(localStorage.getItem(getNotificationsKey()) || '[]');
                unreadNotifications = notifications.filter(n => !n.read);
            }
            
            if (unreadNotifications.length === 0) {
                container.style.display = 'none';
                return;
            }
            
            container.style.display = 'block';
            container.innerHTML = '';
            
            unreadNotifications.forEach((notification) => {
                if (notification.type === 'invite_accepted') {
                    const displayName = notification.name || notification.email;
                    const div = document.createElement('div');
                    div.style.cssText = 'background: linear-gradient(135deg, #dcfce7, #bbf7d0); border: 2px solid #22c55e; border-radius: 12px; padding: 16px; margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center;';
                    div.innerHTML = `
                        <div>
                            <strong style="color: #166534;">🎉 ${escapeHtml(displayName)} has accepted the invitation!</strong>
                            <div style="font-size: 13px; color: #166534; margin-top: 4px;">They can now help manage ${escapeHtml(PROFILE_NAME)}'s profile.</div>
                        </div>
                        <button onclick="dismissNotification('${escapeHtml(notification.id || notification.email)}')" style="background: white; border: 1px solid #22c55e; color: #166534; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px;">Dismiss</button>
                    `;
                    container.appendChild(div);
                }
            });
        }

        async function dismissNotification(notificationId) {
            // Try to mark as read in Firestore
            try {
                await db.collection('profiles').doc(PROFILE_ID)
                    .collection('notifications').doc(notificationId)
                    .update({ read: true });
                console.log('✅ Notification dismissed in Firestore');
            } catch (error) {
                console.log('Firestore not available, using localStorage:', error.message);
                // Fallback to localStorage
                const notifications = JSON.parse(localStorage.getItem(getNotificationsKey()) || '[]');
                const notification = notifications.find(n => n.email === notificationId);
                if (notification) {
                    notification.read = true;
                    localStorage.setItem(getNotificationsKey(), JSON.stringify(notifications));
                }
            }
            loadAdminNotifications();
        }

        async function addAdmin() {
            const emailInput = document.getElementById('newAdminEmail');
            const email = emailInput.value.trim().toLowerCase();
            
            if (!email) {
                alert('Please enter an email address');
                return;
            }
            
            if (!email.includes('@')) {
                alert('Please enter a valid email address');
                return;
            }
            
            // Check if already an admin (check Firestore first, then localStorage)
            let isExistingAdmin = false;
            try {
                const adminDoc = await db.collection('profiles').doc(PROFILE_ID).collection('admins').doc(email).get();
                isExistingAdmin = adminDoc.exists;
            } catch (e) {
                // Fallback to localStorage
                const admins = JSON.parse(localStorage.getItem(getAdminsKey()) || '[]');
                isExistingAdmin = admins.some(a => a.email.toLowerCase() === email);
            }
            
            if (isExistingAdmin) {
                alert('This person is already an admin');
                return;
            }
            
            // Add admin to Firestore
            try {
                const currentUser = auth.currentUser;
                await db.collection('profiles').doc(PROFILE_ID).collection('admins').doc(email).set({
                    email: email,
                    addedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    addedBy: currentUser?.email || 'unknown',
                    profileId: PROFILE_ID,
                    profileName: PROFILE_NAME,
                    acceptedAt: null,
                    name: null,
                    firstName: null
                });
                console.log('✅ Admin added to Firestore:', email);
            } catch (error) {
                console.log('Firestore not available, using localStorage:', error.message);
            }
            
            // Also save to localStorage as fallback
            const admins = JSON.parse(localStorage.getItem(getAdminsKey()) || '[]');
            if (!admins.find(a => a.email.toLowerCase() === email)) {
                admins.push({ email: email, addedAt: new Date().toISOString() });
                localStorage.setItem(getAdminsKey(), JSON.stringify(admins));
            }
            
            // Send invitation email and wait for result
            const emailSent = await sendInviteEmail(email);
            
            emailInput.value = '';
            loadAdmins();
            
            if (emailSent) {
                alert(`Invitation sent to ${email}!\n\nThey can now sign in to manage ${PROFILE_NAME}'s profile.`);
            } else {
                alert(`${email} was added as an admin, but we couldn't send the email notification.\n\nPlease let them know they can sign in at ${window.location.origin}/login.html to manage ${PROFILE_NAME}'s profile.`);
            }
        }

        // ========== EMAIL INVITE (via Cloud Function) ==========
        const sendInviteEmailFn = firebase.functions().httpsCallable('sendInviteEmail');

        async function sendInviteEmail(email) {
            const currentUser = auth.currentUser;
            const senderName = currentUser?.displayName || currentUser?.email || 'A MyDailyWin user';
            const appUrl = window.location.origin;

            try {
                console.log('📧 Sending invite email via Cloud Function...');
                const result = await sendInviteEmailFn({
                    recipientEmail: email,
                    senderName: senderName,
                    profileName: PROFILE_NAME,
                    profileId: PROFILE_ID,
                    appUrl: appUrl
                });
                console.log('✅ Email sent successfully!');
                return true;
            } catch (error) {
                console.error('❌ Email send error:', error.code, error.message);
                alert('Could not send email: ' + (error.message || 'Unknown error'));
                return false;
            }
        }
        
        function fallbackMailto(email, senderName) {
            const appUrl = window.location.origin + '/login.html';
            const guideUrl = window.location.origin + '/admin-guide.html';
            const subject = encodeURIComponent(`You've been added as an admin for ${PROFILE_NAME} on MyDailyWin`);
            const body = encodeURIComponent(
                `Hi!\n\n` +
                `${senderName} has invited you to be an admin for ${PROFILE_NAME}'s MyDailyWin profile.\n\n` +
                `As an admin, you can:\n` +
                `• View ${PROFILE_NAME}'s progress and streaks\n` +
                `• Customize daily tasks\n` +
                `• Record payments\n` +
                `• Download reports\n\n` +
                `Sign in here to get started:\n${appUrl}\n\n` +
                `New to MyDailyWin? Read the admin guide:\n${guideUrl}\n\n` +
                `— The MyDailyWin Team`
            );
            
            // Create a temporary link and click it (more reliable than location.href)
            const mailtoLink = document.createElement('a');
            mailtoLink.href = `mailto:${email}?subject=${subject}&body=${body}`;
            mailtoLink.click();
        }

        async function removeAdmin(emailOrIndex) {
            if (!confirm('Remove this admin? They will no longer have access to this profile.')) return;
            
            // emailOrIndex could be an email string (from Firestore) or index (from localStorage)
            const email = typeof emailOrIndex === 'string' ? emailOrIndex : null;
            
            // Remove from Firestore
            if (email) {
                try {
                    await db.collection('profiles').doc(PROFILE_ID).collection('admins').doc(email).delete();
                    console.log('✅ Admin removed from Firestore:', email);
                } catch (error) {
                    console.log('Firestore delete failed:', error.message);
                }
            }
            
            // Also remove from localStorage
            const admins = JSON.parse(localStorage.getItem(getAdminsKey()) || '[]');
            let removed;
            if (email) {
                const idx = admins.findIndex(a => a.email === email);
                if (idx !== -1) removed = admins.splice(idx, 1)[0];
            } else {
                removed = admins.splice(emailOrIndex, 1)[0];
            }
            localStorage.setItem(getAdminsKey(), JSON.stringify(admins));
            
            loadAdmins();
        }

        async function resendInvite(email) {
            await sendInviteEmail(email);
            alert(`Invitation resent to ${email}\n\nNote: The email may take a few minutes to arrive.`);
        }

        function cancelInvite(index) {
            const invites = JSON.parse(localStorage.getItem(getInvitesKey()) || '[]');
            const removed = invites.splice(index, 1)[0];
            localStorage.setItem(getInvitesKey(), JSON.stringify(invites));
            
            // Also remove from admins
            const admins = JSON.parse(localStorage.getItem(getAdminsKey()) || '[]');
            const filtered = admins.filter(a => a.email !== removed.email);
            localStorage.setItem(getAdminsKey(), JSON.stringify(filtered));
            
            // Remove from their managed profiles
            if (removed) {
                const managedKey = 'hr_managed_profiles_' + removed.email;
                const managed = JSON.parse(localStorage.getItem(managedKey) || '[]');
                const filteredManaged = managed.filter(p => p.id !== PROFILE_ID);
                localStorage.setItem(managedKey, JSON.stringify(filteredManaged));
            }
            
            loadAdmins();
        }

        // ========== EVENT DELEGATION (CSP-compliant) ==========
        console.log('✅ Admin event delegation registered');
        document.addEventListener('click', function(e) {
            const el = e.target.closest('[data-action]');
            if (!el) return;
            const action = el.getAttribute('data-action');
            console.log('🔧 Click action:', action);
            const arg = el.getAttribute('data-arg');

            switch(action) {
                case 'showTab': showTab(arg); break;
                case 'openAddTaskModal': openAddTaskModal(arg); break;
                case 'openPaymentModal': openPaymentModal(); break;
                case 'closeModal': closeModal(arg); break;
                case 'downloadTaskResponses': downloadTaskResponses(); break;
                case 'downloadFeedbackLog': downloadFeedbackLog(); break;
                case 'downloadReports': downloadReports(); break;
                case 'clearReports': clearReports(); break;
                case 'saveNewTask': saveNewTask(); break;
                case 'saveEditTask': saveEditTask(); break;
                case 'deleteTask': deleteTask(); break;
                case 'savePayment': savePayment(); break;
                case 'addAdmin': addAdmin(); break;
                case 'contactDeveloper': contactDeveloper(); break;
                case 'referFriend': referFriend(); break;
                case 'downloadAllData': downloadAllData(); break;
                case 'resetUserBalance': resetUserBalance(); break;
                case 'resetUserData': resetUserData(); break;
                case 'exportSurveyDataCSV': exportSurveyDataCSV(); break;
            }
        });

        // ========== INIT ==========
        // Set app link with profile parameter
        if (PROFILE_ID) {
            document.getElementById('appLink').href = 'app.html?profile=' + PROFILE_ID;
        }
        
        // Restore last active tab
        const savedTab = sessionStorage.getItem('hr_admin_tab');
        if (savedTab) {
            showTab(savedTab);
        }
        
        try {
            displayStats();
            displayTasks();
            displayLevels();
            displayPayments();
            displayReports();
            loadAdmins();
            cleanupPendingInvites();
            loadAdminNotifications();
        } catch (err) {
            console.error('Init error (tabs still work):', err);
        }
