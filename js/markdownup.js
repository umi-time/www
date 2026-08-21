async function loadMarkdownInto(id, file) {
  const container = document.getElementById(id);
  const md = await fetch(file).then(r => r.text());
  container.innerHTML = marked.parse(md); // using marked.js
}

