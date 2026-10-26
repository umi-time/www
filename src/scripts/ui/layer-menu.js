// ui/layer-menu.js
export function initLayerMenu() {
  const button = document.getElementById("layerToggleButton");
  const menu = document.getElementById("layerMenu");

  let open = false;

  function setOpen(state) {
    open = state;
    menu.style.display = open ? "flex" : "none";
  }

  // Toggle when clicking the button
  button.addEventListener("click", () => {
    setOpen(!open);
  });

  // Prevent clicks inside the menu from closing it
  menu.addEventListener("click", (e) => {
    e.stopPropagation();
  });

  return {
    registerLayer(id, callback) {
      const checkbox = document.getElementById(id);
      if (!checkbox) return;

      const saved = localStorage.getItem("layer-" + id);
      if (saved !== null) {
        checkbox.checked = saved === "true";
      }

      callback(checkbox.checked);

      checkbox.addEventListener("change", () => {
        localStorage.setItem("layer-" + id, checkbox.checked);
        callback(checkbox.checked);
      });
    },

    // expose controlled close function
    closeMenu() {
      setOpen(false);
    },

    // expose elements for containment checks
    elements: { button, menu }
  };
}
