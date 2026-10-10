import { useEffect, useId, useRef, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { Link, useParams, useSearchParams } from "react-router";
import AsyncState from "../lib/AsyncState";
import LabelledSelect from "../lib/LabelledSelect";
import Panel from "../lib/Panel";
import ComparisonRow from "../lib/ComparisonRow";
import { EASE_OUT, denseListContainer, listItem } from "../lib/motion";
import RevealImage from "../lib/RevealImage";
import ShortLabel from "../lib/ShortLabel";
import PageHeader from "../lib/PageHeader";
import { useDocumentTitle } from "../lib/useDocumentTitle";
import { useDebouncedValue } from "../lib/useDebouncedValue";
import { usePhaseParam } from "../lib/usePhaseParam";
import { TabPanel, TabStrip } from "../lib/TabStrip";
import CompareFixtures, { GameContext } from "./CompareFixtures";
import PickerPanel, { PickerImage, PickerOption } from "./PickerPanel";
import CompareRosters from "./CompareRosters";
import ComparePlayerAdvanced from "./ComparePlayerAdvanced";
import ComparePlayerOverview from "./ComparePlayerOverview";
import CompareTeamOverview from "./CompareTeamOverview";
import CompareTeamTrends from "./CompareTeamTrends";
import ComparePlayerTrends from "./ComparePlayerTrends";
import CompareTeamStats from "./CompareTeamStats";
import {
  getLeaderStats,
  getPhases,
  getPlayer,
  getPlayerSeasonStats,
  getSeasonPlayers,
  getSeasonTeams,
} from "../lib/api";
import { PLAYER_METRIC_GROUPS, formatStatValue } from "../lib/statsFields";

const PLAYER_COMPARISON_ROWS = PLAYER_METRIC_GROUPS.flatMap((group) => [
  { type: "header", key: group.group, label: group.label },
  ...group.options.map(([key, label]) => ({
    type: "metric",
    key: `${group.group}-${key}`,
    group: group.group,
    metricKey: key,
    label,
  })),
]);

const PLAYER_METRIC_DIRECTIONS = {
  pointsScored: "higher",
  totalRebounds: "higher",
  assists: "higher",
  steals: "higher",
  turnovers: "lower",
  blocks: "higher",
  pir: "higher",
  minutesPlayed: "neutral",
  gamesPlayed: "neutral",
  effectiveFieldGoalPercentage: "higher",
  trueShootingPercentage: "higher",
  reboundsPercentage: "higher",
  assistsToTurnoversRatio: "higher",
  possessions: "neutral",
  twoPointRate: "neutral",
  threePointRate: "neutral",
  pointsFromTwoPointersPercentage: "neutral",
  pointsFromThreePointersPercentage: "neutral",
  pointsFromFreeThrowsPercentage: "neutral",
  wins: "higher",
  losses: "lower",
  doubleDoubles: "higher",
  tripleDoubles: "higher",
};

// A comparison opens on its overview, the preview of the pairing.
const firstSection = () => "overview";

// How long the letters typed into an open team list count as one search before a new key starts over.
const TYPE_AHEAD_MS = 500;

// A select-only combobox: the button names the chosen club and opens an animated list of every club but the one picked on the
// other side. Focus stays on the button; the arrow keys move through the list, letters jump to a club, Enter chooses.
function TeamPicker({ label, allTeams, teamsPending, selected, excludeId, onSelect }) {
  const baseId = useId();
  const labelId = `${baseId}-label`;
  const listId = `${baseId}-list`;
  const optionId = (index) => `${baseId}-option-${index}`;
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const typeAhead = useRef({ text: "", at: 0 });
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const options = [
    { key: "", name: "Select a team", team: null },
    ...allTeams.filter((team) => team.clubCode !== excludeId).map((team) => ({ key: team.clubCode, name: team.name ?? team.clubCode, team })),
  ];
  const selectedIndex = Math.max(0, options.findIndex((option) => option.key === (selected?.id ?? "")));
  const chosen = allTeams.find((team) => team.clubCode === selected?.id) ?? null;

  useEffect(() => {
    if (!open) return undefined;
    const closeOutside = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [open]);

  function openList() {
    setActive(selectedIndex);
    setOpen(true);
  }

  function choose(index) {
    const option = options[index];
    onSelect(option.team ? { id: option.key, label: option.name } : null);
    setOpen(false);
    buttonRef.current?.focus();
  }

  // Letters typed close together search together; one letter pressed again moves on to the next club with that letter.
  function jumpTo(key) {
    const now = Date.now();
    const text = now - typeAhead.current.at < TYPE_AHEAD_MS ? typeAhead.current.text + key.toLowerCase() : key.toLowerCase();
    typeAhead.current = { text, at: now };
    const from = text.length === 1 ? active + 1 : active;
    const order = [...options.keys()].slice(1);
    const next = [...order.filter((index) => index >= from), ...order.filter((index) => index < from)].find((index) =>
      options[index].name.toLowerCase().startsWith(text),
    );
    if (next !== undefined) setActive(next);
  }

  function handleKeyDown(event) {
    if (!open) {
      if (["Enter", " ", "ArrowDown", "ArrowUp"].includes(event.key)) {
        event.preventDefault();
        openList();
      }
      return;
    }
    const last = options.length - 1;
    if (event.key === "ArrowDown") setActive((index) => Math.min(index + 1, last));
    else if (event.key === "ArrowUp") setActive((index) => Math.max(index - 1, 0));
    else if (event.key === "Home") setActive(0);
    else if (event.key === "End") setActive(last);
    else if (event.key === "Enter" || event.key === " ") choose(active);
    else if (event.key === "Escape") setOpen(false);
    else if (event.key === "Tab") {
      setOpen(false);
      return;
    } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) jumpTo(event.key);
    else return;
    event.preventDefault();
  }

  return (
    <div ref={rootRef} className="relative">
      <span id={labelId} className="label">
        {label}
      </span>
      <button
        ref={buttonRef}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-labelledby={labelId}
        aria-activedescendant={open ? optionId(active) : undefined}
        disabled={teamsPending}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={handleKeyDown}
        className="input input-bordered input-sm flex w-full cursor-pointer items-center gap-2 text-left"
      >
        {chosen ? <PickerImage src={chosen.crestUrl} className="h-5 w-5" /> : null}
        <span className={`min-w-0 flex-1 truncate ${chosen ? "font-semibold" : "muted"}`}>
          {chosen ? <ShortLabel short={chosen.tvCode ?? chosen.clubCode} full={chosen.name ?? chosen.clubCode} /> : "Select a team"}
        </span>
        <motion.span aria-hidden="true" animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.18, ease: EASE_OUT }} className="muted flex-none text-xs">
          ▾
        </motion.span>
      </button>
      <PickerPanel open={open} listId={listId} label={label}>
        {options.map((option, index) => (
          <PickerOption
            key={option.key || "none"}
            id={optionId(index)}
            active={index === active}
            selected={index === selectedIndex}
            onHover={() => setActive(index)}
            onChoose={() => choose(index)}
          >
            {option.team ? <PickerImage src={option.team.crestUrl} /> : <span aria-hidden="true" className="h-6 w-6 flex-none" />}
            <span className={`min-w-0 flex-1 wrap-break-word ${option.team ? "" : "muted"}`}>{option.name}</span>
          </PickerOption>
        ))}
      </PickerPanel>
    </div>
  );
}

