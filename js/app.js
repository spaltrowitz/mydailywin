        // ========== INPUT SANITIZATION UTILITIES ==========
        function sanitizeInput(input, maxLength = 500) {
            if (typeof input !== 'string') return '';
            let sanitized = input.trim().slice(0, maxLength);
            sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
            sanitized = sanitized.replace(/<[^>]*>/g, '');
            sanitized = sanitized.replace(/javascript:/gi, '');
            sanitized = sanitized.replace(/on\w+=/gi, '');
            return sanitized;
        }
        
        function isValidTaskName(name) {
            const sanitized = sanitizeInput(name, 100);
            return sanitized.length >= 2 && sanitized.length <= 100;
        }

        const db = firebase.firestore();
        const auth = firebase.auth();
        
        // Track current user for cloud sync
        let currentUser = null;
        let syncEnabled = false;
        
        // Listen for auth state changes
        auth.onAuthStateChanged(user => {
            currentUser = user;
            if (user && PROFILE_ID) {
                syncEnabled = true;
                loadFromCloud();
            }
        });
        
        // ========== PROFILE DETECTION ==========
        const urlParams = new URLSearchParams(window.location.search);
        const rawProfileId = urlParams.get('profile');
        const PROFILE_ID = (rawProfileId && /^[a-zA-Z0-9_-]+$/.test(rawProfileId)) ? rawProfileId : null;
        if (rawProfileId && !PROFILE_ID) {
            console.warn('⚠️ Invalid profile ID rejected:', rawProfileId);
        }
        
        // Storage key prefix based on profile
        const STORAGE_KEY = PROFILE_ID ? 'hr_state_' + PROFILE_ID : 'hr_state';
        const WEEK_KEY = PROFILE_ID ? 'hr_week_' + PROFILE_ID : 'hr_week';
        const DATE_KEY = PROFILE_ID ? 'hr_date_' + PROFILE_ID : 'hr_date';
        const REPORTS_KEY = PROFILE_ID ? 'hr_reports_' + PROFILE_ID : 'hr_reports';
        const ADMIN_KEY = PROFILE_ID
            ? (PROFILE_ID === 'stu' ? 'hr_admin' : 'hr_admin_' + PROFILE_ID)
            : 'hr_admin';
        const IS_LEGACY_PROFILE = PROFILE_ID === 'stu';

        // For legacy profiles (stu), use anonymous auth silently so state syncs
        // to Firestore without Stu needing to sign in
        if (IS_LEGACY_PROFILE && !auth.currentUser) {
            auth.signInAnonymously().catch(function(err) {
                console.log('Anonymous auth skipped:', err.message);
            });
        }

        // If no profile, check for existing profiles or redirect to get-started
        if (!PROFILE_ID) {
            // Check for existing profiles in localStorage
            const existingProfiles = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('hr_profile_')) {
                    const profileId = key.replace('hr_profile_', '');
                    try {
                        const data = JSON.parse(localStorage.getItem(key));
                        existingProfiles.push({ id: profileId, name: data.name || profileId });
                    } catch (e) {}
                }
            }
            // Also check for legacy 'stu' profile
            if (localStorage.getItem('hr_state')) {
                existingProfiles.push({ id: 'stu', name: 'Stu' });
            }
            
            if (existingProfiles.length === 1) {
                // Auto-redirect to the only profile
                window.location.href = '/app.html?profile=' + existingProfiles[0].id;
            } else if (existingProfiles.length > 1) {
                // Show profile picker
                window.location.href = '/login.html';
            } else {
                // No profiles - go to onboarding
                window.location.href = '/get-started.html';
            }
        }

        // Load profile info if available
        let PROFILE_NAME = 'Friend'; // Default name
        
        // Legacy profile: Stu
        if (PROFILE_ID === 'stu') {
            PROFILE_NAME = 'Stu';
            document.title = "Stu's MyDailyWin";
        } else {
            const profileData = localStorage.getItem('hr_profile_' + PROFILE_ID);
            if (profileData) {
                try {
                    const profile = JSON.parse(profileData);
                    PROFILE_NAME = profile.name || 'Friend';
                    document.title = PROFILE_NAME + "'s MyDailyWin";
                } catch (e) {
                    console.warn('Failed to parse profile data:', e);
                }
            } else {
                // Fallback: load profile from Firestore for cross-device access
                db.collection('profiles').doc(PROFILE_ID).get().then(function(doc) {
                    if (doc.exists) {
                        var data = doc.data();
                        PROFILE_NAME = data.name || 'Friend';
                        document.title = PROFILE_NAME + "'s MyDailyWin";
                        // Cache to localStorage for future visits
                        localStorage.setItem('hr_profile_' + PROFILE_ID, JSON.stringify(data));
                        // Update greeting if already rendered
                        var greetingEl = document.getElementById('greeting');
                        if (greetingEl) {
                            var hour = new Date().getHours();
                            var timeGreeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
                            greetingEl.textContent = timeGreeting + ', ' + PROFILE_NAME + '!';
                        }
                        console.log('Profile loaded from Firestore:', PROFILE_ID);
                    }
                }).catch(function(err) {
                    console.warn('Firestore profile fetch failed:', err);
                });
            }
        }

        // ========== CONFIG & STATE ==========
        // Points system: 100 points = $1.00
        // Routine tasks = lower value, Stretch goals = higher value
        
        // Daily motivational quotes (public domain / generic sayings)
        // Each quote has English and Spanish translation
        const DAILY_QUOTES = [
            // Habit & Consistency
            { en: "We are what we repeatedly do. Excellence is not an act, but a habit.", es: "Somos lo que hacemos repetidamente. La excelencia no es un acto, sino un hábito." },
            { en: "Small daily improvements lead to stunning long-term results.", es: "Pequeñas mejoras diarias conducen a resultados sorprendentes a largo plazo." },
            { en: "Success is the sum of small efforts repeated day in and day out.", es: "El éxito es la suma de pequeños esfuerzos repetidos día tras día." },
            { en: "The secret of your future is hidden in your daily routine.", es: "El secreto de tu futuro está escondido en tu rutina diaria." },
            { en: "Consistency is what transforms average into excellence.", es: "La constancia es lo que transforma lo promedio en excelencia." },
            { en: "A river cuts through rock not by power, but by persistence.", es: "Un río atraviesa la roca no por su fuerza, sino por su persistencia." },
            { en: "What you do every day matters more than what you do once in a while.", es: "Lo que haces cada día importa más que lo que haces de vez en cuando." },
            { en: "Good habits formed today become tomorrow's character.", es: "Los buenos hábitos formados hoy se convierten en el carácter del mañana." },
            { en: "Discipline is the bridge between goals and accomplishment.", es: "La disciplina es el puente entre las metas y los logros." },
            { en: "Progress, not perfection.", es: "Progreso, no perfección." },
            
            // Health & Fitness
            { en: "Take care of your body. It's the only place you have to live.", es: "Cuida tu cuerpo. Es el único lugar donde tienes que vivir." },
            { en: "The body achieves what the mind believes.", es: "El cuerpo logra lo que la mente cree." },
            { en: "Fitness is not about being better than someone else. It's about being better than you used to be.", es: "El ejercicio no se trata de ser mejor que otra persona. Se trata de ser mejor de lo que eras antes." },
            { en: "A healthy outside starts from the inside.", es: "Un exterior saludable comienza desde el interior." },
            { en: "Movement is medicine for the body and mind.", es: "El movimiento es medicina para el cuerpo y la mente." },
            { en: "Your health is an investment, not an expense.", es: "Tu salud es una inversión, no un gasto." },
            { en: "The groundwork for all happiness is good health.", es: "La base de toda felicidad es la buena salud." },
            { en: "Every step forward is a step toward your best self.", es: "Cada paso adelante es un paso hacia tu mejor versión." },
            { en: "Strong body, strong mind.", es: "Cuerpo fuerte, mente fuerte." },
            { en: "Rest when you need to, but never quit.", es: "Descansa cuando lo necesites, pero nunca te rindas." },
            
            // Positivity & Motivation
            { en: "Every day is a chance to get better.", es: "Cada día es una oportunidad para mejorar." },
            { en: "Start where you are. Use what you have. Do what you can.", es: "Empieza donde estás. Usa lo que tienes. Haz lo que puedas." },
            { en: "Believe you can and you're halfway there.", es: "Cree que puedes y ya estarás a medio camino." },
            { en: "The best time to start was yesterday. The next best time is now.", es: "El mejor momento para empezar fue ayer. El segundo mejor momento es ahora." },
            { en: "You don't have to be great to start, but you have to start to be great.", es: "No tienes que ser grande para empezar, pero tienes que empezar para ser grande." },
            { en: "One day or day one. You decide.", es: "Algún día o el día uno. Tú decides." },
            { en: "Your only limit is you.", es: "Tu único límite eres tú." },
            { en: "Make today so awesome that yesterday gets jealous.", es: "Haz que hoy sea tan increíble que el ayer tenga celos." },
            { en: "Dream it. Believe it. Build it.", es: "Sueñalo. Créelo. Constrúyelo." },
            { en: "Be stronger than your excuses.", es: "Sé más fuerte que tus excusas." },
            
            // Focus & Mindset
            { en: "Focus on progress, not perfection.", es: "Enfócate en el progreso, no en la perfección." },
            { en: "It's not about having time. It's about making time.", es: "No se trata de tener tiempo. Se trata de hacer tiempo." },
            { en: "The difference between try and triumph is a little 'umph'.", es: "La diferencia entre intentar y triunfar es un poco de esfuerzo extra." },
            { en: "Tough times don't last. Tough people do.", es: "Los tiempos difíciles no duran. La gente fuerte sí." },
            { en: "Fall seven times, stand up eight.", es: "Cae siete veces, levántate ocho." },
            { en: "Success doesn't come to you. You go to it.", es: "El éxito no viene a ti. Tú vas hacia él." },
            { en: "Champions keep going when they don't have anything left.", es: "Los campeones siguen adelante cuando ya no les queda nada." },
            { en: "The pain you feel today becomes the strength you feel tomorrow.", es: "El dolor que sientes hoy se convierte en la fuerza que sentirás mañana." },
            { en: "A year from now you'll wish you had started today.", es: "Dentro de un año desearás haber empezado hoy." },
            { en: "Stay patient and trust your journey.", es: "Ten paciencia y confía en tu camino." }
        ];
        
        // Get today's quote index (same quote for the whole day)
        function getDailyQuoteIndex() {
            const today = new Date();
            const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
            return dayOfYear % DAILY_QUOTES.length;
        }
        
        function getDailyQuote() {
            return DAILY_QUOTES[getDailyQuoteIndex()].en;
        }
        
        function getDailyQuoteSpanish() {
            return DAILY_QUOTES[getDailyQuoteIndex()].es;
        }

        // ========== TASK TEMPLATES ==========
        // Templates based on user type / phone comfort level
        
        // LOW-TECH TEMPLATE: Simple, essential daily tasks for users who need straightforward activities
        const LOW_TECH_TASKS = [
            { id: 1, name: "🚶 Go for a walk", value: 50 },
            { id: 4, name: "🛏️ Make the bed", value: 25 },
            { id: 5, name: "📞 Call a family member", value: 50 }
        ];
        
        const LOW_TECH_BONUSES = [
            // freq: relative frequency (higher = more often). Default is 1
            { id: 101, name: "🌳 Spend 15 minutes outside", value: 50, freq: 2 },
            { id: 102, name: "🧘 Do some stretching", value: 50, freq: 2 },
            { id: 103, name: "📺 Watch a favorite show", value: 25, freq: 1.5 },
            { id: 104, name: "🍽️ Eat a healthy meal", value: 50, freq: 2 },
            { id: 106, name: "🧹 Tidy up one room", value: 50, freq: 1 },
            { id: 107, name: "📖 Read for 15 minutes", value: 50, freq: 2 },
            { id: 108, name: "🎵 Listen to music you enjoy", value: 25, freq: 2 }
        ];
        
        // REGULAR TEMPLATE: Standard tasks for tech-comfortable users (like Stu's current setup)
        const REGULAR_TASKS = [
            { id: 1, name: "🚶 Go for a walk", value: 25 },
            { id: 4, name: "📝 Do a crossword puzzle", value: 50 },
            { id: 5, name: "🟩 Play Wordle", value: 10 }
        ];
        
        const REGULAR_BONUSES = [
            // freq: relative frequency (higher = more often). Default is 1
            { id: 101, name: "📸 Take a photo of something interesting", value: 50, needsPhoto: true, freq: 2 },
            { id: 102, name: "🧹 Organize one drawer or shelf", value: 50, needsPhoto: true, freq: 1 },
            { id: 122, name: "🚗 Clean out the car", value: 50, needsPhoto: true, freq: 0.5 },
            { id: 109, name: "🗑️ Throw away one thing you don't need", value: 50, needsPhoto: true, freq: 1 },
            { id: 123, name: "🔗 Try NYTimes Connections", value: 35, freq: 2 },
            { id: 103, name: "🌳 Spend 10 minutes outside", value: 50, freq: 2 },
            { id: 106, name: "🔋 Charge devices overnight", value: 50, freq: 1 },
            { id: 111, name: "🧽 Wipe down a counter or surface", value: 50, freq: 1 },
            { id: 112, name: "🛏️ Make the bed", value: 50, freq: 1.5 },
            { id: 114, name: "🧘 Do 5 minutes of stretching", value: 50, freq: 1.5 },
            { id: 115, name: "💊 Take vitamins", value: 50, freq: 1.5 },
            { id: 120, name: "📧 Clear out old emails", value: 50, freq: 1, excludeFromStu: true },
            { id: 121, name: "📝 Make a to-do list for tomorrow", value: 50, freq: 1.5 },
            { id: 104, name: "🎵 Listen to a new song", value: 50, needsComment: true, commentPrompt: "What song did you listen to?", freq: 2 },
            { id: 105, name: "📞 Call or text a friend", value: 100, needsComment: true, commentPrompt: "Who did you contact?", freq: 2 },
            { id: 116, name: "📖 Read for 10 minutes", value: 50, needsComment: true, commentPrompt: "What are you reading?", freq: 2 },
            { id: 117, name: "🎧 Listen to a podcast", value: 50, needsComment: true, commentPrompt: "Which podcast?", freq: 2 },
            { id: 118, name: "📺 Watch something new on streaming", value: 50, needsComment: true, commentPrompt: "What did you watch?", freq: 1.5 },
            { id: 119, name: "📱\u00a0Delete an unused app", value: 50, needsComment: true, commentPrompt: "Which app did you delete?", freq: 0.5 },
            // Cognitive / Brain Health
            { id: 130, name: "🧮\u00a0Play Sudoku", value: 50, freq: 1 },
            { id: 131, name: "🎓\u00a0Learn one new fact", value: 50, needsComment: true, commentPrompt: "What did you learn?", freq: 1.5 },
            { id: 132, name: "✍️\u00a0Write down a memory", value: 50, needsComment: true, commentPrompt: "What memory did you write about?", freq: 1 },
            { id: 133, name: "🗺️\u00a0Take a different route", value: 50, needsComment: true, commentPrompt: "Where did you go?", freq: 0.5 },
            // Social Connection
            { id: 134, name: "👋\u00a0Say hi to a neighbor", value: 50, freq: 1 },
            { id: 135, name: "😂\u00a0Share a joke or funny video", value: 50, needsComment: true, commentPrompt: "What was it?", freq: 1 },
            { id: 136, name: "🖼️\u00a0Share a photo with family", value: 50, freq: 1 },
            // Physical Wellness
            { id: 138, name: "🦵\u00a0Do 5 sit-to-stands", value: 50, freq: 1 },
            { id: 139, name: "🚶‍♂️\u00a0Walk 10 minutes after a meal", value: 50, freq: 1.5 },
            // Emotional / Mental Health
            { id: 140, name: "🙏\u00a0Write 3 things you're grateful for", value: 50, needsComment: true, commentPrompt: "What are you grateful for?", freq: 1.5 },
            { id: 141, name: "🌅\u00a0Sit quietly for 5 minutes", value: 50, freq: 1 },
            { id: 142, name: "😊\u00a0Do something that makes you smile", value: 50, needsComment: true, commentPrompt: "What made you smile?", freq: 1 },
            // Nutrition
            { id: 143, name: "🥦\u00a0Eat a fruit or vegetable", value: 50, needsComment: true, commentPrompt: "What did you eat?", freq: 2 },
            { id: 144, name: "🐟\u00a0Eat protein with a meal", value: 50, needsComment: true, commentPrompt: "What protein did you have?", freq: 1 },
            // Purpose / Contribution
            { id: 145, name: "🌱\u00a0Water or tend a plant", value: 50, freq: 1 },
            { id: 146, name: "💡\u00a0Teach someone something", value: 50, needsComment: true, commentPrompt: "What did you teach?", freq: 0.5 }
        ];
        
        // Load profile data and determine which template to use
        let profileTemplate = 'regular'; // default
        const profileDataRaw = localStorage.getItem('hr_profile_' + PROFILE_ID);
        if (profileDataRaw) {
            try {
                const profileInfo = JSON.parse(profileDataRaw);
                // If phone comfort is "learning" or "moderate", use low-tech template
                if (profileInfo.phoneComfort === 'learning') {
                    profileTemplate = 'lowtech';
                }
            } catch (e) {
                console.warn('Failed to parse profile data for template:', e);
            }
        }
        
        // Select tasks based on template (Stu always gets regular for backwards compatibility)
        const DEFAULT_DAILY_TASKS = (PROFILE_ID === 'stu' || profileTemplate === 'regular') ? REGULAR_TASKS : LOW_TECH_TASKS;
        const DAILY_BONUSES = (PROFILE_ID === 'stu' || profileTemplate === 'regular') ? REGULAR_BONUSES : LOW_TECH_BONUSES;
        
        function getConfiguredDailyTasks() {
            const adminRaw = localStorage.getItem(ADMIN_KEY);
            if (adminRaw) {
                try {
                    const adminData = JSON.parse(adminRaw);
                    if (adminData.customTasks && Array.isArray(adminData.customTasks.daily)) {
                        return filterForProfile(adminData.customTasks.daily);
                    }
                } catch (e) {
                    // Ignore JSON parsing errors or invalid admin data and fall back to default tasks.
                }
            }
            return filterForProfile(DEFAULT_DAILY_TASKS);
        }

        // Permanent weekly task (always shown) - tennis is special, can be logged 3x
        const TENNIS_WEEKLY = { id: 300, name: "🎾 Tennis/Pickleball", value: 30, isWeekly: true, isTennis: true, target: 3, stuOnly: true };

        // Rotating weekly bonus tasks (1 selected per week) - exempt from daily cap
        // Fun/reward-focused activities (100 pts = $1.00)
        const WEEKLY_BONUSES = [
            { id: 301, name: "💿 Sell coins or vinyls", value: 500, isWeekly: true, needsComment: true, commentPrompt: "What did you sell?" },
            { id: 331, name: "🔍 Research 5 coins or vinyls", value: 300, isWeekly: true, needsComment: true, commentPrompt: "What did you look up?" },
            { id: 302, name: "📺 Watch show/movie (streaming)", value: 200, isWeekly: true, needsComment: true, commentPrompt: "What did you watch?" },
            { id: 305, name: "🍿 Use the microwave", value: 50, isWeekly: true },
            { id: 306, name: "🛒 Check Aisle app for deals", value: 150, isWeekly: true, needsComment: true, commentPrompt: "Did you buy anything?", stuOnly: true },
            { id: 307, name: "💑 Take wife to lunch/dinner", value: 500, isWeekly: true, needsComment: true, commentPrompt: "Where did you go?" },
            { id: 308, name: "🍽️ Try a new restaurant", value: 300, isWeekly: true, needsComment: true, commentPrompt: "What restaurant?" },
            { id: 309, name: "💌 Tell a kid you're thinking of them", value: 200, isWeekly: true, needsComment: true, commentPrompt: "Who did you reach out to?" },
            { id: 310, name: "❤️ Do something nice for wife", value: 300, isWeekly: true, needsComment: true, commentPrompt: "What did you do?" },
            { id: 311, name: "🛍️ Buy a new grocery item", value: 150, isWeekly: true, needsComment: true, commentPrompt: "What did you buy?" },
            { id: 312, name: "🍔 Lunch with tennis friends", value: 300, isWeekly: true, needsComment: true, commentPrompt: "Where did you go?", stuOnly: true },
            { id: 313, name: "🤖 Use ChatGPT to solve something", value: 200, isWeekly: true, needsComment: true, commentPrompt: "What did you ask?" },
            { id: 314, name: "📞 Call a friend or family", value: 200, isWeekly: true, needsComment: true, commentPrompt: "Who did you call?" },
            { id: 315, name: "📦 Get rid of 3 office items", value: 300, isWeekly: true, needsComment: true, commentPrompt: "What items?" },
            { id: 316, name: "👕 Donate clothing", value: 250, isWeekly: true, needsComment: true, commentPrompt: "What did you donate?" },
            { id: 317, name: "👟 Donate sneakers", value: 250, isWeekly: true, needsComment: true, commentPrompt: "How many pairs?" },
            { id: 318, name: "🕵️ Apply for a Mystery Shop", value: 200, isWeekly: true, needsComment: true, commentPrompt: "Which company?", stuOnly: true },
            { id: 319, name: "🗑️ Throw away 5 items", value: 200, isWeekly: true, needsComment: true, commentPrompt: "What did you throw away?" },
            // Wellness: Cognitive
            { id: 320, name: "📚 Start or continue a book", value: 200, isWeekly: true, needsComment: true, commentPrompt: "What are you reading?" },
            { id: 321, name: "🎬 Watch a documentary", value: 200, isWeekly: true, needsComment: true, commentPrompt: "What did you watch?" },
            // Wellness: Social
            { id: 322, name: "☕ Have coffee/lunch with someone new", value: 300, isWeekly: true, needsComment: true, commentPrompt: "Who did you meet with?" },
            { id: 323, name: "💬 Have a 15+ minute conversation", value: 200, isWeekly: true, needsComment: true, commentPrompt: "Who did you talk to?" },
            // Wellness: Physical
            { id: 324, name: "🏊 Try a gentle new activity", value: 300, isWeekly: true, needsComment: true, commentPrompt: "What did you try?" },
            { id: 325, name: "🩺 Schedule or attend a health appointment", value: 250, isWeekly: true, needsComment: true, commentPrompt: "What appointment?" },
            // Wellness: Emotional
            { id: 326, name: "📝 Write a letter or card to someone", value: 300, isWeekly: true, needsComment: true, commentPrompt: "Who did you write to?" },
            { id: 327, name: "🎨 Do something creative", value: 200, isWeekly: true, needsComment: true, commentPrompt: "What did you create?" },
            // Wellness: Nutrition
            // Wellness: Purpose
            { id: 329, name: "🤝 Help someone with something", value: 300, isWeekly: true, needsComment: true, commentPrompt: "What did you help with?" },
            { id: 330, name: "📦 Organize one area of the house", value: 200, isWeekly: true, needsComment: true, commentPrompt: "What did you organize?" }
        ];

        // ========== TASK HELP INSTRUCTIONS ==========
        // Instructions for tasks (shown via "i" icon)
        const TASK_HELP = {
            123: {
                title: "🔗 Connections Setup",
                content: '<p><strong>What is it?</strong> A daily puzzle where you group 16 words into 4 categories.</p><p><strong>How to play:</strong></p><ol style="margin-left: 20px;"><li>Go to <strong>nytimes.com/games/connections</strong> in your browser — no download needed</li><li>Works on any phone, tablet, or computer</li><li>Look at the 16 words and find groups of 4 that share something in common</li><li>Tap 4 words, then hit Submit</li><li>You get 4 mistakes before the game ends</li></ol><p style="margin-top: 15px; color: var(--primary);">💡 Tip: Start with the most obvious group first!</p>'
            },
            120: {
                title: "📧 Email Cleanup",
                content: '<p><strong>Goal:</strong> Delete or archive old emails to keep your inbox tidy.</p><p><strong>How to do it:</strong></p><ol style="margin-left: 20px;"><li>Open your email app (Gmail, Mail, etc.)</li><li>Look for emails you don\'t need anymore</li><li>Swipe left to delete, or tap and hit the trash icon</li><li>Try deleting at least 5-10 old emails</li></ol><p style="margin-top: 15px; color: var(--primary);">💡 Tip: Start with promotional emails or old newsletters!</p>'
            },
            117: {
                title: "🎧 Podcasts Setup",
                content: '<p><strong>What is it?</strong> Free audio shows you can listen to on any topic.</p><p><strong>How to listen:</strong></p><ol style="margin-left: 20px;"><li>Open the <strong>Podcasts</strong> app on your iPhone (it\'s already there — purple icon)</li><li>Search for a topic you like (news, sports, history, comedy)</li><li>Tap a show, then tap an episode to play</li><li>Use headphones or play through your phone speaker</li></ol><p style="margin-top: 15px; color: var(--primary);">💡 Popular picks: "The Daily" (news), "SmartLess" (comedy), "Radiolab" (science)</p>'
            },
            118: {
                title: "📺 Streaming Setup",
                content: '<p><strong>What is it?</strong> Watch TV shows and movies on your phone, tablet, or TV.</p><p><strong>Popular services:</strong> Netflix, Hulu, Amazon Prime Video, Disney+</p><p><strong>How to watch:</strong></p><ol style="margin-left: 20px;"><li>You have access to Netflix, Hulu, Apple TV, and Amazon Video</li><li>Open any of them on your TV, phone, or browser</li><li>Browse and pick something to watch!</li></ol><p style="margin-top: 15px; color: var(--primary);">💡 Tip: Try documentaries or classic movies to start!</p>'
            },
            119: {
                title: "📱 Delete Unused Apps",
                content: '<p><strong>Goal:</strong> Remove apps you don\'t use to free up space and reduce clutter.</p><p><strong>How to delete apps:</strong></p><ol style="margin-left: 20px;"><li><strong>iPhone:</strong> Press and hold an app icon until it jiggles, then tap the X or minus sign</li><li><strong>Android:</strong> Press and hold an app, then drag to "Uninstall" or tap the info icon</li><li>Look for apps you haven\'t opened in months</li></ol><p style="margin-top: 15px; color: var(--primary);">💡 Tip: Games and shopping apps you forgot about are good ones to remove!</p>'
            },
            302: {
                title: "📺 Streaming Setup",
                content: '<p><strong>What is it?</strong> Watch TV shows and movies on your phone, tablet, or TV.</p><p><strong>Popular services:</strong> Netflix, Hulu, Amazon Prime Video, Disney+</p><p><strong>How to watch:</strong></p><ol style="margin-left: 20px;"><li>You have access to Netflix, Hulu, Apple TV, and Amazon Video</li><li>Open any of them on your TV, phone, or browser</li><li>Browse and pick something to watch!</li></ol><p style="margin-top: 15px; color: var(--primary);">💡 Tip: Try a movie or show someone recommended!</p>'
            },
            306: {
                title: "🛒 Aisle App Setup",
                content: '<p><strong>What is it?</strong> An app that shows grocery deals and lets you clip digital coupons.</p><p><strong>How to get started:</strong></p><ol style="margin-left: 20px;"><li>Open the <strong>Aisle</strong> app on your phone (you\'re already set up!)</li><li>Check for new deals before your grocery trip</li><li>Tap to "clip" any coupons you want</li><li>Show the app at checkout</li></ol><p style="margin-top: 15px; color: var(--primary);">💡 Tip: Check the app before your grocery trip!</p>'
            },
            313: {
                title: "🤖 ChatGPT Setup",
                content: '<p><strong>What is it?</strong> An AI assistant that can answer questions, help with writing, and more.</p><p><strong>How to use it:</strong></p><ol style="margin-left: 20px;"><li>Go to <strong>chatgpt.com</strong> in your browser — no download needed</li><li>Create a free account</li><li>Type any question and hit enter!</li></ol><p style="margin-top: 15px;"><strong>Try asking:</strong></p><ul style="margin-left: 20px;"><li>"What should I make for dinner tonight?"</li><li>"Explain why the sky is blue"</li><li>"Help me write a birthday message"</li></ul>'
            },
            318: {
                title: "🕵️ Mystery Shopping",
                content: '<p><strong>What is it?</strong> Get paid to shop and review stores or restaurants.</p><p><strong>How to get started:</strong></p><ol style="margin-left: 20px;"><li>Search for "mystery shopping companies" or try sites like:</li><li><strong>Market Force</strong> (marketforce.com)</li><li><strong>BestMark</strong> (bestmark.com)</li><li>Create an account and fill out your profile</li><li>Browse available shops in your area</li><li>Apply for ones that interest you</li></ol><p style="margin-top: 15px; color: var(--primary);">💡 Tip: Never pay to become a mystery shopper - legit ones are free to join!</p>'
            },
            130: {
                title: "🧮 Sudoku Setup",
                content: '<p><strong>What is it?</strong> A number puzzle where you fill a 9x9 grid so each row, column, and box has digits 1-9.</p><p><strong>How to play:</strong></p><ol style="margin-left: 20px;"><li>Go to <strong>websudoku.com</strong> in your browser — free, no download</li><li>Or try <strong>sudoku.com</strong></li><li>Start with "Easy" difficulty</li></ol><p style="margin-top: 15px; color: var(--primary);">💡 Tip: Start by looking for rows that are almost complete!</p>'
            },
            131: {
                title: "🎓 Learn Something New",
                content: '<p><strong>Goal:</strong> Learn one new fact today — about anything!</p><p><strong>Easy ways:</strong></p><ul style="margin-left: 20px;"><li>Google a question you\'ve always wondered about</li><li>Watch a short YouTube video on a topic you like</li><li>Read a Wikipedia article</li><li>Ask ChatGPT something curious</li></ul><p style="margin-top: 15px; color: var(--primary);">💡 Try: "What\'s the tallest building in the world?" or "How do airplanes fly?"</p>'
            },
            132: {
                title: "✍️ Write a Memory",
                content: '<p><strong>Goal:</strong> Write down one memory from your life. It can be anything!</p><p><strong>Ideas:</strong></p><ul style="margin-left: 20px;"><li>A favorite vacation</li><li>Something funny that happened</li><li>A memory with your kids when they were young</li><li>Your first job</li></ul><p style="margin-top: 15px; color: var(--primary);">💡 Just a few sentences is perfect. Type it in the comment box!</p>'
            },
            138: {
                title: "🦵 Sit-to-Stands",
                content: '<p><strong>What is it?</strong> Stand up from a chair and sit back down. Great for leg strength!</p><p><strong>How to do it safely:</strong></p><ol style="margin-left: 20px;"><li>Sit in a sturdy chair (not on wheels)</li><li>Scoot to the front edge</li><li>Lean forward slightly and push up to standing</li><li>Pause, then sit back down slowly</li><li>Repeat 5 times</li></ol><p style="margin-top: 15px; color: var(--primary);">💡 Keep a table nearby for support. Go at your own pace — no rush!</p>'
            },
            140: {
                title: "🙏 Gratitude Journaling",
                content: '<p><strong>Goal:</strong> Write 3 things you\'re thankful for today. Big or small!</p><p><strong>Examples:</strong></p><ul style="margin-left: 20px;"><li>"The weather was nice today"</li><li>"Had a good talk with my son"</li><li>"Enjoyed my morning coffee"</li><li>"My tennis game is improving"</li></ul><p style="margin-top: 15px; color: var(--primary);">💡 Type them in the comment box, or write in a notebook — whatever\'s easier!</p>'
            },
            324: {
                title: "🏊 Gentle Activities to Try",
                content: '<p><strong>Goal:</strong> Try something different to keep moving in new ways.</p><p><strong>Safe ideas:</strong></p><ul style="margin-left: 20px;"><li>🏊 Swimming or water aerobics (easy on joints)</li><li>🚶 Walk a new trail or park</li><li>🧘 Gentle yoga — search YouTube: "gentle yoga for seniors"</li><li>🏓 Table tennis or bocce ball</li><li>🚴 Stationary bike at a gym</li><li>💃 A beginner dance class</li></ul><p style="margin-top: 15px; color: var(--primary);">💡 Start slow. If it hurts, stop. The goal is fun, not intensity!</p>'
            },
            327: {
                title: "🎨 Creative Ideas",
                content: '<p><strong>Goal:</strong> Make or create something — anything counts!</p><p><strong>Ideas:</strong></p><ul style="margin-left: 20px;"><li>🎨 Draw, paint, or doodle</li><li>📸 Take an artistic photo</li><li>🧑‍🍳 Try a new recipe</li><li>✍️ Write a poem or short story</li><li>🔧 Build or fix something</li><li>🎵 Play music or sing</li></ul><p style="margin-top: 15px; color: var(--primary);">💡 No wrong answers — if you made something, it counts!</p>'
            },
            320: {
                title: "📚 Start or Continue a Book",
                content: '<p><strong>Goal:</strong> Spend some time reading a book this week.</p><p><strong>How to find books:</strong></p><ul style="margin-left: 20px;"><li>Visit the public library — you already go!</li><li>Ask the librarian for recommendations</li><li>Audiobooks count too — ask the library about their free audiobook program</li></ul><p style="margin-top: 15px; color: var(--primary);">💡 Not sure what to read? Ask ChatGPT: "Recommend a book about [topic I like]"</p>'
            },
            321: {
                title: "🎬 Watch a Documentary",
                content: '<p><strong>Goal:</strong> Watch something that teaches you something new.</p><p><strong>Where to find them:</strong></p><ul style="margin-left: 20px;"><li><strong>YouTube</strong> — search "best documentaries" + a topic you like</li><li><strong>Netflix/Hulu</strong> — browse the Documentaries category</li><li><strong>PBS</strong> — free at pbs.org</li></ul><p style="margin-top: 15px; color: var(--primary);">💡 Try: nature, history, space, cooking, or true crime!</p>'
            },
            325: {
                title: "🩺 Health Appointment",
                content: '<p><strong>Goal:</strong> Schedule or go to any health appointment this week.</p><p><strong>Counts as completed:</strong></p><ul style="margin-left: 20px;"><li>Doctor checkup</li><li>Dentist</li><li>Eye doctor</li><li>Physical therapy</li><li>Even just calling to schedule one!</li></ul><p style="margin-top: 15px; color: var(--primary);">💡 Preventive care keeps you healthy long-term. One call is all it takes!</p>'
            },
            326: {
                title: "📝 Write a Letter or Card",
                content: '<p><strong>Goal:</strong> Write to someone you care about — handwritten or typed.</p><p><strong>Ideas:</strong></p><ul style="margin-left: 20px;"><li>A thank-you note</li><li>A birthday card</li><li>A "thinking of you" note to an old friend</li><li>An email to someone you haven\'t talked to in a while</li></ul><p style="margin-top: 15px; color: var(--primary);">💡 Handwritten notes are extra special — people love getting real mail!</p>'
            },
            301: {
                title: "💿 Sell Coins or Vinyls",
                content: '<p><strong>Goal:</strong> List or sell items from your collection.</p><p><strong>How to sell:</strong></p><ul style="margin-left: 20px;"><li><strong>Local record/coin shops</strong> — bring items in for a quote</li><li><strong>Coin shows and flea markets</strong> — great for meeting collectors</li><li><strong>Research first:</strong> Search eBay for your item, filter by "Sold" to see real prices</li><li>Or ask ChatGPT: "This is a [year] [coin/vinyl]. How much is it worth?"</li><li>Knowing the value helps you get a fair price in person</li></ul><p style="margin-top: 15px; color: var(--primary);">💡 Take clear photos and look up what similar items sold for!</p>'
            },
            316: {
                title: "👕 Donate Clothing",
                content: '<p><strong>Goal:</strong> Find clothes you no longer wear and donate them.</p><p><strong>Where to donate:</strong></p><ul style="margin-left: 20px;"><li>Goodwill or Salvation Army</li><li>Local clothing drives</li><li>Homeless shelters</li><li>Put in a bag by the door — drop off next time you\'re out</li></ul><p style="margin-top: 15px; color: var(--primary);">💡 If you haven\'t worn it in a year, someone else could use it!</p>'
            },
            331: {
                title: "🔍 Research Coins or Vinyls",
                content: '<p><strong>Goal:</strong> Look up the value of 5 coins or vinyl records you own.</p><p><strong>How to research:</strong></p><ol style="margin-left: 20px;"><li>Go to <strong>ebay.com</strong> in your browser</li><li>Search for your coin or vinyl (e.g. "1965 quarter" or "Beatles Abbey Road vinyl")</li><li>Click <strong>Sold Items</strong> filter to see what people actually paid</li><li>Write down the prices</li></ol><p style="margin-top: 15px;"><strong>Or use ChatGPT:</strong></p><p style="margin-left: 20px;">"I have a [year] [description]. How much is it worth and how much can I expect to sell it for?"</p><p style="margin-top: 15px; color: var(--primary);">💡 Knowing the value before selling means you won\'t get lowballed!</p>'
            }
        };

        // ========== PROFILE TASK FILTERING ==========
        // Filter tasks based on stuOnly/excludeFromStu flags using IS_LEGACY_PROFILE
        function filterForProfile(tasks) {
            return tasks.filter(t => {
                if (t.stuOnly && !IS_LEGACY_PROFILE) return false;
                if (t.excludeFromStu && IS_LEGACY_PROFILE) return false;
                return true;
            });
        }

        // ========== COMPLETED-EVER TRACKING ==========
        const COMPLETED_EVER_KEY = PROFILE_ID ? 'hr_completed_ever_' + PROFILE_ID : 'hr_completed_ever';

        function getCompletedEverTasks() {
            try {
                return JSON.parse(localStorage.getItem(COMPLETED_EVER_KEY) || '[]');
            } catch (e) {
                return [];
            }
        }

        function markTaskCompletedEver(taskId) {
            const completed = getCompletedEverTasks();
            if (!completed.includes(taskId)) {
                completed.push(taskId);
                localStorage.setItem(COMPLETED_EVER_KEY, JSON.stringify(completed));
            }
        }

        // ========== TASK HELP MODAL ==========
        function showTaskHelp(taskId) {
            const help = TASK_HELP[taskId];
            if (help) {
                // Title via textContent (auto-escaped). Content is static HTML from TASK_HELP constant — safe for innerHTML.
                document.getElementById('helpModalTitle').textContent = escapeHtml(help.title);
                document.getElementById('helpModalContent').innerHTML = help.content;
                openModal('taskHelpModal');
            }
        }

        // Get the current day number of the year
        function getDayNumber() {
            const now = new Date();
            const start = new Date(now.getFullYear(), 0, 0);
            const diff = now - start;
            const oneDay = 86400000; // milliseconds in a day
            return Math.floor(diff / oneDay);
        }

        // Get the current week number of the year (weeks start on Sunday)
        function getWeekNumber() {
            const now = new Date();
            // Find the most recent Sunday
            const dayOfWeek = now.getDay(); // 0 = Sunday
            const sunday = new Date(now);
            sunday.setDate(now.getDate() - dayOfWeek);
            sunday.setHours(0, 0, 0, 0);
            
            // Find first Sunday of the year
            const firstDayOfYear = new Date(now.getFullYear(), 0, 1);
            const firstSunday = new Date(firstDayOfYear);
            const firstDayOfWeek = firstDayOfYear.getDay();
            if (firstDayOfWeek !== 0) {
                firstSunday.setDate(firstDayOfYear.getDate() + (7 - firstDayOfWeek));
            }
            
            // Calculate week number
            const diff = sunday - firstSunday;
            const oneWeek = 604800000; // milliseconds in a week
            return Math.floor(diff / oneWeek) + 1;
        }

        // Check if today is Wednesday (for weekly survey)
        function isWednesday() {
            return new Date().getDay() === 3; // 3 = Wednesday
        }

        // Get today's daily bonus task (weighted by frequency)
        function getDailyBonus() {
            const dayNum = getDayNumber();
            const filteredBonuses = filterForProfile(DAILY_BONUSES);
            if (filteredBonuses.length === 0) return null;
            
            // Build weighted list based on freq property
            const weightedList = [];
            filteredBonuses.forEach((task, originalIndex) => {
                const freq = task.freq || 1;
                const count = Math.round(freq * 10);
                for (let i = 0; i < count; i++) {
                    weightedList.push(originalIndex);
                }
            });
            
            // Use day number as seed for consistent daily selection
            const index = dayNum % weightedList.length;
            const selectedIndex = weightedList[index];
            return filteredBonuses[selectedIndex];
        }

        // Get this week's bonus tasks (tennis + 1 rotating, filtered for profile)
        function getWeeklyBonuses() {
            const weekNum = getWeekNumber();
            const filteredWeekly = filterForProfile(WEEKLY_BONUSES);
            const bonuses = [];
            
            // Only include Tennis if not filtered out by profile
            if (!TENNIS_WEEKLY.stuOnly || IS_LEGACY_PROFILE) {
                bonuses.push(TENNIS_WEEKLY);
            }
            
            if (filteredWeekly.length > 0) {
                const index = weekNum % filteredWeekly.length;
                bonuses.push(filteredWeekly[index]);
            }
            return bonuses;
        }

        function getDefaultState() {
            return {
                tasks: [],
                streak: 0,
                lastStreakDate: null,
                balance: 0,
                totalEarned: 0,
                history: [],
                mode: localStorage.getItem('theme') || 'light',
                currentTaskId: null,
                lastLoginDate: null,
                spinUsedToday: false,
                achievements: [],
                completedToday: [],
                weeklyCounters: {},
                weeklyBonusesCompleted: [],
                dailyBonusCompleted: null,
                weeklyFeedbackCompleted: null,
                feedbackRating: 0,
                feedbackHistory: []
            };
        }

        let state = getDefaultState();

        // ========== INIT ==========
        function init() {
            // Set admin link with profile parameter (if element exists)
            var adminLink = document.getElementById('adminLink');
            if (adminLink && PROFILE_ID) {
                adminLink.href = 'admin.html?profile=' + PROFILE_ID;
            }
            
            loadState();
            applyTheme();
            checkNewDay();
            checkDailyLoginBonus();
            checkLuckyDay();
            updateGreeting();
            render();
            
            // Check for payment notifications
            checkPaymentNotifications();
        }
        
        // Check for payment sent notifications from Firestore
        async function checkPaymentNotifications() {
            const profileId = PROFILE_ID || 'stu';
            try {
                const snapshot = await db.collection('userNotifications')
                    .where('profileId', '==', profileId)
                    .where('read', '==', false)
                    .where('type', '==', 'payout_sent')
                    .get();
                
                if (!snapshot.empty) {
                    // Show the most recent notification
                    const doc = snapshot.docs[0];
                    const notif = doc.data();
                    
                    // Show payment received modal
                    showPaymentReceivedModal(notif.amount, doc.id);
                }
            } catch (err) {
                console.error('Error checking notifications:', err);
            }
        }
        
        function showPaymentReceivedModal(amount, notifId) {
            // Create and show modal
            const modal = document.createElement('div');
            modal.id = 'paymentReceivedModal';
            modal.className = 'modal';
            modal.style.display = 'flex';
            modal.innerHTML = `
                <div class="modal-box" style="text-align: center; padding: 30px;">
                    <div style="font-size: 80px; margin-bottom: 15px;">💰</div>
                    <h2 style="margin-bottom: 10px; color: var(--primary);">Payment Sent!</h2>
                    <p style="color: var(--text-light); margin-bottom: 20px;">Your payout is on its way</p>
                    
                    <div style="background: linear-gradient(135deg, #3d8a02 0%, #2d6e01 100%); border-radius: 16px; padding: 25px; color: white; margin-bottom: 20px;">
                        <div style="font-size: 14px; opacity: 0.9;">Amount</div>
                        <div style="font-size: 42px; font-weight: 800;">$${parseFloat(amount).toFixed(2)}</div>
                    </div>
                    
                    <div style="background: #f0fdf4; border-radius: 12px; padding: 15px; margin-bottom: 25px;">
                        <div style="color: #166534; font-size: 14px;">
                            <strong>From:</strong> MyDailyWin<br>
                            <strong>Via:</strong> Zelle<br>
                            <span style="font-size: 14px; opacity: 0.8;">Check your Zelle app or bank notifications!</span>
                        </div>
                    </div>
                    
                    <button data-action="dismissPaymentNotification" data-arg="${escapeHtml(String(notifId))}" class="btn btn-primary" style="width: 100%; padding: 14px;">
                        🎉 Awesome!
                    </button>
                </div>
            `;
            document.body.appendChild(modal);
            triggerConfetti();
        }
        
        async function dismissPaymentNotification(notifId) {
            try {
                await db.collection('userNotifications').doc(notifId).update({
                    read: true,
                    readAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            } catch (err) {
                console.error('Error marking notification as read:', err);
            }
            
            // Remove modal
            const modal = document.getElementById('paymentReceivedModal');
            if (modal) modal.remove();
        }

        // ========== GAMBLER FEATURES ==========
        function isLuckyDay() {
            // 10% chance each day is a lucky day (seeded by date for consistency)
            const today = new Date().toDateString();
            let hash = 0;
            for (let i = 0; i < today.length; i++) {
                hash = ((hash << 5) - hash) + today.charCodeAt(i);
                hash = hash & hash;
            }
            return Math.abs(hash) % 10 === 0; // 10% chance
        }

        function checkLuckyDay() {
            if (isLuckyDay()) {
                document.getElementById('luckyDayBanner').style.display = 'block';
            }
        }

        function checkDailyLoginBonus() {
            const today = new Date().toDateString();
            if (state.lastLoginDate !== today) {
                // Give login bonus
                state.lastLoginDate = today;
                addPoints(25);
                state.spinUsedToday = false; // Reset spin for new day
                saveState();
                
                // Show login bonus animation with confetti
                document.getElementById('loginBonusSection').style.display = 'block';
                triggerConfetti(20);
                setTimeout(() => {
                    document.getElementById('loginBonusSection').style.display = 'none';
                }, 5000);
            }
        }

        function getStreakMultiplier() {
            if (state.streak >= 14) return 2.0;
            if (state.streak >= 7) return 1.5;
            return 1.0;
        }

        function getRandomBonus() {
            // 10% chance of 2x bonus on any task
            return Math.random() < 0.1 ? 2 : 1;
        }

        function addPoints(amount) {
            state.balance += amount;
            state.totalEarned += amount;
        }

        function calculatePointsWithBonuses(basePoints) {
            let pts = basePoints;
            let bonusMsg = '';

            const streakMult = getStreakMultiplier();
            if (streakMult > 1) {
                pts = Math.floor(pts * streakMult);
                bonusMsg += `🔥 ${streakMult}x streak bonus! `;
            }

            if (isLuckyDay()) {
                pts = Math.floor(pts * 1.5);
                bonusMsg += '🍀 Lucky day 1.5x! ';
            }

            const randomMult = getRandomBonus();
            if (randomMult > 1) {
                pts = Math.floor(pts * randomMult);
                bonusMsg += '🎉 You got a random 2x bonus! ';
            }

            return { pts, bonusMsg, randomMult };
        }

        function spinWheel() {
            if (state.spinUsedToday) {
                showToast('You already spun today! Come back tomorrow 🎰');
                return;
            }
            
            const spinEmoji = document.getElementById('spinEmoji');
            const spinResult = document.getElementById('spinResult');
            const spinBtn = document.getElementById('spinBtn');
            
            spinBtn.disabled = true;
            spinBtn.textContent = '✨ Revealing...';
            
            const prizes = [
                { emoji: '💰', pts: 50, text: '+50 pts!' },
                { emoji: '⭐', pts: 25, text: '+25 pts!' },
                { emoji: '🎉', pts: 100, text: 'Big bonus! +100 pts!' },
                { emoji: '✨', pts: 10, text: '+10 pts!' },
                { emoji: '🍀', pts: 75, text: 'Great bonus! +75 pts!' },
                { emoji: '💎', pts: 150, text: 'Amazing! +150 pts!' }
            ];
            
            // Exponential deceleration — starts fast, slows like a real wheel
            const totalSpins = 24;
            let spins = 0;

            // Pre-determine the winner
            const weights = [25, 30, 5, 20, 15, 5]; // Total 100
            let random = Math.random() * 100;
            let prizeIndex = 0;
            for (let i = 0; i < weights.length; i++) {
                random -= weights[i];
                if (random <= 0) {
                    prizeIndex = i;
                    break;
                }
            }

            function doSpin() {
                spinEmoji.textContent = prizes[Math.floor(Math.random() * prizes.length)].emoji;
                spinEmoji.style.transform = `rotate(${spins * 30}deg)`;
                spins++;

                if (spins >= totalSpins) {
                    // Final reveal
                    const prize = prizes[prizeIndex];
                    spinEmoji.textContent = prize.emoji;
                    spinEmoji.style.transform = 'rotate(0deg) scale(1.3)';
                    spinResult.textContent = prize.text;

                    addPoints(prize.pts);
                    state.spinUsedToday = true;
                    saveState();
                    render();
                    triggerCoinRain();

                    setTimeout(() => {
                        spinEmoji.style.transform = 'rotate(0deg) scale(1)';
                    }, 500);
                } else {
                    // Deceleration: delay = 60ms * e^(1.8 * progress)
                    const progress = spins / totalSpins;
                    const delay = 60 * Math.exp(1.8 * progress);
                    setTimeout(doSpin, delay);
                }
            }
            doSpin();
        }

        function triggerCoinRain() {
            if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
            const count = 8;
            for(let i = 0; i < count; i++) {
                setTimeout(() => {
                    const el = document.createElement('div');
                    el.innerText = ['💰', '🪙'][Math.floor(Math.random()*2)];
                    el.style.cssText = `position:fixed;left:${Math.random()*100}vw;top:-50px;font-size:32px;transition:top 1s ease-in,opacity 1s;z-index:9999;pointer-events:none;`;
                    document.body.appendChild(el);
                    requestAnimationFrame(() => { el.style.top = '110vh'; el.style.opacity = '0'; });
                    setTimeout(() => el.remove(), 1100);
                }, i * 80);
            }
        }

        // ========== WEEKLY FEEDBACK SURVEY ==========
        function checkWeeklySurvey() {
            const weekNum = getWeekNumber();
            const surveyInvite = document.getElementById('surveyInvite');
            const today = new Date();
            const dayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday
            
            // Only show survey on Sunday (day 0) or later in the week
            // And only if not already completed this week
            // Also require at least some activity (totalEarned > 0)
            if (state.weeklyFeedbackCompleted === weekNum) {
                // Already completed this week - hide it
                surveyInvite.style.display = 'none';
            } else if (dayOfWeek === 0 && state.totalEarned > 0) {
                // It's Sunday and user has activity - show survey
                surveyInvite.style.display = 'block';
            } else if (state.totalEarned > 100) {
                // User has earned over 100 pts - show survey anytime
                surveyInvite.style.display = 'block';
            } else {
                // New user or not Sunday yet - hide survey
                surveyInvite.style.display = 'none';
            }
        }

        function setRating(rating) {
            state.feedbackRating = rating;
            const stars = document.querySelectorAll('#starRating span');
            stars.forEach((star, index) => {
                if (index < rating) {
                    star.classList.add('active');
                } else {
                    star.classList.remove('active');
                }
            });
        }

        function submitFeedback() {
            const rating = state.feedbackRating;
            const favoriteTask = document.getElementById('favoriteTask').value.trim();
            const suggestions = document.getElementById('feedbackSuggestions').value.trim();
            
            if (rating === 0) {
                showToast('⚠️ Please select a star rating');
                return;
            }
            
            // Save feedback
            const feedback = {
                week: getWeekNumber(),
                date: new Date().toISOString(),
                rating: rating,
                favoriteTask: favoriteTask,
                suggestions: suggestions
            };
            
            // Store feedback history
            if (!state.feedbackHistory) state.feedbackHistory = [];
            state.feedbackHistory.push(feedback);
            
            // Award points
            addPoints(15);
            state.weeklyFeedbackCompleted = getWeekNumber();
            saveState();
            
            // Close modal and hide survey invite
            closeModal('feedbackModal');
            document.getElementById('surveyInvite').style.display = 'none';
            
            // Reset form
            setRating(0);
            document.getElementById('favoriteTask').value = '';
            document.getElementById('feedbackSuggestions').value = '';
            
            // Show confirmation
            triggerConfetti();
            showToast('Thanks for the feedback! +15 pts earned! 🎉', 5000);
            render();
        }
        
        function downloadFeedbackLog() {
            if (!state.feedbackHistory || state.feedbackHistory.length === 0) {
                showToast('No feedback entries yet');
                return;
            }
            
            // Create CSV content
            const headers = ['Week', 'Date', 'Rating', 'Favorite Task', 'Suggestions'];
            const rows = state.feedbackHistory.map(f => [
                f.week,
                new Date(f.date).toLocaleDateString(),
                f.rating,
                `"${(f.favoriteTask || '').replace(/"/g, '""')}"`,
                `"${(f.suggestions || '').replace(/"/g, '""')}"`
            ]);
            
            const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
            
            // Download file
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `mydailywin-feedback-${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            URL.revokeObjectURL(url);
        }
        
        function downloadTaskResponses() {
            const allResponses = [];
            
            // Add tennis sessions
            if (state.tennisSessions && state.tennisSessions.length > 0) {
                state.tennisSessions.forEach(s => {
                    allResponses.push({
                        type: 'Tennis/Pickleball',
                        date: s.date,
                        task: '🎾 Tennis/Pickleball',
                        comment: s.park
                    });
                });
            }
            
            // Add daily bonus comments
            if (state.dailyBonusComments && state.dailyBonusComments.length > 0) {
                state.dailyBonusComments.forEach(c => {
                    allResponses.push({
                        type: 'Daily Bonus',
                        date: new Date(c.date).toLocaleDateString(),
                        task: c.taskName,
                        comment: c.comment || ''
                    });
                });
            }
            
            // Add weekly bonus comments
            if (state.weeklyBonusComments && state.weeklyBonusComments.length > 0) {
                state.weeklyBonusComments.forEach(c => {
                    allResponses.push({
                        type: 'Weekly Challenge',
                        date: new Date(c.date).toLocaleDateString(),
                        task: c.taskName,
                        comment: c.comment || ''
                    });
                });
            }
            
            if (allResponses.length === 0) {
                showToast('No task responses yet');
                return;
            }
            
            // Create CSV content
            const headers = ['Type', 'Date', 'Task', 'Comment'];
            const rows = allResponses.map(r => [
                r.type,
                r.date,
                `"${r.task.replace(/"/g, '""')}"`,
                `"${r.comment.replace(/"/g, '""')}"`
            ]);
            
            const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
            
            // Download file
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `mydailywin-task-responses-${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            URL.revokeObjectURL(url);
        }

        function checkAchievements() {
            const newAchievements = [];
            
            if (state.totalEarned >= 100 && !state.achievements.includes('first_dollar')) {
                newAchievements.push({ id: 'first_dollar', name: '💵 First Dollar!', desc: 'Earned your first $1' });
                state.achievements.push('first_dollar');
            }
            if (state.streak >= 7 && !state.achievements.includes('week_streak')) {
                newAchievements.push({ id: 'week_streak', name: '🔥 Week Warrior!', desc: '7 day streak' });
                state.achievements.push('week_streak');
            }
            if (state.streak >= 30 && !state.achievements.includes('month_streak')) {
                newAchievements.push({ id: 'month_streak', name: '🏆 Monthly Master!', desc: '30 day streak' });
                state.achievements.push('month_streak');
            }
            if (state.totalEarned >= 1000 && !state.achievements.includes('ten_dollars')) {
                newAchievements.push({ id: 'ten_dollars', name: '💰 Big Earner!', desc: 'Earned $10 total' });
                state.achievements.push('ten_dollars');
            }
            
            newAchievements.forEach(a => {
                setTimeout(() => {
                    showToast(`🏆 Achievement: ${a.name} — ${a.desc}`, 6000);
                    triggerCoinRain();
                }, 500);
            });
            
            if (newAchievements.length > 0) saveState();
        }

        function loadState() {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                try {
                    state = JSON.parse(saved);
                } catch (e) {
                    console.warn('Failed to parse state, resetting:', e);
                    state = getDefaultState();
                    state.tasks = JSON.parse(JSON.stringify(getConfiguredDailyTasks()));
                }
            } else {
                state.tasks = JSON.parse(JSON.stringify(getConfiguredDailyTasks()));
            }
            // Load weekly counters
            const weekNum = getWeekNumber();
            const savedWeek = localStorage.getItem(WEEK_KEY);
            if (savedWeek !== String(weekNum)) {
                // New week - reset weekly counters
                state.weeklyCounters = {};
                state.weeklyBonusesCompleted = [];
                localStorage.setItem(WEEK_KEY, String(weekNum));
            }
            if (!state.weeklyCounters) state.weeklyCounters = {};
            if (!state.weeklyBonusesCompleted) state.weeklyBonusesCompleted = [];
            if (state.dailyBonusCompleted === undefined) state.dailyBonusCompleted = null;
            if (state.totalEarned === undefined) state.totalEarned = 0;
            if (state.lastLoginDate === undefined) state.lastLoginDate = null;
            if (state.spinUsedToday === undefined) state.spinUsedToday = false;
            if (state.achievements === undefined) state.achievements = [];
            if (state.weeklyFeedbackCompleted === undefined) state.weeklyFeedbackCompleted = null;
            if (state.feedbackRating === undefined) state.feedbackRating = 0;
            if (state.feedbackHistory === undefined) state.feedbackHistory = [];
        }

        function saveState() {
            state.lastSaved = new Date().toISOString();
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
            // Also sync to cloud if authenticated
            saveToCloud();
        }
        
        // ========== CLOUD SYNC ==========
        let cloudSyncTimeout = null;
        let lastSyncError = null;
        
        async function saveToCloud() {
            if (!syncEnabled || !currentUser || !PROFILE_ID) return;
            
            // Debounce cloud saves to avoid excessive writes
            if (cloudSyncTimeout) clearTimeout(cloudSyncTimeout);
            cloudSyncTimeout = setTimeout(async () => {
                try {
                    await db.collection('userState').doc(PROFILE_ID).set({
                        ...state,
                        lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
                        updatedBy: currentUser.email || 'user-device'
                    }, { merge: true });
                    console.log('State synced to cloud');
                    // Clear error state on success
                    if (lastSyncError) {
                        lastSyncError = null;
                        showToast('☁️ Back online! Data synced.');
                    }
                } catch (err) {
                    console.error('Cloud sync failed:', err);
                    // Show error only once per session
                    if (!lastSyncError) {
                        lastSyncError = err;
                        showToast('📴 Offline - saving locally');
                    }
                }
            }, 2000); // Wait 2 seconds before syncing
        }
        
        async function loadFromCloud() {
            if (!syncEnabled || !currentUser || !PROFILE_ID) return;
            
            try {
                const doc = await db.collection('userState').doc(PROFILE_ID).get();
                if (doc.exists) {
                    const cloudState = doc.data();
                    let localState;
                    try {
                        localState = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
                    } catch (e) {
                        console.warn('Failed to parse local state for cloud sync:', e);
                        localState = {};
                    }
                    
                    // Compare timestamps - use whichever is newer
                    const cloudTime = cloudState.lastUpdated?.toDate?.() || new Date(0);
                    const localTime = new Date(localState.lastSaved || 0);
                    
                    if (cloudTime > localTime) {
                        // Cloud is newer - use cloud data
                        console.log('Loading newer state from cloud');
                        delete cloudState.lastUpdated;
                        delete cloudState.updatedBy;
                        state = { ...state, ...cloudState };
                        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
                        render();
                        showToast('📱 Synced from cloud!');
                    } else if (localTime > cloudTime && Object.keys(localState).length > 0) {
                        // Local is newer - push to cloud
                        console.log('Pushing newer local state to cloud');
                        saveToCloud();
                    }
                } else {
                    // No cloud data - push current local state
                    saveToCloud();
                }
            } catch (err) {
                console.error('Failed to load from cloud:', err);
                // Continue with localStorage
            }
            updateSyncStatus();
        }
        
        function updateSyncStatus() {
            const syncIcon = document.getElementById('syncIcon');
            const syncText = document.getElementById('syncText');
            const syncDetail = document.getElementById('syncDetail');
            
            if (!syncIcon) return; // Element not yet loaded
            
            if (currentUser && syncEnabled) {
                syncIcon.textContent = '✅';
                syncText.textContent = 'Cloud Sync Active';
                syncDetail.textContent = `Syncing as ${currentUser.email}`;
                syncIcon.style.color = 'var(--primary)';
            } else if (currentUser) {
                syncIcon.textContent = '☁️';
                syncText.textContent = 'Sign in for cloud sync';
                syncDetail.textContent = 'Your data is saved locally only';
            } else {
                syncIcon.textContent = '💾';
                syncText.textContent = 'Local Storage Only';
                syncDetail.textContent = 'Sign in to sync across devices';
            }
        }

        function checkNewDay() {
            const today = new Date().toDateString();
            const lastDate = localStorage.getItem(DATE_KEY);
            const configuredDailyTasks = JSON.parse(JSON.stringify(getConfiguredDailyTasks()));
            if (lastDate !== today) {
                state.tasks = configuredDailyTasks;
                localStorage.setItem(DATE_KEY, today);
                saveState();
            } else {
                // Sync tasks from config (handles add/edit/delete changes from admin) while preserving each task's completed state for the current day.
                const completedTaskIds = new Set((state.tasks || []).filter(t => t.completed).map(t => t.id));
                state.tasks = configuredDailyTasks.map(t => ({ ...t, completed: completedTaskIds.has(t.id) }));
                saveState();
            }
        }

        function updateGreeting() {
            const hour = new Date().getHours();
            let greeting;
            if (hour < 12) {
                greeting = "Good Morning, " + PROFILE_NAME + "! ☀️";
            } else if (hour < 17) {
                greeting = "Good Afternoon, " + PROFILE_NAME + "! 🌤️";
            } else {
                greeting = "Good Evening, " + PROFILE_NAME + "! 🌙";
            }
            document.getElementById('greeting').textContent = greeting;
            
            // Set daily quote
            document.getElementById('dailyQuote').textContent = '"' + getDailyQuote() + '"';
            document.getElementById('quoteSpanish').textContent = '"' + getDailyQuoteSpanish() + '"';
            
            // Show Spanish button for all profiles (learning bonus)
            document.getElementById('spanishBtn').style.display = 'inline-block';
            
            // Check if quote was already acknowledged today
            updateQuoteButtons();
            
            // Show onboarding tooltip for first-time users
            checkQuoteOnboarding();
        }
        
        // ========== QUOTE ONBOARDING ==========
        function getQuoteOnboardingKey() {
            return PROFILE_ID ? 'hr_quote_onboarded_' + PROFILE_ID : 'hr_quote_onboarded';
        }
        
        function checkQuoteOnboarding() {
            const onboarded = localStorage.getItem(getQuoteOnboardingKey());
            const state = getQuoteState();
            
            // Show onboarding if user hasn't been onboarded yet and hasn't acknowledged today
            if (!onboarded && !state.acknowledged) {
                document.getElementById('quoteOnboarding').style.display = 'block';
                
                // Add a gentle pulse animation to the button
                const ackBtn = document.getElementById('quoteAckBtn');
                ackBtn.style.animation = 'pulse 1.5s infinite';
            }
        }
        
        function hideQuoteOnboarding() {
            document.getElementById('quoteOnboarding').style.display = 'none';
            localStorage.setItem(getQuoteOnboardingKey(), 'true');
        }
        
        // ========== QUOTE INTERACTIONS ==========
        function showToast(message, duration = 4000) {
            const toast = document.createElement('div');
            toast.textContent = message;
            toast.style.cssText = `
                position: fixed;
                bottom: 100px;
                left: 50%;
                transform: translateX(-50%);
                background: var(--card-bg);
                color: var(--text);
                border: 2px solid var(--primary);
                padding: 16px 24px;
                border-radius: 16px;
                font-weight: 600;
                font-size: 16px;
                z-index: 9999;
                max-width: 90vw;
                text-align: center;
                animation: slideInUp 0.3s ease-out;
                box-shadow: 0 8px 30px rgba(0,0,0,0.15);
            `;
            document.body.appendChild(toast);
            
            setTimeout(() => {
                toast.style.opacity = '0';
                toast.style.transition = 'opacity 0.3s';
                setTimeout(() => toast.remove(), 300);
            }, duration);
        }
        
        function getQuoteKey() {
            const today = new Date().toDateString();
            return PROFILE_ID ? 'hr_quote_' + PROFILE_ID + '_' + today : 'hr_quote_' + today;
        }
        
        function getQuoteState() {
            const saved = localStorage.getItem(getQuoteKey());
            if (!saved) return { acknowledged: false, spanish: false };
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.warn('Failed to parse quote state:', e);
                return { acknowledged: false, spanish: false };
            }
        }
        
        function saveQuoteState(state) {
            localStorage.setItem(getQuoteKey(), JSON.stringify(state));
        }
        
        function updateQuoteButtons() {
            const state = getQuoteState();
            const ackBtn = document.getElementById('quoteAckBtn');
            const spanishBtn = document.getElementById('spanishBtn');
            
            if (state.acknowledged) {
                ackBtn.textContent = '✨ Done!';
                ackBtn.style.background = 'var(--primary)';
                ackBtn.style.color = 'white';
                ackBtn.style.cursor = 'default';
            }
            
            if (state.spanish) {
                spanishBtn.textContent = '🇪🇸 Done!';
                spanishBtn.style.background = '#f59e0b';
                spanishBtn.style.color = 'white';
                spanishBtn.style.cursor = 'default';
                document.getElementById('quoteSpanish').style.display = 'block';
            }
        }
        
        function acknowledgeQuote() {
            const quoteState = getQuoteState();
            if (quoteState.acknowledged) return;
            
            quoteState.acknowledged = true;
            saveQuoteState(quoteState);
            
            // Hide onboarding tooltip and mark as onboarded
            hideQuoteOnboarding();
            
            // Add 5 points to global state
            addPoints(5);
            saveState();
            
            updateQuoteButtons();
            render();
            
            // Show celebration with helpful message for first-timers
            const onboardedBefore = localStorage.getItem(getQuoteOnboardingKey() + '_shown');
            if (!onboardedBefore) {
                showToast('Great job! You read the quote! +5 pts ✨');
                localStorage.setItem(getQuoteOnboardingKey() + '_shown', 'true');
            } else {
                showToast('+5 pts for daily inspiration! ✨');
            }
            
            // Show Spanish onboarding after acknowledging English quote (only for Stu)
            if (PROFILE_ID === 'stu') {
                checkSpanishOnboarding();
            }
        }
        
        function checkSpanishOnboarding() {
            const spanishOnboarded = localStorage.getItem(getQuoteOnboardingKey() + '_spanish');
            const state = getQuoteState();
            
            // Show Spanish onboarding if not done yet and English is acknowledged but Spanish isn't
            if (!spanishOnboarded && state.acknowledged && !state.spanish) {
                const spanishOnboarding = document.getElementById('spanishOnboarding');
                if (spanishOnboarding) {
                    spanishOnboarding.style.display = 'block';
                    // Add pulse animation to Spanish button
                    const spanishBtn = document.getElementById('spanishBtn');
                    spanishBtn.style.animation = 'pulse 1.5s infinite';
                }
            }
        }
        
        function hideSpanishOnboarding() {
            const spanishOnboarding = document.getElementById('spanishOnboarding');
            if (spanishOnboarding) {
                spanishOnboarding.style.display = 'none';
            }
            localStorage.setItem(getQuoteOnboardingKey() + '_spanish', 'true');
        }
        
        function showSpanishQuote() {
            const quoteState = getQuoteState();
            if (quoteState.spanish) return;
            
            quoteState.spanish = true;
            saveQuoteState(quoteState);
            
            // Hide Spanish onboarding
            hideSpanishOnboarding();
            
            // Add 5 points to global state
            addPoints(5);
            saveState();
            
            updateQuoteButtons();
            render();
            
            // Show celebration
            showToast('+5 pts for Spanish! ¡Muy bien! 🇪🇸');
        }

        // ========== LEVELS ==========
        function getLevel(totalPoints) {
            if (totalPoints >= 100000) return { name: "🔥 Hall of Fame", color: "#ff4500", next: null, nextPts: null };
            if (totalPoints >= 50000) return { name: "🌟 Superstar", color: "#ff69b4", next: "🔥 Hall of Fame", nextPts: 100000 };
            if (totalPoints >= 25000) return { name: "👑 Legend", color: "#9400d3", next: "🌟 Superstar", nextPts: 50000 };
            if (totalPoints >= 10000) return { name: "💎 Diamond", color: "#00bfff", next: "👑 Legend", nextPts: 25000 };
            if (totalPoints >= 5000) return { name: "🏆 Champion", color: "#ffd700", next: "💎 Diamond", nextPts: 10000 };
            if (totalPoints >= 2500) return { name: "⭐ Expert", color: "#c0c0c0", next: "🏆 Champion", nextPts: 5000 };
            if (totalPoints >= 1000) return { name: "🌟 Pro", color: "#cd7f32", next: "⭐ Expert", nextPts: 2500 };
            if (totalPoints >= 500) return { name: "🌿 Regular", color: "#4ade80", next: "🌟 Pro", nextPts: 1000 };
            if (totalPoints >= 150) return { name: "🌱 Starter", color: "#86efac", next: "🌿 Regular", nextPts: 500 };
            return { name: "🥚 Beginner", color: "#58cc02", next: "🌱 Starter", nextPts: 150 };
        }

        function getPrevLevelPts(totalPoints) {
            if (totalPoints >= 100000) return 100000;
            if (totalPoints >= 50000) return 50000;
            if (totalPoints >= 25000) return 25000;
            if (totalPoints >= 10000) return 10000;
            if (totalPoints >= 5000) return 5000;
            if (totalPoints >= 2500) return 2500;
            if (totalPoints >= 1000) return 1000;
            if (totalPoints >= 500) return 500;
            if (totalPoints >= 100) return 100;
            return 0;
        }

        function getNearMissMessage(totalPoints) {
            const level = getLevel(totalPoints);
            if (!level.nextPts) return null;
            const remaining = level.nextPts - totalPoints;
            if (remaining <= 50) return `🔥 Only ${remaining} pts to ${level.next}!`;
            if (remaining <= 100) return `Almost there! ${remaining} pts to ${level.next}`;
            return null;
        }

        // ========== RENDER ==========
        function render() {
            const pts = Math.floor(state.balance);
            const dollars = (pts / 100).toFixed(2);
            document.getElementById('todayBalance').textContent = `${pts} pts`;
            document.getElementById('balanceDollars').textContent = `= $${dollars}`;
            document.getElementById('streakDays').textContent = state.streak;
            
            // Check streak recovery
            updateStreakRecoveryHint();
            
            // Level with progress bar
            const level = getLevel(state.totalEarned || 0);
            document.getElementById('levelBadge').textContent = level.name;
            
            // Detect level-up
            if (state._lastLevelName && state._lastLevelName !== level.name) {
                setTimeout(function() { showLevelUpCelebration(level); }, 300);
            }
            state._lastLevelName = level.name;
            
            // Calculate progress to next level
            if (level.nextPts) {
                const prevLevelPts = getPrevLevelPts(state.totalEarned || 0);
                const progressInLevel = (state.totalEarned || 0) - prevLevelPts;
                const levelRange = level.nextPts - prevLevelPts;
                const progressPct = Math.min(100, (progressInLevel / levelRange) * 100);
                const ptsToNext = level.nextPts - (state.totalEarned || 0);
                
                document.getElementById('levelProgressFill').style.width = `${progressPct}%`;
                document.getElementById('levelProgressText').textContent = `${ptsToNext} pts to ${level.next}`;
            } else {
                document.getElementById('levelProgressFill').style.width = '100%';
                document.getElementById('levelProgressText').textContent = 'Max level reached! 🌟';
            }
            
            // Daily progress
            const completed = state.tasks.filter(t => t.completed).length;
            const total = state.tasks.length;
            const pct = total > 0 ? (completed / total) * 100 : 0;
            document.getElementById('progressText').textContent = `${completed}/${total} tasks`;
            document.getElementById('progressBar').style.width = `${pct}%`;
            
            // Date
            const opts = { weekday: 'long', month: 'long', day: 'numeric' };
            document.getElementById('dateDisplay').textContent = new Date().toLocaleDateString('en-US', opts);

            // Tasks
            const container = document.getElementById('tasksContainer');
            container.innerHTML = '';
            
            let allDone = true;
            state.tasks.forEach(task => {
                if (!task.completed) allDone = false;
                
                const helpBtn = TASK_HELP[task.id] ? `<button class="task-help-btn" data-action="showTaskHelp" data-arg="${task.id}" title="How to get started">?</button>` : '';
                
                const div = document.createElement('div');
                div.className = 'task-row';
                div.innerHTML = `
                    <div class="task-content">
                        <div class="task-name" style="${task.completed ? 'text-decoration: line-through; opacity: 0.5;' : ''}">${escapeHtml(task.name)}${helpBtn}</div>
                        <div class="task-reward">+${task.value} pts</div>
                    </div>
                    <button class="task-check ${task.completed ? 'completed' : ''}" data-action="onTaskClick" data-arg="${task.id}">
                        ${task.completed ? '✓' : ''}
                    </button>
                `;
                container.appendChild(div);
            });

            // Weekly bonuses - always visible
            const bonusSection = document.getElementById('bonusSection');
            bonusSection.style.display = 'block';
            const bonusContainer = document.getElementById('bonusOptions');
            bonusContainer.innerHTML = ''; // Clear and rebuild
            
            const weeklyBonuses = getWeeklyBonuses();
            // Store globally for click handlers
            window.currentWeeklyBonuses = weeklyBonuses;
            
            weeklyBonuses.forEach((b, idx) => {
                // Handle tennis specially
                if (b.isTennis) {
                    const sessions = getTennisSessionsThisWeek();
                    const count = sessions.length;
                    const completed = count >= b.target;
                    
                    const row = document.createElement('div');
                    row.style.cssText = 'display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.15); padding: 14px 16px; border-radius: 20px; width: 100%;';
                    row.innerHTML = `
                        <div style="flex: 1; margin-right: 15px; text-align: left;">
                            <div style="font-weight: 700; font-size: 18px; ${completed ? 'text-decoration: line-through; opacity: 0.7;' : ''}">${escapeHtml(b.name)} <span style="font-weight: 600; font-size: 14px; opacity: 0.9;">${count}/${b.target} sessions</span></div>
                            <div style="display: inline-block; font-weight: 800; font-size: 14px; color: #a855f7; padding: 4px 10px; border-radius: 12px; background: rgba(255,255,255,0.9); margin-top: 4px;">${completed ? '✅ Done!' : `+${b.value} pts`}</div>
                        </div>
                        <button class="task-check ${completed ? 'completed' : ''}" style="background: ${completed ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.3)'}; border: 2px solid rgba(255,255,255,0.5);" data-action="openTennisModal" data-arg="${completed}">
                            ${completed ? '✓' : count > 0 ? count : '+'}
                        </button>
                    `;
                    bonusContainer.appendChild(row);
                } else {
                    const isCompleted = state.weeklyBonusesCompleted.includes(b.id);
                    const helpBtn = TASK_HELP[b.id] ? `<button class="task-help-btn" style="border-color: white; color: white;" data-action="showTaskHelp" data-arg="${b.id}" title="How to get started">?</button>` : '';
                    
                    const row = document.createElement('div');
                    row.style.cssText = 'display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.15); padding: 14px 16px; border-radius: 20px; width: 100%;';
                    row.innerHTML = `
                        <div style="flex: 1; margin-right: 15px; text-align: left;">
                            <div style="font-weight: 700; font-size: 18px; ${isCompleted ? 'text-decoration: line-through; opacity: 0.7;' : ''}">${escapeHtml(b.name)}${helpBtn}</div>
                            <div style="display: inline-block; font-weight: 800; font-size: 14px; color: #a855f7; padding: 4px 10px; border-radius: 12px; background: rgba(255,255,255,0.9); margin-top: 4px;">${isCompleted ? '✅ Done!' : `+${b.value} pts`}</div>
                        </div>
                        <button class="task-check ${isCompleted ? 'completed' : ''}" style="background: ${isCompleted ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.3)'}; border: 2px solid rgba(255,255,255,0.5);" data-action="handleWeeklyClick" data-arg="${idx}" data-arg2="${isCompleted}">
                            ${isCompleted ? '✓' : ''}
                        </button>
                    `;
                    bonusContainer.appendChild(row);
                }
            });

            // Daily bonus task
            const dailyBonus = getDailyBonus();
            const dailyBonusSection = document.getElementById('dailyBonusSection');
            if (dailyBonus) {
                dailyBonusSection.style.display = 'block';
                const dailyBonusCompleted = state.dailyBonusCompleted === getDayNumber();
                document.getElementById('dailyBonusName').textContent = dailyBonus.name;
                document.getElementById('dailyBonusReward').textContent = `+${dailyBonus.value} pts`;
                
                // Show help icon for daily bonus if it has help info
                const showDailyHelp = TASK_HELP[dailyBonus.id];
                document.getElementById('dailyBonusHelpBtn').innerHTML = showDailyHelp 
                    ? `<button class="task-help-btn" style="border-color: white; color: white;" data-action="showTaskHelp" data-arg="${dailyBonus.id}" title="How to get started">?</button>` 
                    : '';
                
                const dailyBtn = document.getElementById('dailyBonusBtn');
                if (dailyBonusCompleted) {
                    dailyBtn.innerHTML = '✓';
                    dailyBtn.style.background = 'rgba(255,255,255,0.9)';
                    dailyBtn.style.color = '#f97316';
                    dailyBtn.classList.add('completed');
                } else {
                    dailyBtn.innerHTML = '';
                    dailyBtn.style.background = 'rgba(255,255,255,0.3)';
                    dailyBtn.style.color = 'white';
                    dailyBtn.classList.remove('completed');
                }
            } else {
                dailyBonusSection.style.display = 'none';
            }

            // Survey unlock (if at least one task done)
            const tasksDone = state.tasks.filter(t => t.completed).length;
            document.getElementById('surveyInvite').style.display = tasksDone > 0 ? 'block' : 'none';
            
            // Show spin section if all tasks done and not used today
            const spinSection = document.getElementById('spinSection');
            if (allDone && !state.spinUsedToday) {
                spinSection.style.display = 'block';
                document.getElementById('multiplierHint').innerHTML = '🎉 All tasks done! Spin available above!';
            } else if (state.spinUsedToday) {
                spinSection.style.display = 'none';
                document.getElementById('multiplierHint').innerHTML = '✅ Spin used! Come back tomorrow!';
            } else {
                spinSection.style.display = 'none';
            }

            // All Done celebration — show once per day when all tasks completed
            const allDoneSection = document.getElementById('allDoneSection');
            const allDoneKey = 'allDoneCelebrated_' + new Date().toDateString();
            if (allDone && state.tasks.length > 0 && !sessionStorage.getItem(allDoneKey)) {
                sessionStorage.setItem(allDoneKey, '1');
                allDoneSection.style.display = 'block';
                triggerConfetti(50);
            } else if (!allDone) {
                allDoneSection.style.display = 'none';
            }
            
            // Show streak multiplier
            const mult = getStreakMultiplier();
            if (mult > 1) {
                document.getElementById('multiplierHint').innerHTML += ` <br>🔥 ${mult}x streak bonus active!`;
            }
        }

        // ========== ACTIONS ==========
        function onTaskClick(id) {
            const task = state.tasks.find(t => t.id === id);
            
            // If already completed, offer to undo
            if (task.completed) {
                showConfirm(
                    'Undo Task?',
                    `You'll lose ${task.value} pts for "${task.name}"`,
                    () => {
                        task.completed = false;
                        task.proof = null;
                        state.balance -= task.value;
                        state.totalEarned -= task.value;
                        saveState();
                        render();
                        showToast(`Undid "${task.name}" (-${task.value} pts)`);
                    },
                    { icon: '↩️', confirmText: 'Undo', danger: true }
                );
                return;
            }

            // Daily tasks (walk, crossword, wordle) - simple checkbox, no modal
            completeTaskDirectly(task);
        }
        
        function completeTaskDirectly(task) {
            task.completed = true;
            markTaskCompletedEver(task.id);
            
            const { pts, bonusMsg } = calculatePointsWithBonuses(task.value);
            addPoints(pts);
            
            checkStreak();
            checkAchievements();
            saveState();
            render();
            
            // Show bonus message if any
            if (bonusMsg) {
                triggerConfetti();
                setTimeout(() => showToast(`${bonusMsg} +${pts} pts!`, 5000), 100);
            }
        }

        function previewImage(input) {
            if (input.files && input.files[0]) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    document.getElementById('imgPreview').innerHTML = `<img src="${e.target.result}" style="width: 100%;" alt="Task photo preview" loading="lazy">`;
                }
                reader.readAsDataURL(input.files[0]);
            }
        }

        function confirmTask() {
            // Handle daily bonus separately
            if (state.currentTaskId === 'daily_bonus') {
                confirmDailyBonus();
                return;
            }
            
            // Handle weekly bonus separately
            if (state.currentTaskId === 'weekly_bonus') {
                confirmWeeklyBonus();
                return;
            }
            
            const task = state.tasks.find(t => t.id === state.currentTaskId);
            if (task) {
                task.completed = true;
                task.proof = document.getElementById('taskComment').value;
                markTaskCompletedEver(task.id);
                
                const { pts, bonusMsg, randomMult } = calculatePointsWithBonuses(task.value);
                addPoints(pts);
                
                checkStreak();
                checkAchievements();
                saveState();
                render();
                closeModal('taskModal');
                
                if (bonusMsg) {
                    setTimeout(() => showToast(`+${pts} pts! ${bonusMsg}`, 5000), 300);
                }
                
                if (randomMult > 1) {
                    triggerCoinRain();
                } else {
                    triggerConfetti();
                }
            }
        }

        function completeDailyBonus() {
            const dayNum = getDayNumber();
            if (state.dailyBonusCompleted !== dayNum) {
                const bonus = getDailyBonus();
                if (!bonus) return;
                // Open task modal for photo/comment submission
                state.currentTaskId = 'daily_bonus';
                state.currentDailyBonus = bonus;
                document.getElementById('modalTaskTitle').textContent = bonus.name;
                
                // Configure modal based on task type
                const photoSection = document.getElementById('photoSection');
                const commentLabel = document.getElementById('commentLabel');
                const commentInput = document.getElementById('taskComment');
                
                if (bonus.needsComment && bonus.commentPrompt) {
                    // Tasks with specific comment prompts (no photo)
                    photoSection.style.display = 'none';
                    commentLabel.textContent = '💬 ' + bonus.commentPrompt;
                    commentInput.placeholder = bonus.commentPrompt;
                } else if (bonus.needsPhoto) {
                    // Tasks where photo is the proof
                    photoSection.style.display = 'block';
                    commentLabel.textContent = '💬 Comment (Optional)';
                    commentInput.placeholder = 'Quick note...';
                } else {
                    // Simple checkbox tasks - no modal needed, complete directly
                    markTaskCompletedEver(bonus.id);
                    state.dailyBonusCompleted = dayNum;
                    addPoints(bonus.value);
                    
                    if (!state.dailyBonusComments) state.dailyBonusComments = [];
                    state.dailyBonusComments.push({
                        taskId: bonus.id,
                        taskName: bonus.name,
                        comment: '',
                        date: new Date().toISOString(),
                        dayNum: dayNum
                    });
                    
                    checkStreak();
                    saveState();
                    render();
                    triggerConfetti();
                    return;
                }
                
                commentInput.value = '';
                document.getElementById('imgPreview').innerHTML = '';
                document.getElementById('taskPhoto').value = '';
                // Show device-specific photo tip
                var photoTip = document.getElementById('photoTip');
                var uploadBtn = document.getElementById('photoUploadBtn');
                var photoInput = document.getElementById('taskPhoto');
                if (photoTip && photoSection.style.display === 'block') {
                    var ua = navigator.userAgent;
                    var isIPhone = /iPhone|iPad|iPod/i.test(ua);
                    var isAndroid = /Android/i.test(ua);
                    if (isIPhone) {
                        photoInput.removeAttribute('capture');
                        uploadBtn.firstChild.textContent = '📷 Take Photo or Choose from Library';
                        photoTip.style.display = 'block';
                        photoTip.style.background = '#f0fdf4';
                        photoTip.style.color = '#166534';
                        photoTip.innerHTML = '💡 Tap the button above. You can <strong>take a new photo</strong> with your camera or <strong>pick one</strong> from your photo library.';
                    } else if (isAndroid) {
                        photoInput.setAttribute('capture', 'environment');
                        uploadBtn.firstChild.textContent = '📷 Take Photo or Choose File';
                        photoTip.style.display = 'block';
                        photoTip.style.background = '#f0fdf4';
                        photoTip.style.color = '#166534';
                        photoTip.innerHTML = '💡 Tap the button above. Your camera will open, or you can pick a photo from your gallery.';
                    } else {
                        photoInput.removeAttribute('capture');
                        uploadBtn.firstChild.textContent = '📷 Choose Photo from Files';
                        photoTip.style.display = 'block';
                        photoTip.style.background = '#fffbeb';
                        photoTip.style.color = '#92400e';
                        photoTip.innerHTML = '💡 <strong>On a computer?</strong> Take the photo on your phone, then text or email it to yourself. Save it to your computer, then click the button above to upload it.';
                    }
                } else if (photoTip) {
                    photoTip.style.display = 'none';
                }
                openModal('taskModal');
            }
        }

        function confirmDailyBonus() {
            const dayNum = getDayNumber();
            const bonus = state.currentDailyBonus;
            const comment = document.getElementById('taskComment').value.trim();
            
            markTaskCompletedEver(bonus.id);
            
            // Store the daily bonus comment
            if (!state.dailyBonusComments) state.dailyBonusComments = [];
            state.dailyBonusComments.push({
                taskId: bonus.id,
                taskName: bonus.name,
                comment: comment,
                date: new Date().toISOString(),
                dayNum: dayNum
            });
            
            state.dailyBonusCompleted = dayNum;
            addPoints(bonus.value);
            checkStreak();
            saveState();
            closeModal('taskModal');
            render();
            triggerConfetti();
        }
        
        function handleDailyBonusClick() {
            const dayNum = getDayNumber();
            if (state.dailyBonusCompleted === dayNum) {
                // Already completed - undo it
                undoDailyBonus();
            } else {
                // Not completed - open modal to complete
                completeDailyBonus();
            }
        }
        
        function undoDailyBonus() {
            const bonus = getDailyBonus();
            showConfirm(
                'Undo Bonus?',
                `You'll lose ${bonus.value} pts for "${bonus.name}"`,
                () => {
                    state.dailyBonusCompleted = null;
                    state.balance -= bonus.value;
                    state.totalEarned -= bonus.value;
                    saveState();
                    render();
                    showToast(`Undid "${bonus.name}" (-${bonus.value} pts)`);
                },
                { icon: '↩️', confirmText: 'Undo', danger: true }
            );
        }

        function addBonus(bonus) {
            const exists = state.tasks.find(t => t.id === bonus.id);
            if (!exists) {
                state.tasks.push({ ...bonus, completed: false });
                saveState();
                render();
                document.getElementById('tasksContainer').lastElementChild.scrollIntoView({ behavior: 'smooth' });
            }
        }

        function completeWeeklyBonus(bonus) {
            if (!state.weeklyBonusesCompleted.includes(bonus.id)) {
                // Open task modal for this weekly bonus
                state.currentTaskId = 'weekly_bonus';
                state.currentWeeklyBonus = bonus;
                document.getElementById('modalTaskTitle').textContent = bonus.name;
                
                // Update the comment placeholder if there's a custom prompt
                const commentInput = document.getElementById('taskComment');
                commentInput.placeholder = bonus.commentPrompt || 'Quick note...';
                commentInput.value = '';
                
                document.getElementById('imgPreview').innerHTML = '';
                document.getElementById('taskPhoto').value = '';
                openModal('taskModal');
            }
        }
        
        function confirmWeeklyBonus() {
            const bonus = state.currentWeeklyBonus;
            const comment = document.getElementById('taskComment').value.trim();
            
            markTaskCompletedEver(bonus.id);
            
            // Store the comment with task info
            if (!state.weeklyBonusComments) state.weeklyBonusComments = [];
            state.weeklyBonusComments.push({
                taskId: bonus.id,
                taskName: bonus.name,
                comment: comment,
                date: new Date().toISOString(),
                week: getWeekNumber()
            });
            
            state.weeklyBonusesCompleted.push(bonus.id);
            addPoints(bonus.value);
            saveState();
            closeModal('taskModal');
            render();
            triggerConfetti();
        }

        // ========== TENNIS FUNCTIONS ==========
        function getTennisSessionsThisWeek() {
            const weekNum = getWeekNumber();
            if (!state.tennisSessions) return [];
            return state.tennisSessions.filter(s => s.week === weekNum);
        }
        
        function openTennisModal(isCompleted) {
            if (isCompleted) {
                // Allow viewing/undoing sessions
                const sessions = getTennisSessionsThisWeek();
                if (sessions.length > 0) {
                    const sessionCount = sessions.length;
                    const lastSession = sessions[sessions.length - 1];
                    showConfirm(
                        'Undo Tennis Session?',
                        `You have ${sessionCount} session(s) this week. Undo last session at ${lastSession.park}?`,
                        () => {
                            undoLastTennisSession();
                            showToast('Tennis session undone');
                        },
                        { icon: '🎾', confirmText: 'Undo Last', danger: true }
                    );
                }
                return;
            }
            
            // Populate date dropdown with last 7 days
            const dateSelect = document.getElementById('tennisDate');
            dateSelect.innerHTML = '<option value="">Select a day...</option>';
            
            const today = new Date();
            
            // Show last 7 days (today and 6 days before)
            for (let i = 6; i >= 0; i--) {
                const date = new Date(today);
                date.setDate(today.getDate() - i);
                const dayName = date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
                const dateValue = date.toISOString().split('T')[0];
                const isToday = i === 0 ? ' (Today)' : '';
                dateSelect.innerHTML += `<option value="${dateValue}">${dayName}${isToday}</option>`;
            }
            
            // Reset park selection
            document.getElementById('tennisPark').value = '';
            
            // Show progress
            const sessions = getTennisSessionsThisWeek();
            document.getElementById('tennisProgress').textContent = `${sessions.length}/3 sessions logged this week`;
            
            openModal('tennisModal');
        }
        
        function submitTennisSession() {
            const date = document.getElementById('tennisDate').value;
            const park = document.getElementById('tennisPark').value;
            
            if (!date) {
                showToast('⚠️ Please select when you played');
                return;
            }
            if (!park) {
                showToast('⚠️ Please select where you played');
                return;
            }
            
            const sessions = getTennisSessionsThisWeek();
            if (sessions.length >= 3) {
                showToast('You\'ve already logged 3 sessions this week');
                closeModal('tennisModal');
                return;
            }
            
            // Check if this date was already logged
            const dateStr = new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
            if (sessions.some(s => s.date === dateStr)) {
                showToast('You\'ve already logged a session for this day');
                return;
            }
            
            // Add session
            if (!state.tennisSessions) state.tennisSessions = [];
            state.tennisSessions.push({
                date: dateStr,
                park: park,
                week: getWeekNumber(),
                timestamp: new Date().toISOString()
            });
            
            // Check if 3 sessions reached
            const newCount = getTennisSessionsThisWeek().length;
            if (newCount >= 3) {
                addPoints(TENNIS_WEEKLY.value);
                closeModal('tennisModal');
                saveState();
                render();
                triggerConfetti();
                showToast(`Great job! 🎾 3 sessions this week! +${TENNIS_WEEKLY.value} pts`, 5000);
            } else {
                closeModal('tennisModal');
                saveState();
                render();
                showToast(`Session logged! ${newCount}/3 this week`);
            }
        }
        
        function undoLastTennisSession() {
            const sessions = getTennisSessionsThisWeek();
            if (sessions.length > 0) {
                const wasCompleted = sessions.length >= 3;
                
                // Remove the last session from this week
                const lastSession = sessions[sessions.length - 1];
                state.tennisSessions = state.tennisSessions.filter(s => s.timestamp !== lastSession.timestamp);
                
                // If was completed, deduct points
                if (wasCompleted) {
                    state.balance -= TENNIS_WEEKLY.value;
                    state.totalEarned -= TENNIS_WEEKLY.value;
                }
                
                saveState();
                render();
            }
        }

        function handleWeeklyClick(idx, isCompleted) {
            const bonus = window.currentWeeklyBonuses[idx];
            if (isCompleted) {
                undoWeeklyBonus(bonus);
            } else {
                completeWeeklyBonus(bonus);
            }
        }

        function undoWeeklyBonus(bonus) {
            showConfirm(
                'Undo Weekly Bonus?',
                `You'll lose ${bonus.value} pts for "${bonus.name}"`,
                () => {
                    state.weeklyBonusesCompleted = state.weeklyBonusesCompleted.filter(id => id !== bonus.id);
                    state.balance -= bonus.value;
                    state.totalEarned -= bonus.value;
                    saveState();
                    render();
                    showToast(`Undid "${bonus.name}" (-${bonus.value} pts)`);
                },
                { icon: '↩️', confirmText: 'Undo', danger: true }
            );
        }

        function checkStreak() {
            const today = new Date().toDateString();
            if (state.lastStreakDate !== today) {
                const prevStreak = state.streak;
                state.streak++;
                state.lastStreakDate = today;
                
                // Check for milestone celebrations
                if ([7, 14, 30].includes(state.streak) && prevStreak < state.streak) {
                    setTimeout(function() { showStreakMilestoneCelebration(state.streak); }, 600);
                }
            }
        }

        function isStreakAtRisk() {
            // Check if yesterday was missed (no activity) and streak > 0
            if (state.streak === 0) return false;
            
            const today = new Date();
            const lastActive = state.lastStreakDate ? new Date(state.lastStreakDate) : null;
            
            if (!lastActive) return false;
            
            // Calculate days since last activity
            const diffTime = today - lastActive;
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            
            // At risk if more than 1 day has passed
            return diffDays >= 1 && !state.streakRecoveredToday;
        }

        function checkStreakRecovery() {
            if (isStreakAtRisk()) {
                openModal('streakRecoveryModal');
            }
        }

        function confirmStreakRecovery() {
            const rawWho = document.getElementById('streakRecoveryWho').value;
            const who = sanitizeInput(rawWho, 50);
            
            if (who.length < 2) {
                showToast('⚠️ Please enter who you called');
                return;
            }
            
            // Restore streak and mark as recovered today
            state.streakRecoveredToday = new Date().toDateString();
            state.lastStreakDate = new Date().toDateString();
            
            // Store recovery log
            if (!state.streakRecoveries) state.streakRecoveries = [];
            state.streakRecoveries.push({
                date: new Date().toISOString(),
                who: escapeHtml(who),
                streakSaved: state.streak
            });
            
            saveState();
            closeModal('streakRecoveryModal');
            document.getElementById('streakRecoveryHint').style.display = 'none';
            
            triggerConfetti();
            showToast(`🔥 Streak saved! Great job calling ${who}!`, 5000);
            render();
        }

        function updateStreakRecoveryHint() {
            const hint = document.getElementById('streakRecoveryHint');
            if (isStreakAtRisk()) {
                hint.style.display = 'block';
            } else {
                hint.style.display = 'none';
            }
        }

        async function submitProposal() {
            const rawName = document.getElementById('propName').value;
            const rawReason = document.getElementById('propReason').value;
            
            // Sanitize and validate inputs
            const name = sanitizeInput(rawName, 100);
            const reason = sanitizeInput(rawReason, 500);
            
            if (!isValidTaskName(name)) {
                showToast('⚠️ Please enter a valid task name (2-100 characters)');
                return;
            }
            
            const proposal = {
                taskName: escapeHtml(name),
                reason: escapeHtml(reason),
                profileId: PROFILE_ID,
                profileName: PROFILE_NAME,
                submittedAt: new Date().toISOString(),
                status: 'pending'
            };
            
            // Save to localStorage first
            let proposals;
            try {
                proposals = JSON.parse(localStorage.getItem('hr_proposals') || '[]');
            } catch (e) {
                console.warn('Failed to parse proposals:', e);
                proposals = [];
            }
            proposals.push(proposal);
            localStorage.setItem('hr_proposals', JSON.stringify(proposals));
            
            // Try to save to Firestore
            try {
                await db.collection('taskProposals').add({
                    ...proposal,
                    submittedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    submittedBy: currentUser?.email || 'anonymous'
                });
                showToast('✅ Task suggestion saved!');
            } catch (err) {
                console.error('Failed to save proposal to cloud:', err);
                showToast('💾 Suggestion saved locally');
            }
            
            document.getElementById('propName').value = '';
            document.getElementById('propReason').value = '';
            closeModal('settingsModal');
        }

        // ========== REPORT TASK ==========
        let reportingTask = null;
        
        function reportTask(type, idx) {
            event.stopPropagation(); // Don't trigger the task click
            
            if (type === 'daily') {
                const dailyBonus = getDailyBonus();
                reportingTask = { type: 'daily', name: dailyBonus.name, id: dailyBonus.id };
            } else if (type === 'weekly') {
                const weeklyBonuses = getWeeklyBonuses();
                const task = weeklyBonuses[idx];
                reportingTask = { type: 'weekly', name: task.name, id: task.id };
            }
            
            document.getElementById('reportTaskName').textContent = `"${reportingTask.name}"`;
            document.getElementById('reportReason').value = '';
            document.getElementById('reportComment').value = '';
            openModal('reportModal');
        }
        
        function submitReport() {
            const reason = document.getElementById('reportReason').value;
            if (!reason) {
                showToast('⚠️ Please select a reason');
                return;
            }
            
            const comment = document.getElementById('reportComment').value;
            
            // Store report in localStorage for manager review
            let reports;
            try {
                reports = JSON.parse(localStorage.getItem(REPORTS_KEY) || '[]');
            } catch (e) {
                console.warn('Failed to parse reports:', e);
                reports = [];
            }
            reports.push({
                date: new Date().toISOString(),
                taskType: reportingTask.type,
                taskName: reportingTask.name,
                taskId: reportingTask.id,
                reason: reason,
                comment: comment
            });
            localStorage.setItem(REPORTS_KEY, JSON.stringify(reports));
            
            showToast('Thanks for the feedback! We\'ll review this task.');
            closeModal('reportModal');
        }

        // ========== SETTINGS ==========
        function openSettings() {
            const pts = Math.floor(state.balance);
            const dollars = (pts / 100).toFixed(2);
            document.getElementById('settingsBalance').textContent = `${pts} pts`;
            document.getElementById('settingsDollars').textContent = `= $${dollars}`;
            openModal('settingsModal');
        }

        function requestPayout() {
            const pts = Math.floor(state.balance);
            const dollars = (pts / 100).toFixed(2);
            
            // Update modal content
            document.getElementById('cashoutPoints').textContent = pts + ' pts';
            document.getElementById('cashoutDollars').textContent = '= $' + dollars;
            
            // Update button state
            const btn = document.getElementById('cashoutBtn');
            if (pts <= 0) {
                btn.textContent = '🔒 No Balance Yet';
                btn.disabled = true;
                btn.style.opacity = '0.5';
                btn.style.cursor = 'not-allowed';
            } else {
                btn.textContent = '💸 Request $' + dollars + ' Payout';
                btn.disabled = false;
                btn.style.opacity = '1';
                btn.style.cursor = 'pointer';
            }
            
            openModal('cashoutModal');
        }
        
        async function confirmCashout() {
            const cashoutBtn = document.getElementById('cashoutBtn');
            
            // Prevent double-taps
            if (cashoutBtn.disabled) return;
            
            const pts = Math.floor(state.balance);
            const dollars = (pts / 100).toFixed(2);
            
            if (pts <= 0) return;
            
            // Show loading state immediately
            const originalText = cashoutBtn.textContent;
            cashoutBtn.textContent = '⏳ Processing...';
            cashoutBtn.disabled = true;
            cashoutBtn.style.opacity = '0.7';
            
            const profileId = PROFILE_ID || 'stu';
            const requestId = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
            
            // Deduct balance immediately to prevent double-cashouts
            state.balance = Math.max(0, state.balance - pts);
            saveState(state);
            updateBalanceDisplay();
            
            // Save to Firestore for cross-device sync
            try {
                await db.collection('payoutRequests').doc(requestId).set({
                    id: requestId,
                    profileId: profileId,
                    profileName: PROFILE_NAME,
                    amount: parseFloat(dollars),
                    points: pts,
                    status: 'pending',
                    requestedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            } catch (err) {
                console.error('Error saving payout request to Firestore:', err);
                // Fallback to localStorage
                const suffix = (PROFILE_ID && !IS_LEGACY_PROFILE) ? '_' + PROFILE_ID : '';
                let requests;
                try {
                    requests = JSON.parse(localStorage.getItem('hr_payout_requests' + suffix) || '[]');
                } catch (e) {
                    console.warn('Failed to parse payout requests:', e);
                    requests = [];
                }
                requests.push({
                    id: requestId,
                    amount: parseFloat(dollars),
                    points: pts,
                    status: 'pending',
                    requestedAt: new Date().toISOString()
                });
                localStorage.setItem('hr_payout_requests' + suffix, JSON.stringify(requests));
            }
            
            // Show success state in modal
            const modalContent = document.querySelector('#cashoutModal .modal-box');
            
            // Determine expected timing
            const now = new Date();
            const hour = now.getHours();
            const day = now.getDay(); // 0 = Sunday, 6 = Saturday
            const isWeekend = day === 0 || day === 6;
            const isAfter3PM = hour >= 15;
            
            let timingMessage = '';
            if (isWeekend || isAfter3PM) {
                timingMessage = '📅 Expected: <strong>Next business day</strong>';
            } else {
                timingMessage = '⚡ Expected: <strong>Today</strong> (within a few hours)';
            }
            
            modalContent.innerHTML = `
                <div style="text-align: center; padding: 20px;">
                    <div style="font-size: 60px; margin-bottom: 15px;">🎉</div>
                    <h2 style="margin-bottom: 10px; color: var(--primary);">Payout Requested!</h2>
                    <p style="color: var(--text-light); margin-bottom: 25px;">Your request has been submitted</p>
                    
                    <div style="background: linear-gradient(135deg, #3d8a02 0%, #2d6e01 100%); border-radius: 16px; padding: 25px; color: white; margin-bottom: 25px;">
                        <div style="font-size: 14px; opacity: 0.9;">Amount Requested</div>
                        <div style="font-size: 36px; font-weight: 800;">$${dollars}</div>
                        <div style="font-size: 14px; opacity: 0.9; margin-top: 5px;">(${pts} pts)</div>
                    </div>
                    
                    <div style="background: #e0f2fe; border-radius: 12px; padding: 15px; margin-bottom: 15px;">
                        <div style="color: #0369a1; font-size: 14px;">
                            ${timingMessage}
                        </div>
                    </div>
                    
                    <div style="background: #f0fdf4; border-radius: 12px; padding: 15px; margin-bottom: 25px;">
                        <div style="color: #166534; font-size: 14px;">
                            💰 Payment from <strong>MyDailyWin</strong> via Zelle<br>
                            <span style="font-size: 14px; opacity: 0.8;">You'll get a notification when it's sent!</span>
                        </div>
                    </div>
                    
                    <button data-action="closeCashoutAndReload" class="btn btn-primary" style="width: 100%; padding: 14px;">
                        Got it!
                    </button>
                </div>
            `;
        }

        function shareApp() {
            const shareUrl = 'https://mydailywin.web.app';
            const shareText = 'Check out MyDailyWin - a fun app that pays you to build good habits! 🏆';
            
            if (navigator.share) {
                navigator.share({
                    title: 'MyDailyWin',
                    text: shareText,
                    url: shareUrl
                }).catch(() => {});
            } else {
                // Fallback: copy to clipboard
                navigator.clipboard.writeText(shareUrl).then(() => {
                    showToast('Link copied to clipboard! 📋');
                }).catch(() => {
                    showToast('Share this link: ' + shareUrl, 6000);
                });
            }
        }

        function shareProgress() {
            const tasksCompleted = state.tasks.filter(t => t.completed).length;
            const streak = state.streak;
            const pts = Math.floor(state.balance);
            
            const shareText = `🏆 MyDailyWin Update!\n\n` +
                `✅ ${tasksCompleted} tasks completed today\n` +
                `🔥 ${streak} day streak\n` +
                `💰 ${pts} pts earned\n\n` +
                `Build better habits at mydailywin.web.app`;
            
            if (navigator.share) {
                navigator.share({
                    title: 'My MyDailyWin Progress',
                    text: shareText
                }).catch(() => {});
            } else {
                navigator.clipboard.writeText(shareText).then(() => {
                    showToast('Progress copied to clipboard! 📋');
                }).catch(() => {
                    showToast(shareText, 6000);
                });
            }
        }

        function contactDeveloper() {
            const subject = encodeURIComponent('MyDailyWin Feedback');
            const body = encodeURIComponent('Hi!\n\nI have some feedback about MyDailyWin:\n\n');
            window.location.href = `mailto:sharipaltrowitz@gmail.com?subject=${subject}&body=${body}`;
        }

        // ========== UI UTILS ==========
        function toggleTheme() {
            state.mode = state.mode === 'light' ? 'dark' : 'light';
            localStorage.setItem('theme', state.mode);
            applyTheme();
        }

        function applyTheme() {
            const btn = document.getElementById('themeIcon');
            if (state.mode === 'dark') {
                document.body.classList.add('dark-mode');
                btn.textContent = '☀️';
            } else {
                document.body.classList.remove('dark-mode');
                btn.textContent = '🌙';
            }
        }

        function openModal(id) {
            if (id === 'levelsModal') {
                populateLevelsTable();
            }
            if (id === 'settingsModal') {
                updateSyncStatus();
                // Update balance display in settings
                document.getElementById('settingsBalance').textContent = (state.balance || 0) + ' pts';
                document.getElementById('settingsDollars').textContent = '= $' + ((state.balance || 0) / 100).toFixed(2);
            }
            const modal = document.getElementById(id);
            if (!modal) {
                console.warn(`Modal not found: ${id}`);
                return;
            }
            modal.classList.add('active');
        }
        
        function populateLevelsTable() {
            const allLevels = [
                { name: "🥚 Beginner", pts: 0, color: "#58cc02" },
                { name: "🌱 Starter", pts: 150, color: "#86efac" },
                { name: "🌿 Regular", pts: 500, color: "#4ade80" },
                { name: "🌟 Pro", pts: 1000, color: "#cd7f32" },
                { name: "⭐ Expert", pts: 2500, color: "#c0c0c0" },
                { name: "🏆 Champion", pts: 5000, color: "#ffd700" },
                { name: "💎 Diamond", pts: 10000, color: "#00bfff" },
                { name: "👑 Legend", pts: 25000, color: "#9400d3" },
                { name: "🌟 Superstar", pts: 50000, color: "#ff69b4" },
                { name: "🔥 Hall of Fame", pts: 100000, color: "#ff4500" }
            ];
            const currentLevel = getLevel(state.totalEarned);
            const container = document.getElementById('levelsTable');
            container.innerHTML = allLevels.map(lvl => {
                const isCurrent = currentLevel.name === lvl.name;
                const isUnlocked = state.totalEarned >= lvl.pts;
                return `
                    <div style="display: flex; align-items: center; padding: 12px 16px; border-radius: 12px; 
                        background: ${isCurrent ? 'linear-gradient(135deg, ' + lvl.color + '22, ' + lvl.color + '44)' : 'var(--bg)'};
                        border: 2px solid ${isCurrent ? lvl.color : 'transparent'};
                        opacity: ${isUnlocked ? '1' : '0.5'};">
                        <div style="flex: 1;">
                            <div style="font-weight: ${isCurrent ? '700' : '600'}; color: ${isUnlocked ? lvl.color : 'var(--text-light)'};">
                                ${lvl.name} ${isCurrent ? '← You' : ''}
                            </div>
                            <div style="font-size: 14px; color: var(--text-light);">
                                ${lvl.pts.toLocaleString()} pts ($${(lvl.pts/100).toFixed(2)})
                            </div>
                        </div>
                        ${isUnlocked && !isCurrent ? '<span style="color: #22c55e;">✓</span>' : ''}
                        ${!isUnlocked ? '<span style="color: var(--text-light);">🔒</span>' : ''}
                    </div>
                `;
            }).join('');
        }
        
        function closeModal(id) {
            const modal = document.getElementById(id);
            if (!modal) {
                console.warn(`Modal not found: ${id}`);
                return;
            }
            modal.classList.remove('active');
        }
        
        // ========== CUSTOM CONFIRMATION MODAL ==========
        let confirmCallback = null;
        
        function showConfirm(title, message, onConfirm, options = {}) {
            document.getElementById('confirmTitle').textContent = title;
            document.getElementById('confirmMessage').textContent = message;
            document.getElementById('confirmIcon').textContent = options.icon || '⚠️';
            
            const confirmBtn = document.getElementById('confirmBtn');
            confirmBtn.textContent = options.confirmText || 'Confirm';
            confirmBtn.style.background = options.danger ? '#ef4444' : 'var(--primary)';
            
            confirmCallback = onConfirm;
            openModal('confirmModal');
        }
        
        function handleConfirm(confirmed) {
            closeModal('confirmModal');
            if (confirmed && confirmCallback) {
                confirmCallback();
            }
            confirmCallback = null;
        }

        function triggerConfetti(count) {
            if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
            count = count || 40;
            const emojis = ['🎉', '⭐', '✨', '🎊'];
            for (let i = 0; i < count; i++) {
                setTimeout(() => {
                    const el = document.createElement('div');
                    el.innerText = emojis[Math.floor(Math.random() * emojis.length)];
                    const startX = 20 + Math.random() * 60;
                    const duration = 1200 + Math.random() * 800;
                    const size = 16 + Math.random() * 18;
                    el.style.cssText = 'position:fixed;left:' + startX + 'vw;top:-50px;font-size:' + size + 'px;pointer-events:none;z-index:10000;transform:rotate(' + (Math.random() * 360) + 'deg);animation:confettiFall ' + duration + 'ms ease-in forwards;';
                    document.body.appendChild(el);
                    setTimeout(function() { el.remove(); }, duration);
                }, i * 40);
            }
        }

        function showLevelUpCelebration(level) {
            document.getElementById('levelUpBadge').textContent = level.name;
            document.getElementById('levelUpBadge').style.background = level.color;
            var messages = [
                'You\'re making incredible progress! Keep it up!',
                'Amazing work! Your consistency is paying off!',
                'Look at you go! Every point brings you closer to greatness!',
                'Your dedication is inspiring! Onward and upward!'
            ];
            document.getElementById('levelUpMessage').textContent = messages[Math.floor(Math.random() * messages.length)];
            openModal('levelUpModal');
            triggerConfetti(50);
        }

        function showStreakMilestoneCelebration(streakCount) {
            var config;
            if (streakCount >= 30) {
                config = { icon: '🏆', title: 'Monthly Champion!', message: '30 days of pure dedication! You\'re a legend!' };
            } else if (streakCount >= 14) {
                config = { icon: '💪', title: 'Two Week Streak!', message: '14 days strong! Nothing can stop you now!' };
            } else if (streakCount >= 7) {
                config = { icon: '🔥', title: 'One Week Streak!', message: '7 days in a row! You\'re building a real habit!' };
            } else {
                return;
            }
            document.getElementById('streakMilestoneIcon').textContent = config.icon;
            document.getElementById('streakMilestoneTitle').textContent = config.title;
            document.getElementById('streakMilestoneCount').textContent = '🔥 ' + streakCount + ' Days';
            document.getElementById('streakMilestoneMessage').textContent = config.message;
            openModal('streakMilestoneModal');
            triggerConfetti(45);
        }

        // ========== PWA INSTALL PROMPT ==========
        let deferredInstallPrompt = null;

        window.addEventListener('beforeinstallprompt', function(e) {
            e.preventDefault();
            deferredInstallPrompt = e;
            // Only show install banner on mobile/tablet — not desktop
            var isMobile = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
            if (isMobile && !localStorage.getItem('pwaInstallDismissed')) {
                document.getElementById('pwaInstallBanner').style.display = 'block';
            }
        });

        window.addEventListener('appinstalled', function() {
            document.getElementById('pwaInstallBanner').style.display = 'none';
            deferredInstallPrompt = null;
            awardInstallBonus();
        });

        function awardInstallBonus() {
            var INSTALL_BONUS_KEY = PROFILE_ID ? 'hr_install_bonus_' + PROFILE_ID : 'hr_install_bonus';
            if (localStorage.getItem(INSTALL_BONUS_KEY)) return;
            localStorage.setItem(INSTALL_BONUS_KEY, '1');
            state.balance = (state.balance || 0) + 100;
            state.totalEarned = (state.totalEarned || 0) + 100;
            saveState();
            render();
            showToast('🎉 +100 pts for adding to Home Screen!');
        }

        // Detect standalone mode (iOS Add to Home Screen)
        if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
            var INSTALL_BONUS_KEY = PROFILE_ID ? 'hr_install_bonus_' + PROFILE_ID : 'hr_install_bonus';
            if (!localStorage.getItem(INSTALL_BONUS_KEY)) {
                setTimeout(function() { awardInstallBonus(); }, 2000);
            }
        }

        function triggerInstallPrompt() {
            if (deferredInstallPrompt) {
                deferredInstallPrompt.prompt();
                deferredInstallPrompt.userChoice.then(function(result) {
                    document.getElementById('pwaInstallBanner').style.display = 'none';
                    deferredInstallPrompt = null;
                });
            }
        }

        function dismissInstallBanner() {
            document.getElementById('pwaInstallBanner').style.display = 'none';
            localStorage.setItem('pwaInstallDismissed', '1');
        }

        // ========== ESCAPE KEY HANDLER FOR MODALS ==========
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                const activeModals = document.querySelectorAll('.modal.active');
                if (activeModals.length > 0) {
                    const topModal = activeModals[activeModals.length - 1];
                    closeModal(topModal.id);
                }
            }
        });

        init();

