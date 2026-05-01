// Auto-reload when connection is restored
window.addEventListener('online', function() {
    location.reload();
});

// Event delegation
document.addEventListener('click', function(e) {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    if (el.getAttribute('data-action') === 'reload') {
        location.reload();
    }
});