// A player search. Clicking into the box already offers the league's top scorers; typing narrows it to the names that match, once the
// typing pauses. The box is an editable combobox: the arrow keys move through the list and Enter chooses.
function PlayerPicker({ seasonCode, label, selected, excludeId, onSelect }) {
  const baseId = useId();
  const listId = `${baseId}-list`;
  const optionId = (index) => `${baseId}-option-${index}`;
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const typed = search.trim();
  const debounced = useDebouncedValue(typed);
  const searching = debounced.length > 0;

  const searchQuery = useQuery({
    queryKey: ["player-picker-search", seasonCode, debounced],
    queryFn: () => getSeasonPlayers(seasonCode, { search: debounced, limit: 8 }),
    enabled: open && searching,
    placeholderData: keepPreviousData,
  });
  const suggestionQuery = useQuery({
    queryKey: ["player-picker-top", seasonCode],
    queryFn: () => getLeaderStats(seasonCode, { phase: "RS", mode: "perGame", sort: "pointsScored", order: "desc", limit: 9 }),
    enabled: open && !searching,
    staleTime: 5 * 60 * 1000,
  });

  const choose = (personKey, name) => {
    onSelect({ id: personKey, label: name ?? personKey });
    setSearch("");
    setOpen(false);
  };

  if (selected) {
    return (
      <div>
        <span className="label">{label}</span>
        <div className="input input-bordered input-sm flex w-full items-center justify-between gap-2">
          <span className="truncate font-semibold">{selected.label}</span>
          <button
            type="button"
            className="btn btn-xs"
            onClick={() => {
              onSelect(null);
              setSearch("");
            }}
          >
            Change
          </button>
        </div>
      </div>
    );
  }

  const isSearchResult = typed.length > 0;
  const rows = isSearchResult
    ? (searchQuery.data?.players ?? []).map((player) => ({
        key: player.personKey,
        name: player.name,
        photo: player.imageUrl,
        crest: player.crestUrl,
        sub: player.clubName,
        subShort: player.clubTvCode ?? player.clubCode,
      }))
    : (suggestionQuery.data?.players ?? []).map((player) => ({
        key: player.personKey,
        name: player.playerName,
        photo: player.playerImageUrl,
        crest: player.clubImageUrl,
        sub: player.clubName,
        subShort: (player.clubTvCodes ?? player.clubCode)?.replaceAll(";", "/"),
      }));
  const visible = rows.filter((row) => row.key !== excludeId).slice(0, 8);
  const waiting = isSearchResult ? typed !== debounced || searchQuery.isPending : suggestionQuery.isPending;
  const showList = open && (isSearchResult || suggestionQuery.isPending || visible.length > 0);
  const current = Math.min(active, visible.length - 1);
  const note = waiting && visible.length === 0 ? (isSearchResult ? "Searching..." : "Loading...") : visible.length === 0 ? "No players match." : null;

  function handleKeyDown(event) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) setOpen(true);
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive(Math.max(0, Math.min(current + step, visible.length - 1)));
    } else if (event.key === "Enter" && showList && current >= 0) {
      event.preventDefault();
      choose(visible[current].key, visible[current].name);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div
      className="relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <label className="label" htmlFor={`player-picker-${label}`}>
        {label}
      </label>
      <input
        id={`player-picker-${label}`}
        type="search"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showList}
        aria-controls={listId}
        aria-activedescendant={showList && current >= 0 ? optionId(current) : undefined}
        placeholder="Search by name"
        autoComplete="off"
        className="input input-bordered input-sm w-full"
        value={search}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        onChange={(event) => {
          setSearch(event.target.value);
          setActive(0);
          setOpen(true);
        }}
      />
      <PickerPanel
        open={showList}
        listId={listId}
        label={isSearchResult ? "Matching players" : "Top scorers"}
        heading={isSearchResult ? null : "Top scorers"}
        note={note}
      >
        {visible.map((row, index) => (
          <PickerOption key={row.key} id={optionId(index)} active={index === current} selected={false} onHover={() => setActive(index)} onChoose={() => choose(row.key, row.name)}>
            <PickerImage src={row.photo} round className="h-8 w-8" />
            {/* Below lg the two pickers are narrow, so a row puts the club under the name rather than beside it. */}
            <span className="flex min-w-0 flex-1 flex-col lg:flex-row lg:items-center lg:gap-2">
              <span className="min-w-0 flex-1 line-clamp-2 wrap-break-word">{row.name ?? row.key}</span>
              {row.sub ? (
                <span className="muted flex min-w-0 items-center gap-1.5 text-xs lg:max-w-[45%]">
                  <PickerImage src={row.crest} className="h-4 w-4" />
                  <span className="min-w-0 line-clamp-2 wrap-break-word">
                    <ShortLabel short={row.subShort ?? row.sub} full={row.sub} />
                  </span>
                </span>
              ) : null}
            </span>
          </PickerOption>
        ))}
      </PickerPanel>
    </div>
  );
}