// ========== EVENT DELEGATION (CSP-compliant, replaces inline handlers) ==========
document.addEventListener('click', function(e) {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const action = el.getAttribute('data-action');
    const arg = el.getAttribute('data-arg');

    switch(action) {
        case 'openModal': openModal(arg); break;
        case 'closeModal': closeModal(arg); break;
        case 'toggleTheme': toggleTheme(); break;
        case 'acknowledgeQuote': acknowledgeQuote(); break;
        case 'showSpanishQuote': showSpanishQuote(); break;
        case 'checkStreakRecovery': checkStreakRecovery(); break;
        case 'requestPayout': requestPayout(); break;
        case 'dismissInstallBanner': dismissInstallBanner(); break;
        case 'triggerInstallPrompt': triggerInstallPrompt(); break;
        case 'spinWheel': spinWheel(); break;
        case 'handleDailyBonusClick': handleDailyBonusClick(); break;
        case 'confirmTask': confirmTask(); break;
        case 'submitTennisSession': submitTennisSession(); break;
        case 'submitProposal': submitProposal(); break;
        case 'shareProgress': shareProgress(); break;
        case 'shareApp': shareApp(); break;
        case 'contactDeveloper': contactDeveloper(); break;
        case 'confirmStreakRecovery': confirmStreakRecovery(); break;
        case 'confirmCashout': confirmCashout(); break;
        case 'submitFeedback': submitFeedback(); break;
        case 'setRating': setRating(parseInt(arg)); break;
        case 'onTaskClick': onTaskClick(parseInt(arg)); break;
        case 'showTaskHelp': e.stopPropagation(); showTaskHelp(parseInt(arg)); break;
        case 'openTennisModal': openTennisModal(arg === 'true'); break;
        case 'handleWeeklyClick': handleWeeklyClick(parseInt(arg), el.getAttribute('data-arg2') === 'true'); break;
        case 'dismissPaymentNotification': dismissPaymentNotification(arg); break;
        case 'closeCashoutAndReload': closeModal('cashoutModal'); location.reload(); break;
        // Inline handlers
        case 'inline-1': document.getElementById('allDoneSection').style.display='none'; break;
        case 'inline-2': document.getElementById('taskPhoto').click(); break;
        case 'inline-4': handleConfirm(false); break;
        case 'inline-5': handleConfirm(true); break;
    }
});

// Handle file input change (inline-3)
document.addEventListener('change', function(e) {
    if (e.target.id === 'taskPhoto') {
        previewImage(e.target);
    }
});

// Handle hover effect on levelBadge (replaces onmouseover/onmouseout)
(function() {
    const badge = document.getElementById('levelBadge');
    if (badge) {
        badge.addEventListener('mouseover', function() { this.style.transform = 'scale(1.05)'; });
        badge.addEventListener('mouseout', function() { this.style.transform = 'scale(1)'; });
    }
})();
