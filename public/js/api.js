(function () {
  const tocList = document.getElementById("toc-list");
  if (!tocList) return;

  // Which headings to include in the TOC
  const headings = document.querySelectorAll(
    "#umi-content h2, #umi-content h3, #umi-content h4, #umi-content h5, #umi-content h6",
  );

function getSectionNumber(heading) {
  const li = heading.closest('li');
  if (!li) return '';

  const parts = [];
  let currentLi = li;

  while (currentLi) {
    const parentOl = currentLi.parentElement;
    if (!parentOl || parentOl.tagName !== 'OL') break;

    const siblings = Array.from(parentOl.children)
      .filter((el) => el.tagName === 'LI');

    const index = siblings.indexOf(currentLi);
    if (index === -1) break;

    parts.unshift(index + 1);

    // Move up to the parent <li> (if this <ol> is nested)
    currentLi = parentOl.closest('li');
  }

  return parts.join('.');
}

headings.forEach((h) => {
  if (!h.id) {
    h.id = h.textContent.trim()
      .toLowerCase()
      .replace(/[^\w]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  const number = getSectionNumber(h);

  const li = document.createElement('li');
  if (h.tagName === 'H3') li.style.paddingLeft = '12px';
  if (h.tagName === 'H4') li.style.paddingLeft = '24px';
  if (h.tagName === 'H5') li.style.paddingLeft = '36px';
  if (h.tagName === 'H6') li.style.paddingLeft = '48px';

  const a = document.createElement('a');
  a.href = '#' + h.id;

  a.textContent = number
    ? number + ' ' + h.textContent.trim()
    : h.textContent.trim();

  a.addEventListener('click', (e) => {
    e.preventDefault();

    links.forEach((link) => link.classList.remove('active'));
    a.classList.add('active');

    const target = document.getElementById(h.id);
    const y = target.getBoundingClientRect().top + window.scrollY - 80;
    window.scrollTo({ top: y, behavior: 'smooth' });
  });

  li.appendChild(a);
  tocList.appendChild(li);
});

// Highlight active section on scroll
  const links = Array.from(tocList.querySelectorAll("a"));

  // Scroll-position based highlight
window.addEventListener('scroll', () => {
  const scrollPos = window.scrollY + 77; // offset for sticky TOC

  let currentId = null;

  headings.forEach((h) => {
    const top = h.offsetTop;
    if (scrollPos >= top) {
      currentId = h.id;
    }
  });

  if (currentId) {
    links.forEach((link) => {
      link.classList.toggle('active', link.getAttribute('href') === '#' + currentId);
    });
  }
});
})();