function PlayerHeaderCell({ label, imageUrl }) {
  return (
    <div className="text-center">
      {imageUrl ? <RevealImage src={imageUrl} effect="wipe" className="mx-auto mb-1 aspect-3/4 h-12 w-auto object-contain object-bottom" /> : null}
      <div className="font-semibold">{label}</div>
    </div>
  );
}

function PlayerComparisonTable({ seasonCode, phaseCode, mode, entityA, entityB }) {
  const statsAQuery = useQuery({
    queryKey: ["player-compare-stats", seasonCode, phaseCode, mode, entityA?.id],
    queryFn: () => getPlayerSeasonStats(seasonCode, entityA.id, { phase: phaseCode, mode }),
    enabled: Boolean(phaseCode) && Boolean(entityA),
  });
  const statsBQuery = useQuery({
    queryKey: ["player-compare-stats", seasonCode, phaseCode, mode, entityB?.id],
    queryFn: () => getPlayerSeasonStats(seasonCode, entityB.id, { phase: phaseCode, mode }),
    enabled: Boolean(phaseCode) && Boolean(entityB),
  });

  if (!entityA || !entityB) return <p className="muted">Select two players to compare.</p>;
  if (statsAQuery.isPending || statsBQuery.isPending) return <AsyncState status="loading" label="Loading the comparison" />;
  if (statsAQuery.isError || statsBQuery.isError) {
    return (
      <AsyncState status="error"
        message="Could not load the comparison."
        onRetry={() => {
          statsAQuery.refetch();
          statsBQuery.refetch();
        }}
      />
    );
  }

  const a = statsAQuery.data.players?.[0];
  const b = statsBQuery.data.players?.[0];

  return (
    <Panel className="p-3">
      <motion.div variants={denseListContainer} initial="hidden" animate="show">
        <motion.div variants={listItem} className="mb-4 grid grid-cols-2 gap-4">
          <PlayerHeaderCell label={entityA.label} imageUrl={a?.playerImageUrl} />
          <PlayerHeaderCell label={entityB.label} imageUrl={b?.playerImageUrl} />
        </motion.div>
        {PLAYER_COMPARISON_ROWS.map((row) => {
        if (row.type === "header") {
          return (
            <motion.h3 key={row.key} variants={listItem} className="bg-base-200 -mx-3 px-3 py-2 text-sm font-bold">
              {row.label}
            </motion.h3>
          );
        }
        return (
          <ComparisonRow
            key={row.key}
            animated
            label={row.label}
            rawA={a?.[row.group]?.[row.metricKey]}
            rawB={b?.[row.group]?.[row.metricKey]}
            displayA={formatStatValue(row.metricKey, a?.[row.group]?.[row.metricKey])}
            displayB={formatStatValue(row.metricKey, b?.[row.group]?.[row.metricKey])}
            direction={PLAYER_METRIC_DIRECTIONS[row.metricKey]}
          />
        );
        })}
      </motion.div>
    </Panel>
  );
}

