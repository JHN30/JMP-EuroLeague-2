import { useId, useRef, useState } from "react";
import { motion } from "motion/react";
import { EASE_OUT } from "../lib/motion";
import PickerPanel, { PickerOption } from "../comparisons/PickerPanel";

// "Šarić" and "saric" match: the search ignores case and accents.
const folded = (text) => (text ?? "").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

// Who the player's shots are set against on his Shooting tab: one player of his position, or all of them. The box shows the
// choice ("vs", the name and its `short` club code); focusing it clears it to a search over every option (`options` in
// their order: { key, name, short, detail, tag }), the arrow keys move through the list, Enter chooses and Escape keeps the
// choice.
export default function ShotRivalPicker({ label, options, value, onChange }) {
  const baseId = useId();
  const inputId = `${baseId}-input`;
  const listId = `${baseId}-list`;
  const optionId = (index) => `${baseId}-option-${index}`;
  const inputRef = useRef(null);
  // The typed search while the box is open; null while it shows the choice.
  const [search, setSearch] = useState(null);
  const [active, setActive] = useState(0);
  const open = search !== null;
  const chosen = options.find((option) => option.key === value);

  const words = folded(search).split(/\s+/).filter(Boolean);
  const visible = open ? options.filter((option) => words.every((word) => folded(option.name).includes(word))) : [];
  const current = Math.min(active, visible.length - 1);

  function close() {
    setSearch(null);
    setActive(0);
  }

  function choose(key) {
    onChange(key);
    close();
    inputRef.current?.blur();
  }

  function handleKeyDown(event) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) setSearch("");
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive(Math.max(0, Math.min(current + step, visible.length - 1)));
    } else if (event.key === "Enter" && open && current >= 0) {
      event.preventDefault();
      choose(visible[current].key);
    } else if (event.key === "Escape") {
      event.preventDefault();
      close();
    }
  }

  return (
    <div
      className="relative w-full max-w-xs"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) close();
      }}
    >
      {/* The box sits where the other side's name would be, so the "vs" in it says what it is; the label is for screen readers. */}
      <label className="sr-only" htmlFor={inputId}>
        {label}
      </label>
      {/* A press on the box opens the list, also after Escape left it focused; open, a press outside the typed text (the
          "vs", the arrow) closes it. */}
      <div
        className="input input-bordered input-sm flex w-full cursor-text items-center gap-2"
        onMouseDown={(event) => {
          const onText = event.target === inputRef.current;
          if (open) {
            if (onText) return;
            event.preventDefault();
            close();
            inputRef.current?.blur();
            return;
          }
          if (!onText) event.preventDefault();
          inputRef.current?.focus();
          setSearch("");
        }}
      >
        <span aria-hidden="true" className="flex-none text-[0.65rem] font-black tracking-widest text-primary uppercase">
          vs
        </span>
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={open && current >= 0 ? optionId(current) : undefined}
          placeholder={chosen?.name ?? "Search by name"}
          autoComplete="off"
          className={`min-w-0 flex-1 ${open ? "" : "font-semibold"}`}
          value={open ? search : (chosen?.name ?? "")}
          onFocus={() => setSearch("")}
          onKeyDown={handleKeyDown}
          onChange={(event) => {
            setSearch(event.target.value);
            setActive(0);
          }}
        />
        {!open && chosen?.short ? <span className="muted flex-none text-xs">{chosen.short}</span> : null}
        <motion.span aria-hidden="true" animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.18, ease: EASE_OUT }} className="muted flex-none text-xs">
          ▾
        </motion.span>
      </div>
      {/* The list floats over the court under the box, so nothing below it moves while it is open; it stays under the sticky
          filters (z-20) and the navigation when the page scrolls. */}
      <div className="absolute inset-x-0 top-full z-10">
        <PickerPanel open={open} listId={listId} label={label} note={visible.length === 0 ? "No players match." : null}>
          {visible.map((option, index) => (
            <PickerOption
              key={option.key}
              id={optionId(index)}
              active={index === current}
              selected={option.key === value}
              onHover={() => setActive(index)}
              onChoose={() => choose(option.key)}
            >
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="min-w-0 truncate">{option.name}</span>
                  {option.tag ? <span className="badge badge-ghost badge-xs flex-none">{option.tag}</span> : null}
                </span>
                {option.detail ? <span className="muted truncate text-xs font-normal">{option.detail}</span> : null}
              </span>
            </PickerOption>
          ))}
        </PickerPanel>
      </div>
    </div>
  );
}
