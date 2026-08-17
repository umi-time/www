// ============================
// Dynamic copyright year
// ============================

(function () {
    const yearSpan = document.getElementById('year');
    if (yearSpan) {
        yearSpan.textContent = new Date().getFullYear();
    }
})();