function ComparisonsBody({
  seasonCode,
  phases,
  phaseCode,
  setSelectedPhase,
  allTeams,
  initialView,
  initialTeamA,
  initialTeamB,
  initialPlayerA,
  initialPlayerB,
  initialGame,
}) {
  const [, setSearchParams] = useSearchParams();
  const [view, setView] = useState(initialView);
  const [section, setSection] = useState(firstSection(initialView));
  const [mode, setMode] = useState("perGame");
  const [entityA, setEntityA] = useState(() => {
    if (initialView !== "teams") return null;
    const team = allTeams.find((candidate) => candidate.clubCode === initialTeamA);
    return team ? { id: team.clubCode, label: team.name ?? team.clubCode } : null;
  });
  const [entityB, setEntityB] = useState(() => {
    if (initialView !== "teams") return null;
    const team = allTeams.find((candidate) => candidate.clubCode === initialTeamB);
    return team ? { id: team.clubCode, label: team.name ?? team.clubCode } : null;
  });
  const [copyLabel, setCopyLabel] = useState("Copy comparison link");
  // The game the comparison was opened from (a pick on the upcoming-games panel), kept in the URL so the context survives a refresh.
  const [gameCode, setGameCode] = useState(initialGame);

  // Resolve player entities named only by personKey in the URL (teams
  // resolve synchronously above from the already-loaded team list).
  const resolveAQuery = useQuery({
    queryKey: ["comparison-resolve-player", seasonCode, initialPlayerA],
    queryFn: () => getPlayer(seasonCode, initialPlayerA),
    enabled: initialView === "players" && Boolean(initialPlayerA),
  });
  const resolveBQuery = useQuery({
    queryKey: ["comparison-resolve-player", seasonCode, initialPlayerB],
    queryFn: () => getPlayer(seasonCode, initialPlayerB),
    enabled: initialView === "players" && Boolean(initialPlayerB),
  });
  // While a player named only by personKey in the URL is still resolving
  // (or once resolved but not yet explicitly re-picked), fall back to the
  // resolved entity rather than storing it in state via an effect.
  const resolvedPlayerA = resolveAQuery.data?.player
    ? { id: resolveAQuery.data.player.personKey, label: resolveAQuery.data.player.name ?? resolveAQuery.data.player.personKey }
    : null;
  const resolvedPlayerB = resolveBQuery.data?.player
    ? { id: resolveBQuery.data.player.personKey, label: resolveBQuery.data.player.name ?? resolveBQuery.data.player.personKey }
    : null;
  const effectiveEntityA = entityA ?? resolvedPlayerA;
  const effectiveEntityB = entityB ?? resolvedPlayerB;

  function persistEntities(nextView, a, b, fromGame = null) {
    setSearchParams(
      (params) => {
        const next = new URLSearchParams(params);
        next.set("view", nextView);
        if (nextView === "teams") {
          if (a?.id) next.set("teamA", a.id); else next.delete("teamA");
          if (b?.id) next.set("teamB", b.id); else next.delete("teamB");
          next.delete("playerA");
          next.delete("playerB");
        } else {
          if (a?.id) next.set("playerA", a.id); else next.delete("playerA");
          if (b?.id) next.set("playerB", b.id); else next.delete("playerB");
          next.delete("teamA");
          next.delete("teamB");
        }
        if (nextView === "teams" && fromGame) next.set("game", fromGame); else next.delete("game");
        return next;
      },
      { replace: true },
    );
  }

  function handleViewChange(value) {
    setView(value);
    setSection(firstSection(value));
    setEntityA(null);
    setEntityB(null);
    setGameCode(null);
    persistEntities(value, null, null);
  }

  function handleSelectA(next) {
    setEntityA(next);
    setGameCode(null);
    persistEntities(view, next, effectiveEntityB);
  }

  function handleSelectB(next) {
    setEntityB(next);
    setGameCode(null);
    persistEntities(view, effectiveEntityA, next);
  }

  function handleSwap() {
    setEntityA(effectiveEntityB);
    setEntityB(effectiveEntityA);
    setGameCode(null);
    persistEntities(view, effectiveEntityB, effectiveEntityA);
  }

  // A game picked on the upcoming-games panel: its home club is Team A, and the statistics follow the game's phase.
  function handlePickGame(game) {
    const asEntity = (team) => ({ id: team.clubCode, label: team.name ?? team.clubCode });
    const home = asEntity(game.localTeam);
    const road = asEntity(game.roadTeam);
    setView("teams");
    setSection(firstSection("teams"));
    setEntityA(home);
    setEntityB(road);
    setGameCode(game.gameCode);
    if (game.phaseCode && game.phaseCode !== phaseCode && phases.some((phase) => phase.code === game.phaseCode)) handlePhaseChange(game.phaseCode);
    persistEntities("teams", home, road, game.gameCode);
  }

  function handleBack() {
    setEntityA(null);
    setEntityB(null);
    setGameCode(null);
    setSection(firstSection(view));
    persistEntities(view, null, null);
  }

  function handleCopyLink() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopyLabel("Link copied");
      setTimeout(() => setCopyLabel("Copy comparison link"), 3000);
    });
  }

  // Changing the archive-level phase resets the view-level per-game/totals
  // mode, but not the selected teams/players being compared.
  function handlePhaseChange(code) {
    setSelectedPhase(code);
    setMode("perGame");
  }

  const bothSelected = Boolean(effectiveEntityA && effectiveEntityB);
  const teamPickers = (
    <div className="grid items-start gap-4 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
      <TeamPicker label="Team A" allTeams={allTeams} teamsPending={false} selected={effectiveEntityA} excludeId={effectiveEntityB?.id} onSelect={handleSelectA} />
      <button type="button" className="btn btn-outline btn-square btn-sm mx-auto sm:mt-7" aria-label="Swap teams" disabled={!effectiveEntityA && !effectiveEntityB} onClick={handleSwap}>
        &#8646;
      </button>
      <TeamPicker label="Team B" allTeams={allTeams} teamsPending={false} selected={effectiveEntityB} excludeId={effectiveEntityA?.id} onSelect={handleSelectB} />
    </div>
  );
  const playerPickers = (
    <div className="grid items-start gap-4 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
      <PlayerPicker seasonCode={seasonCode} label="Player A" selected={effectiveEntityA} excludeId={effectiveEntityB?.id} onSelect={handleSelectA} />
      <button type="button" className="btn btn-outline btn-square btn-sm mx-auto sm:mt-7" aria-label="Swap players" disabled={!effectiveEntityA && !effectiveEntityB} onClick={handleSwap}>
        &#8646;
      </button>
      <PlayerPicker seasonCode={seasonCode} label="Player B" selected={effectiveEntityB} excludeId={effectiveEntityA?.id} onSelect={handleSelectB} />
    </div>
  );

  // Nothing chosen yet: the games of the coming round and the pickers for any two teams (or players).
  if (!bothSelected) {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: EASE_OUT }}>
        <PageHeader kicker="HEAD-TO-HEAD" title="Compare" />
        <TabStrip
          scrolling
          ariaLabel="Comparison type"
          level={1}
          panelId="comparison-panel"
          activeKey={view}
          onChange={handleViewChange}
          className="mb-6 w-fit"
          tabs={[
            { key: "teams", label: "Teams" },
            { key: "players", label: "Players" },
          ]}
        />
        <div id="comparison-panel" className="mb-6">
          {view === "teams" ? (
            <div className="flex flex-col gap-6">
              <CompareFixtures seasonCode={seasonCode} onPick={handlePickGame} />
              <Panel className="p-4">
                <p className="eyebrow mb-0.5">ANY TWO TEAMS</p>
                <h2 className="mb-3 text-lg font-bold">Compare any two teams</h2>
                {teamPickers}
              </Panel>
            </div>
          ) : (
            playerPickers
          )}
        </div>
      </motion.div>
    );
  }

  // A comparison is open: only what it needs, the way back, the sections and the statistics phase.
  const sections =
    view === "teams"
      ? [
          { key: "overview", label: "Overview" },
          { key: "statistics", label: "Statistics" },
          { key: "rosters", label: "Rosters" },
          { key: "trends", label: "Trends" },
        ]
      : [
          { key: "overview", label: "Overview" },
          { key: "statistics", label: "Statistics" },
          { key: "advanced", label: "Advanced" },
          { key: "trends", label: "Trends" },
        ];
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: EASE_OUT }}>
      <PageHeader kicker="HEAD-TO-HEAD" title="Compare">
        <button type="button" className="btn btn-sm" onClick={handleCopyLink}>
          <span className="sm:hidden">{copyLabel === "Link copied" ? copyLabel : "Copy link"}</span>
          <span className="max-sm:hidden">{copyLabel}</span>
        </button>
      </PageHeader>

      <GameContext seasonCode={seasonCode} gameCode={gameCode} backLabel={view === "teams" ? "← Games" : "← Players"} onBack={handleBack}>
        {view === "teams" ? (
          <Link
            to={`/${seasonCode}/compare/head-to-head?teamA=${encodeURIComponent(effectiveEntityA.id)}&teamB=${encodeURIComponent(effectiveEntityB.id)}`}
            className="link link-hover text-sm"
          >
            All-time head-to-head
          </Link>
        ) : null}
      </GameContext>

      <div className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <TabStrip
          scrolling
          ariaLabel="Comparison section"
          level={1}
          panelId="comparison-section-panel"
          activeKey={section}
          onChange={setSection}
          className="w-fit"
          tabs={sections}
        />
        <div className="grid grid-cols-2 items-end gap-3 max-sm:w-full max-sm:[&_select]:w-full sm:flex sm:flex-wrap">
          {view === "players" && section === "statistics" ? (
            <LabelledSelect label="Player statistics" ariaLabel="Player comparison mode" value={mode} onChange={(event) => setMode(event.target.value)}>
              <option value="accumulated">Accumulated</option>
              <option value="perGame">Per game</option>
            </LabelledSelect>
          ) : null}
          <LabelledSelect label="Phase" ariaLabel="Comparison phase" value={phaseCode ?? ""} onChange={(event) => handlePhaseChange(event.target.value)}>
            {phases.map((phase) => (
              <option key={phase.code} value={phase.code}>
                {phase.name ?? phase.code}
              </option>
            ))}
          </LabelledSelect>
        </div>
      </div>

      <TabPanel id="comparison-section-panel" focusKey={section} scroll={false}>
        {section === "overview" ? (
          view === "teams" ? (
            <CompareTeamOverview seasonCode={seasonCode} phaseCode={phaseCode} entityA={effectiveEntityA} entityB={effectiveEntityB} hosted={Boolean(gameCode)} />
          ) : (
            <ComparePlayerOverview seasonCode={seasonCode} phaseCode={phaseCode} entityA={effectiveEntityA} entityB={effectiveEntityB} />
          )
        ) : section === "statistics" ? (
          view === "teams" ? (
            <CompareTeamStats seasonCode={seasonCode} phaseCode={phaseCode} entityA={effectiveEntityA} entityB={effectiveEntityB} />
          ) : (
            <PlayerComparisonTable seasonCode={seasonCode} phaseCode={phaseCode} mode={mode} entityA={effectiveEntityA} entityB={effectiveEntityB} />
          )
        ) : section === "advanced" ? (
          <ComparePlayerAdvanced seasonCode={seasonCode} phaseCode={phaseCode} entityA={effectiveEntityA} entityB={effectiveEntityB} />
        ) : section === "rosters" ? (
          <CompareRosters seasonCode={seasonCode} phaseCode={phaseCode} entityA={effectiveEntityA} entityB={effectiveEntityB} />
        ) : (
          view === "teams" ? (
            <CompareTeamTrends seasonCode={seasonCode} phaseCode={phaseCode} entityA={effectiveEntityA} entityB={effectiveEntityB} />
          ) : (
            <ComparePlayerTrends seasonCode={seasonCode} phaseCode={phaseCode} entityA={effectiveEntityA} entityB={effectiveEntityB} />
          )
        )}
      </TabPanel>
    </motion.div>
  );
}

