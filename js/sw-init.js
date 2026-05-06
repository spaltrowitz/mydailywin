// Service worker registration — shared across all pages
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
        .then(reg => {
            console.log('Service Worker registered');
            reg.addEventListener('updatefound', () => {
                const newWorker = reg.installing;
                if (newWorker) {
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'activated') {
                            console.log('New Service Worker activated, reloading for fresh content');
                            window.location.reload();
                        }
                    });
                }
            });
            reg.update();
        })
        .catch(err => console.log('Service Worker registration failed:', err));
}
