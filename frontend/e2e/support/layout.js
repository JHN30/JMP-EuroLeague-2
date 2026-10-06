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

export async function seasonSlug(page) {
  await page.goto("/");
  await page.waitForURL(/\/home$/);
  return new URL(page.url()).pathname.split("/")[1];
}