export default function ComparisonsPage() {
  useDocumentTitle("Compare");
  const { seasonCode } = useParams();
  const [searchParams] = useSearchParams();

  const phasesQuery = useQuery({
    queryKey: ["phases", seasonCode],
    queryFn: () => getPhases(seasonCode),
  });
  const phases = phasesQuery.data?.phases ?? [];
  const [phaseCode, setPhaseCode] = usePhaseParam(phases);

  const teamsQuery = useQuery({
    queryKey: ["teams", seasonCode],
    queryFn: () => getSeasonTeams(seasonCode),
  });

  if (phasesQuery.isLoading || teamsQuery.isLoading) return <AsyncState status="loading" label="Loading phases" />;
  if (phasesQuery.isError) {
    return <AsyncState status="error" message="Could not load phases." onRetry={() => phasesQuery.refetch()} />;
  }
  if (teamsQuery.isError) {
    return <AsyncState status="error" message="Could not load teams." onRetry={() => teamsQuery.refetch()} />;
  }

  return (
    <ComparisonsBody
      seasonCode={seasonCode}
      phases={phases}
      phaseCode={phaseCode}
      setSelectedPhase={setPhaseCode}
      allTeams={teamsQuery.data.teams ?? []}
      initialView={searchParams.get("view") === "players" ? "players" : "teams"}
      initialTeamA={searchParams.get("teamA")}
      initialTeamB={searchParams.get("teamB")}
      initialPlayerA={searchParams.get("playerA")}
      initialPlayerB={searchParams.get("playerB")}
      initialGame={searchParams.get("game")}
    />
  );
}
