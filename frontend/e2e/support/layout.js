export const WIDTHS = [320, 390, 768, 1024];
export const HEIGHT = 800;

// The page itself scrolling sideways. A strip that scrolls inside its own box is fine, so elements
// clipped by a scrolling ancestor are left out of the list of offenders.
export async function findPageOverflow(page) {
  return page.evaluate(() => {
    const root = document.documentElement;
    const clipsSideways = (el) => {
      for (let node = el.parentElement; node && node !== document.body; node = node.parentElement) {
        if (getComputedStyle(node).overflowX !== "visible") return true;
      }
      return false;
    };
    const offenders = [];
    for (const el of document.body.querySelectorAll("*")) {
      const { right, width } = el.getBoundingClientRect();
      if (width === 0 || right <= root.clientWidth + 1 || clipsSideways(el)) continue;
      const classes = typeof el.className === "string" ? el.className.split(/\s+/).filter(Boolean).slice(0, 3).join(".") : "";
      offenders.push(`${el.tagName.toLowerCase()}${classes ? `.${classes}` : ""} right=${Math.round(right)}`);
    }
    return { scrollWidth: root.scrollWidth, clientWidth: root.clientWidth, offenders: offenders.slice(0, 5) };
  });
}

// Texts whose longest word is wider than the box they wrap in, which the browser then cuts mid-word.
export async function findBrokenWords(locator) {
  return locator.evaluateAll((elements) =>
    elements
      .filter((element) => {
        const style = getComputedStyle(element);
        const probe = document.createElement("span");
        probe.style.cssText = `position:absolute;visibility:hidden;white-space:nowrap;font:${style.font};letter-spacing:${style.letterSpacing};text-transform:${style.textTransform}`;
        document.body.appendChild(probe);
        const widest = Math.max(
          ...element.textContent.split(/\s+/).map((word) => {
            probe.textContent = word;
            return probe.getBoundingClientRect().width;
          }),
        );
        probe.remove();
        return widest > element.clientWidth + 0.5;
      })
      .map((element) => element.textContent),
  );
}

export async function seasonSlug(page) {
  await page.goto("/");
  await page.waitForURL(/\/home$/);
  return new URL(page.url()).pathname.split("/")[1];
}
