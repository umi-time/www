import { UmiTime, UMI_EXTENDED_BARE } from "umi-time";

const el = document.getElementById("umi-live-time");
if (el) {
  let lastText = null;

  function updateUmiTime() {
    const now = new Date();
    const umi = new UmiTime(now);

    const text = umi.format(UMI_EXTENDED_BARE);

    // Avoid unnecessary DOM writes
    if (text !== lastText) {
      el.textContent = text;
      lastText = text;
    }
  }

  function tick() {
    updateUmiTime();
    setTimeout(() => requestAnimationFrame(tick), 1000);
  }

  tick();
}

