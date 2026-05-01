        function showToast(message, duration) {
            duration = duration || 4000;
            var existing = document.querySelector('.toast');
            if (existing) existing.remove();
            var toast = document.createElement('div');
            toast.className = 'toast';
            toast.textContent = message;
            toast.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:var(--card-bg, #fff);color:var(--text, #333);border:2px solid var(--primary);padding:16px 24px;border-radius:16px;font-weight:600;font-size:16px;z-index:9999;max-width:90vw;text-align:center;box-shadow:0 8px 30px rgba(0,0,0,0.15);animation:slideUp 0.3s ease-out;';
            document.body.appendChild(toast);
            setTimeout(function() {
                toast.style.opacity = '0';
                toast.style.transition = 'opacity 0.3s';
                setTimeout(function() { toast.remove(); }, 300);
            }, duration);
        }

        let currentStep = 1;
        let answers = {
            forWho: null,
            relationship: null,
            phoneComfort: null,
            motivation: null,
            activities: [],
            customActivities: '',
            userName: '',
            payoutPref: 'ondemand',
            needsHelp: null,
            profileId: null,
            // Admin goals (when setting up for someone else)
            adminGoals: '',
            adminChallenges: '',
            adminNotes: ''
        };

        function generateProfileId() {
            // Generate a unique profile ID
            const timestamp = Date.now().toString(36);
            const random = Math.random().toString(36).substring(2, 8);
            return timestamp + random;
        }

        function selectOption(step, value, event) {
            // Mark selected
            const stepEl = document.getElementById('step' + step);
            stepEl.querySelectorAll('.option').forEach(opt => opt.classList.remove('selected'));
            if (event?.currentTarget) event.currentTarget.classList.add('selected');

            // Store answer
            if (step === 1) answers.forWho = value;
            if (step === 2) answers.relationship = value;
            if (step === 3) answers.phoneComfort = value;
            if (step === 4) answers.motivation = value;

            // Auto-advance after brief delay
            setTimeout(() => {
                if (step === 1) {
                    if (value === 'self') {
                        // Skip relationship step, go to phone comfort
                        currentStep = 3;
                        updateQuestions('self');
                    } else {
                        currentStep = 2;
                    }
                } else if (step === 2) {
                    currentStep = 3;
                    updateQuestions('other');
                } else if (step === 3) {
                    currentStep = 4;
                } else if (step === 4) {
                    currentStep = 5;
                }
                showStep(currentStep);
            }, 300);
        }

        function updateQuestions(forWho) {
            if (forWho === 'self') {
                document.getElementById('step3Question').textContent = 'How comfortable are you with using a smartphone?';
                document.getElementById('step4Question').textContent = 'What would make completing daily tasks more rewarding for you?';
                document.getElementById('step5Question').textContent = 'What activities would you like to track and be rewarded for?';
                document.getElementById('step6Question').textContent = 'What\'s your name?';
                document.getElementById('step7Question').textContent = 'How would you like to receive reward payouts?';
            } else {
                document.getElementById('step3Question').textContent = 'How comfortable is this person with using a smartphone?';
                document.getElementById('step4Question').textContent = 'What would make completing daily tasks more rewarding for them?';
                document.getElementById('step5Question').textContent = 'What activities would they like to track and be rewarded for?';
                document.getElementById('step6Question').textContent = 'What\'s the name of the person who will use the app?';
                document.getElementById('step7Question').textContent = 'How would they like to receive reward payouts?';
            }
        }

        function toggleActivity(el, activity) {
            el.classList.toggle('selected');
            if (el.classList.contains('selected')) {
                if (!answers.activities.includes(activity)) {
                    answers.activities.push(activity);
                }
            } else {
                answers.activities = answers.activities.filter(a => a !== activity);
            }
        }

        function goToNameStep() {
            answers.customActivities = document.getElementById('customActivities').value.trim();
            currentStep = 6;
            showStep(6);
        }

        function goToPayoutStep() {
            const name = document.getElementById('userName').value.trim();
            if (!name) {
                showToast('Please enter a name to continue.');
                return;
            }
            answers.userName = name;
            currentStep = 7;
            showStep(7);
        }

        function selectPayoutPref(pref, event) {
            // Mark selected
            const stepEl = document.getElementById('step7');
            stepEl.querySelectorAll('.option').forEach(opt => opt.classList.remove('selected'));
            if (event?.currentTarget) event.currentTarget.classList.add('selected');
            
            answers.payoutPref = pref;
            
            // If setting up for someone else, go to admin goals step
            // Otherwise skip to help step
            setTimeout(() => {
                if (answers.forWho !== 'self') {
                    currentStep = '7b';
                    showStep('7b');
                } else {
                    currentStep = 8;
                    showStep(8);
                }
            }, 300);
        }

        function saveAdminGoals() {
            // Capture admin goals data
            answers.adminGoals = document.getElementById('adminGoals').value.trim();
            answers.adminChallenges = document.getElementById('adminChallenges').value.trim();
            answers.adminNotes = document.getElementById('adminNotes').value.trim();
            
            // Proceed to help step
            currentStep = 8;
            showStep(8);
        }

        function selectHelpOption(option, event) {
            // Mark selected
            const stepEl = document.getElementById('step8');
            stepEl.querySelectorAll('.option').forEach(opt => opt.classList.remove('selected'));
            if (event?.currentTarget) event.currentTarget.classList.add('selected');
            
            answers.needsHelp = option;

            setTimeout(() => {
                if (option === 'calendly') {
                    // Open Calendly in new tab, then show summary
                    window.open('https://calendly.com/spaltrowitz', '_blank');
                }
                goToSummary();
            }, 300);
        }

        function goToSummary() {
            // Generate profile ID if not already done
            if (!answers.profileId) {
                answers.profileId = generateProfileId();
            }
            
            currentStep = 9;
            showStep(9);
            buildSummary();
            
            // Save the profile setup to localStorage
            saveProfileSetup();
        }

        function saveProfileSetup() {
            // Determine template based on phone comfort
            let template = 'regular';
            if (answers.phoneComfort === 'learning') {
                template = 'lowtech';
            }
            
            const profileData = {
                id: answers.profileId,
                name: answers.userName,
                forWho: answers.forWho,
                relationship: answers.relationship,
                phoneComfort: answers.phoneComfort,
                motivation: answers.motivation,
                activities: answers.activities,
                customActivities: answers.customActivities,
                payoutPref: answers.payoutPref,
                template: template, // 'lowtech' or 'regular'
                // Admin goals (when setting up for someone else)
                adminGoals: answers.adminGoals || '',
                adminChallenges: answers.adminChallenges || '',
                adminNotes: answers.adminNotes || '',
                createdAt: new Date().toISOString()
            };
            
            const pendingUserEmail = localStorage.getItem('hr_onboarding_email') || sessionStorage.getItem('hr_pending_user_email');
            if (pendingUserEmail) {
                profileData.creatorEmail = pendingUserEmail;
                profileData.ownerEmail = pendingUserEmail;
            }
            
            try {
                // Save to localStorage with profile ID
                localStorage.setItem('hr_profile_' + answers.profileId, JSON.stringify(profileData));
                
                // Also save to a profiles index
                let profiles = JSON.parse(localStorage.getItem('hr_profiles_index') || '[]');
                if (!profiles.find(p => p.id === answers.profileId)) {
                    profiles.push({ id: answers.profileId, name: answers.userName, createdAt: profileData.createdAt });
                    localStorage.setItem('hr_profiles_index', JSON.stringify(profiles));
                }
                
                // Link to authenticated user if available
                const pendingUserUid = localStorage.getItem('hr_onboarding_uid') || sessionStorage.getItem('hr_pending_user_uid');
                if (pendingUserUid) {
                    const userProfilesKey = 'hr_user_profiles_' + pendingUserUid;
                    let userProfiles = JSON.parse(localStorage.getItem(userProfilesKey) || '[]');
                    if (!userProfiles.find(p => p.id === answers.profileId)) {
                        userProfiles.push({ id: answers.profileId, name: answers.userName });
                        localStorage.setItem(userProfilesKey, JSON.stringify(userProfiles));
                    }
                    localStorage.removeItem('hr_onboarding_uid');
                    sessionStorage.removeItem('hr_pending_user_uid');
                }
                localStorage.removeItem('hr_onboarding_email');
                sessionStorage.removeItem('hr_pending_user_email');
                
                // Also save survey data for export
                saveSurveyData(profileData);
            } catch (e) {
                showToast('Unable to save your profile. Your browser storage may be full or unavailable. Please try again or use a different browser.', 6000);
                return;
            }
        }
        
        function saveSurveyData(profileData) {
            // Append to survey data log for CSV export
            let surveyLog = JSON.parse(localStorage.getItem('hr_survey_log') || '[]');
            surveyLog.push({
                ...profileData,
                surveyCompletedAt: new Date().toISOString()
            });
            localStorage.setItem('hr_survey_log', JSON.stringify(surveyLog));
        }

        function buildSummary() {
            // User name display
            document.getElementById('userNameDisplay').textContent = answers.userName + "'s";
            document.getElementById('btnUserName').textContent = answers.userName + "'s";

            // Who
            let whoText = answers.userName;
            if (answers.forWho !== 'self') {
                const relMap = {
                    'parent': '(your parent)',
                    'spouse': '(your spouse/partner)',
                    'grandparent': '(your grandparent)',
                    'other': ''
                };
                whoText += ' ' + (relMap[answers.relationship] || '');
            }
            document.getElementById('summaryWho').textContent = whoText;

            // Motivation
            const motMap = {
                'achievement': '🏆 Achievement & Progress - loves levels, streaks, and milestones',
                'rewards': '🎁 Rewards & Recognition - motivated by earning points and prizes',
                'both': '✨ Both achievement AND rewards!'
            };
            document.getElementById('summaryMotivation').textContent = motMap[answers.motivation] || '';

            // Activities
            const actContainer = document.getElementById('summaryActivities');
            actContainer.innerHTML = '';
            const actMap = {
                'walk': '🚶 Walks',
                'exercise': '💪 Exercise',
                'puzzles': '🧩 Puzzles',
                'language': '🦉 Language',
                'reading': '📖 Reading',
                'call': '📞 Calls',
                'social': '👥 Social',
                'organize': '🧹 Organizing',
                'vitamins': '💊 Vitamins',
                'hobbies': '🎨 Hobbies'
            };
            answers.activities.forEach(act => {
                const tag = document.createElement('span');
                tag.className = 'summary-tag';
                tag.textContent = actMap[act] || act;
                actContainer.appendChild(tag);
            });
            if (answers.customActivities) {
                const tag = document.createElement('span');
                tag.className = 'summary-tag';
                tag.textContent = '✏️ ' + answers.customActivities.substring(0, 30) + (answers.customActivities.length > 30 ? '...' : '');
                actContainer.appendChild(tag);
            }

            // Show admin goals if provided
            if (answers.forWho !== 'self' && (answers.adminGoals || answers.adminChallenges || answers.adminNotes)) {
                const goalsSection = document.getElementById('adminGoalsSection');
                goalsSection.style.display = 'block';
                
                let goalsText = [];
                if (answers.adminGoals) goalsText.push('Goals: ' + answers.adminGoals);
                if (answers.adminChallenges) goalsText.push('Challenges to address: ' + answers.adminChallenges);
                if (answers.adminNotes) goalsText.push('Notes: ' + answers.adminNotes);
                
                document.getElementById('summaryAdminGoals').textContent = goalsText.join(' • ');
            }

            // Profile links
            const baseUrl = window.location.origin;
            const appUrl = baseUrl + '/app.html?profile=' + answers.profileId;
            const adminUrl = baseUrl + '/admin.html?profile=' + answers.profileId;
            
            document.getElementById('appLink').textContent = appUrl;
            document.getElementById('adminLink').textContent = adminUrl;
        }

        function openUserApp() {
            window.location.href = '/app.html?profile=' + answers.profileId;
        }

        function openAdminMode() {
            window.location.href = '/admin.html?profile=' + answers.profileId;
        }

        function showStep(step) {
            document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
            document.getElementById('step' + step).classList.add('active');
            
            // Update progress bar (now 8 steps)
            for (let i = 1; i <= 8; i++) {
                const prog = document.getElementById('prog' + i);
                prog.classList.remove('active', 'completed');
                if (i < step || (step === 9 && i <= 8)) {
                    prog.classList.add('completed');
                } else if (i === step) {
                    prog.classList.add('active');
                }
            }
        }

        function goBack() {
            if (currentStep === '7b') {
                currentStep = 7;
                showStep(7);
                return;
            } else if (currentStep === 3 && answers.forWho === 'self') {
                currentStep = 1;
            } else if (currentStep === 3) {
                currentStep = 2;
            } else if (currentStep === 2) {
                currentStep = 1;
            } else if (currentStep === 4) {
                currentStep = 3;
            } else if (currentStep === 5) {
                currentStep = 4;
            } else if (currentStep === 6) {
                currentStep = 5;
            } else if (currentStep === 7) {
                currentStep = 6;
            } else if (currentStep === 8) {
                currentStep = 7;
            } else if (currentStep === 9) {
                currentStep = 8;
            }
            showStep(currentStep);
        }

// ========== EVENT DELEGATION (CSP-compliant, replaces inline handlers) ==========
document.addEventListener('click', function(e) {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const action = el.getAttribute('data-action');
    const arg = el.getAttribute('data-arg');
    const arg2 = el.getAttribute('data-arg2');

    switch(action) {
        case 'selectOption': selectOption(parseInt(arg), arg2, e); break;
        case 'toggleActivity': toggleActivity(el, arg); break;
        case 'selectPayoutPref': selectPayoutPref(arg, e); break;
        case 'selectHelpOption': selectHelpOption(arg, e); break;
        case 'goBack': goBack(); break;
        case 'goToNameStep': goToNameStep(); break;
        case 'goToPayoutStep': goToPayoutStep(); break;
        case 'openAdminMode': openAdminMode(); break;
        case 'openUserApp': openUserApp(); break;
        case 'saveAdminGoals': saveAdminGoals(); break;
    }
});
