// Shared dark mode initialization for all pages
(function() {
    var theme = localStorage.getItem('theme');
    if (!theme) {
        theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    if (theme === 'dark') {
        document.body.classList.add('dark-mode');
    }
})();
