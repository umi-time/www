async function loadInclude(id, file, callback) {
  const container = document.getElementById(id);
  if (!container) return;

  try {
    const response = await fetch(file);
    const html = await response.text();
    container.innerHTML = html;
    if (callback) callback();
  } catch (err) {
    console.error(`Failed to load ${file}`, err);
  }
}

loadInclude("umi-header", "partials/header.html");
loadInclude("umi-footer", "partials/footer.html", () => {
  // After footer is loaded, update the year
  const yearSpan = document.getElementById('footer-year');
  if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
  }
});
