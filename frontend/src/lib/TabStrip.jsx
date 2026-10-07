import { useEffect, useRef, useState } from "react";
import { useCentredSelection } from "./useCentredSelection";

function nextIndexFor(key, currentIndex, enabledCount) {
  if (key === "ArrowRight" || key === "ArrowDown") {
    return currentIndex === -1 ? 0 : (currentIndex + 1) % enabledCount;
  }
  if (key === "ArrowLeft" || key === "ArrowUp") {
    return currentIndex === -1 ? enabledCount - 1 : (currentIndex - 1 + enabledCount) % enabledCount;
  }
  if (key === "Home") return 0;
  if (key === "End") return enabledCount - 1;
  return null;
}

// `level` sets how prominent the strip is: 1 for a page's main navigation, 2 for the filter under it, 3 (the default) for the
// detail strips inside a section. The bigger the level's weight, the bigger the tabs.
// `scrolling` is for a strip with more tabs than a narrow screen holds: below the lg breakpoint it stays one row that scrolls on
// its own and keeps the active tab in the middle of it.
export function TabStrip({ ariaLabel, tabs, activeKey, onChange, panelId, level = 3, scrolling = false, className = "" }) {
  const [focusedKey, setFocusedKey] = useState(activeKey);
  const [lastActiveKey, setLastActiveKey] = useState(activeKey);
  const buttonRefs = useRef({});
  const stripRef = useRef(null);
  useCentredSelection(stripRef, activeKey, scrolling);

  if (activeKey !== lastActiveKey) {
    setLastActiveKey(activeKey);
    setFocusedKey(activeKey);
  }

  function enabledTabs() {
    return tabs.filter((tab) => !tab.disabled);
  }

  function focusTab(key) {
    buttonRefs.current[key]?.focus();
  }

  function handleKeyDown(event) {
    const enabled = enabledTabs();
    if (enabled.length === 0) return;
    const currentIndex = enabled.findIndex((tab) => tab.key === focusedKey);
    const nextIndex = nextIndexFor(event.key, currentIndex, enabled.length);
    if (nextIndex === null) return;

    event.preventDefault();
    focusTab(enabled[nextIndex].key);
  }

  return (
    <div ref={stripRef} role="tablist" aria-label={ariaLabel} className={`tabs tab-level-${level} ${scrolling ? "tabs-scroll" : ""} ${className}`}>
      {tabs.map((tab) => {
        const isActive = tab.key === activeKey;
        const isFocusable = tab.key === focusedKey;
        return (
          <button
            key={tab.key}
            ref={(el) => {
              buttonRefs.current[tab.key] = el;
            }}
            role="tab"
            type="button"
            id={`tab-${tab.key}`}
            aria-selected={isActive}
            aria-controls={panelId}
            aria-disabled={tab.disabled || undefined}
            disabled={tab.disabled}
            tabIndex={isFocusable ? 0 : -1}
            className={`tab touch-target font-semibold ${isActive ? "tab-active" : ""}`}
            onClick={() => {
              if (tab.disabled) return;
              setFocusedKey(tab.key);
              onChange(tab.key);
            }}
            onFocus={() => setFocusedKey(tab.key)}
            onKeyDown={handleKeyDown}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

// Focus moves to the panel when `focusKey` changes, so keyboard and screen-reader users land on the new content. By default
// the browser also scrolls the panel into view; pass `scroll={false}` for a panel that holds most of the page, where
// scrolling to it would only hide the controls above it.
export function TabPanel({ id, focusKey, scroll = true, className = "", children }) {
  const ref = useRef(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    ref.current?.focus({ preventScroll: !scroll });
  }, [focusKey, scroll]);

  return (
    <div ref={ref} id={id} role="tabpanel" tabIndex={-1} className={`tab-panel outline-none ${className}`}>
      {children}
    </div>
  );
}
