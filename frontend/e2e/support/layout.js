import { expect } from "@playwright/test";

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
          // A browser may also break after a hyphen, so "MILLER-MCINTYRE," counts as two words.
          ...element.textContent.split(/\s+|(?<=-)/).map((word) => {
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

// How far the card nearest a swipe row's centre is from it, and which card that is.
export const nearestCard = (row) =>
  row.evaluate((element) => {
    const middle = element.getBoundingClientRect().left + element.clientWidth / 2;
    const offsets = [...element.children].map((card) => {
      const box = card.getBoundingClientRect();
      return Math.abs(box.left + box.width / 2 - middle);
    });
    const best = Math.min(...offsets);
    return { index: offsets.indexOf(best), offset: Math.round(best) };
  });

// The swipe-row contract below 640px: snap one card at a time, a tab stop, the first card on the panel's content edge
// with the neighbouring card peeking out, and the last card on the opposite content edge once scrolled to the end.
export async function expectSwipeRowAtRest(row) {
  await expect(row).toHaveCSS("scroll-snap-type", "x mandatory");
  await expect(row).toHaveAttribute("tabindex", "0");
  await row.evaluate((el) => el.scrollTo({ left: 0, behavior: "instant" }));

  const geometry = await row.evaluate((el) => {
    const panel = el.closest("section, .panel");
    const panelStyle = getComputedStyle(panel);
    const panelBox = panel.getBoundingClientRect();
    const edge = parseFloat(panelStyle.paddingLeft) + parseFloat(panelStyle.borderLeftWidth);
    const [first, second] = [...el.children].map((card) => card.getBoundingClientRect());
    return {
      contentLeft: panelBox.left + edge,
      contentWidth: panelBox.width - 2 * edge,
      rowRight: el.getBoundingClientRect().right,
      first: first.toJSON(),
      second: second.toJSON(),
    };
  });
  expect(Math.abs(geometry.first.left - geometry.contentLeft)).toBeLessThanOrEqual(1);
  expect(geometry.first.width / geometry.contentWidth).toBeGreaterThan(0.8);
  expect(geometry.first.width / geometry.contentWidth).toBeLessThan(0.9);
  expect(geometry.rowRight - geometry.second.left).toBeGreaterThan(20);
  expect(geometry.second.left - geometry.first.right).toBeLessThanOrEqual(12);

  await row.evaluate((el) => el.scrollTo({ left: el.scrollWidth, behavior: "instant" }));
  await expect
    .poll(() =>
      row.evaluate((el) => {
        const panel = el.closest("section, .panel");
        const panelStyle = getComputedStyle(panel);
        const edge = parseFloat(panelStyle.paddingRight) + parseFloat(panelStyle.borderRightWidth);
        const last = el.lastElementChild.getBoundingClientRect();
        return Math.abs(Math.round(panel.getBoundingClientRect().right - edge - last.right));
      }),
    )
    .toBe(0);
}

export async function expectSwipeRowSettles(page, row) {
  await row.evaluate((el) => el.scrollTo({ left: 150, behavior: "instant" }));
  await expect.poll(async () => (await nearestCard(row)).offset).toBeLessThanOrEqual(2);

  await row.evaluate((el) => el.scrollTo({ left: 0, behavior: "instant" }));
  await row.focus();
  await page.keyboard.press("ArrowRight");
  await expect.poll(async () => nearestCard(row)).toEqual({ index: 1, offset: 0 });
}

export async function seasonSlug(page) {
  await page.goto("/");
  await page.waitForURL(/\/home$/);
  return new URL(page.url()).pathname.split("/")[1];
}
