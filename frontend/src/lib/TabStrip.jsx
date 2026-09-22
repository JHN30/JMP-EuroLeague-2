import { useEffect, useRef, useState } from "react";

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

export function TabStrip({ ariaLabel, tabs, activeKey, onChange, panelId, className = "" }) {
  const [focusedKey, setFocusedKey] = useState(activeKey);
  const [lastActiveKey, setLastActiveKey] = useState(activeKey);
  const buttonRefs = useRef({});

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
    <div role="tablist" aria-label={ariaLabel} className={`tabs tabs-boxed tabs-sm ${className}`}>
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

export function TabPanel({ id, focusKey, className = "", children }) {
  const ref = useRef(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    ref.current?.focus();
  }, [focusKey]);

  return (
    <div ref={ref} id={id} role="tabpanel" tabIndex={-1} className={`outline-none ${className}`}>
      {children}
    </div>
  );
}
