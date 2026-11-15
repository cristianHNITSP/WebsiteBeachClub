"use client";;
import { ArrowRightIcon, CalendarRangeIcon, CheckIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useId, useMemo, useState } from "react";
import { Button } from "@/components/coss/button";
import { Calendar } from "@/components/coss/calendar";
import { Switch } from "@/components/coss/switch";
import { cn } from "@/lib/utils";

const DAY = 86_400_000;
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const addMonths = (d, n) => new Date(d.getFullYear(), d.getMonth() + n, 1);
const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0);
const sameDay = (a, b) => !!a && !!b && a.getTime() === b.getTime();
const daysBetween = (a, b) => Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / DAY) + 1;

export const defaultPresets = [
  { label: "Today", range: (t) => ({ from: t, to: t }) },
  { label: "Yesterday", range: (t) => ({ from: addDays(t, -1), to: addDays(t, -1) }) },
  { label: "Last 7 days", range: (t) => ({ from: addDays(t, -6), to: t }) },
  { label: "Last 30 days", range: (t) => ({ from: addDays(t, -29), to: t }) },
  { label: "This month", range: (t) => ({ from: startOfMonth(t), to: t }) },
  { label: "Last month", range: (t) => ({ from: addMonths(t, -1), to: endOfMonth(addMonths(t, -1)) }) },
  {
    label: "Quarter to date",
    range: (t) => ({ from: new Date(t.getFullYear(), Math.floor(t.getMonth() / 3) * 3, 1), to: t }),
  },
  { label: "Year to date", range: (t) => ({ from: new Date(t.getFullYear(), 0, 1), to: t }) },
];

export function previousPeriod(range) {
  const length = daysBetween(range.from, range.to);
  return { from: addDays(range.from, -length), to: addDays(range.from, -1) };
}

const fmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
const fmtYear = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });
function formatRange(r) {
  if (!r.from) return "Pick a start date";
  if (!r.to) return `${fmt.format(r.from)} – …`;
  if (sameDay(r.from, r.to)) return fmtYear.format(r.from);
  const sameYear = r.from.getFullYear() === r.to.getFullYear();
  return `${(sameYear ? fmt : fmtYear).format(r.from)} – ${fmtYear.format(r.to)}`;
}

export function RangeCalendar({
  defaultValue,
  presets = defaultPresets,
  disableFuture = true,
  defaultCompare = false,
  onApply,
  onCancel,
  today: todayProp,
  className
}) {
  const today = useMemo(() => startOfDay(todayProp ?? new Date()), [todayProp]);
  const initial = defaultValue ?? presets[2]?.range(today) ?? { from: addDays(today, -6), to: today };
  const [range, setRange] = useState(initial);
  const [hover, setHover] = useState();
  const [month, setMonth] = useState(() => addMonths(initial.to, -1));
  const [compare, setCompare] = useState(defaultCompare);
  const [applied, setApplied] = useState(false);
  const reduce = useReducedMotion();
  const compareId = useId();

  const activePreset = presets.findIndex((p) => {
    const r = p.range(today);
    return sameDay(r.from, range.from) && sameDay(r.to, range.to);
  });

  const choosePreset = (index) => {
    const r = presets[index].range(today);
    setRange(r);
    setHover(undefined);
    setApplied(false);
    setMonth(addMonths(r.to, -1));
  };

  const pick = (day) => {
    setApplied(false);
    setRange((r) => {
      if (!r.from || r.to) return { from: day, to: undefined };
      return day < r.from ? { from: day, to: r.from } : { from: r.from, to: day };
    });
  };

  const preview = range.from && !range.to && hover ? (hover < range.from ? { from: hover, to: range.from } : { from: range.from, to: hover }) : undefined;
  const complete = range.from && range.to ? (range) : undefined;
  const comparison = compare && complete ? previousPeriod(complete) : undefined;
  const shown = preview ?? range;
  const length = shown.from && shown.to ? daysBetween(shown.from, shown.to) : shown.from ? 1 : 0;

  const onPresetKey = (event, index) => {
    const next = event.key === "ArrowDown" ? index + 1 : event.key === "ArrowUp" ? index - 1 : null;
    if (next === null) return;
    event.preventDefault();
    const target = (next + presets.length) % presets.length;
    choosePreset(target);
    event.currentTarget.parentElement?.querySelectorAll("button")[target]?.focus();
  };

  return (
    <div className={cn("w-full max-w-160 overflow-hidden rounded-2xl border bg-card shadow-xs/5", className)}>
      <div className="flex flex-col sm:flex-row">
        <div
          aria-label="Presets"
          className="relative flex gap-1 overflow-x-auto border-b p-2 sm:w-40 sm:shrink-0 sm:flex-col sm:overflow-visible sm:border-e sm:border-b-0"
          role="listbox"
        >
          {presets.map((preset, i) => {
            const active = i === activePreset;
            return (
              <button
                aria-selected={active}
                className={cn(
                  "relative shrink-0 cursor-pointer whitespace-nowrap rounded-lg px-2.5 py-1.5 text-start text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                  active ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
                key={preset.label}
                onClick={() => choosePreset(i)}
                onKeyDown={(e) => onPresetKey(e, i)}
                role="option"
                tabIndex={active || (activePreset === -1 && i === 0) ? 0 : -1}
                type="button"
              >
                {active && (
                  <motion.span
                    className="absolute inset-0 -z-0 rounded-lg bg-accent"
                    layoutId={`${compareId}-preset`}
                    transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 36 }}
                  />
                )}
                <span className="relative">{preset.label}</span>
              </button>
            );
          })}
        </div>

        <div className="min-w-0 flex-1 p-3">
          <Calendar
            className="mx-auto [--cell-size:--spacing(8)] sm:[--cell-size:--spacing(8)]"
            classNames={{ day_button: "in-data-outside:text-muted-foreground", weekday: "text-muted-foreground" }}
            disabled={disableFuture ? { after: today } : undefined}
            mode="range"
            modifiers={{
              preview: preview ? { from: preview.from, to: preview.to } : [],
              previewEnd: preview ? [preview.from, preview.to].filter((d) => !sameDay(d, range.from)) : [],
              compare: comparison ? { from: comparison.from, to: comparison.to } : [],
              compareStart: comparison ? comparison.from : [],
              compareEnd: comparison ? comparison.to : [],
            }}
            modifiersClassNames={{
              preview:
                "[&:not([data-selected]):not([data-outside])>button]:rounded-none [&:not([data-selected]):not([data-outside])>button]:bg-accent",
              previewEnd:
                "[&>button]:rounded-lg! [&>button]:bg-transparent! [&>button]:ring-2 [&>button]:ring-ring [&>button]:ring-inset",
              compare: "[&:not([data-selected]):not([data-outside])>button]:rounded-none [&:not([data-selected]):not([data-outside])>button]:bg-info/16",
              compareStart: "[&:not([data-selected]):not([data-outside])>button]:rounded-s-lg!",
              compareEnd: "[&:not([data-selected]):not([data-outside])>button]:rounded-e-lg!",
            }}
            month={month}
            numberOfMonths={2}
            onDayMouseEnter={(day) => setHover(day)}
            onDayMouseLeave={() => setHover(undefined)}
            onDayFocus={(day) => setHover(day)}
            onMonthChange={setMonth}
            onSelect={(_, day) => pick(day)}
            selected={range.from ? { from: range.from, to: range.to } : undefined}
          />
        </div>
      </div>

      <div className="grid gap-3 border-t p-3 sm:flex sm:items-center sm:justify-between">
        <div className="grid min-w-0 gap-1">
          <div className="flex items-center gap-2 text-sm">
            <CalendarRangeIcon className="size-4 shrink-0 text-muted-foreground" />
            <span className={cn("truncate font-medium tabular-nums transition-colors", preview && "text-muted-foreground")}>
              {formatRange(shown)}
            </span>
            {length > 0 && (
              <span className="shrink-0 rounded-full bg-muted px-1.5 py-px font-mono text-[11px] text-muted-foreground tabular-nums">
                {length}d
              </span>
            )}
          </div>
          <label className="flex items-center gap-2 text-muted-foreground text-xs" htmlFor={compareId}>
            <Switch checked={compare} id={compareId} onCheckedChange={setCompare} />
            <span>Compare to previous period</span>
            <AnimatePresence initial={false}>
              {comparison && (
                <motion.span
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-1 whitespace-nowrap font-medium text-foreground tabular-nums"
                  exit={{ opacity: 0, x: -6, transition: { duration: 0.12 } }}
                  initial={reduce ? { opacity: 0 } : { opacity: 0, x: -6 }}
                  transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                >
                  <span aria-hidden className="size-2 rounded-full bg-info" />
                  {formatRange(comparison)}
                </motion.span>
              )}
            </AnimatePresence>
          </label>
        </div>
        <div className="flex shrink-0 justify-end gap-2">
          <Button onClick={onCancel} size="sm" variant="ghost">
            Cancel
          </Button>
          <Button
            disabled={!complete}
            onClick={() => {
              if (!complete) return;
              setApplied(true);
              onApply?.(complete, comparison ?? null);
            }}
            className="min-w-24"
            size="sm"
          >
            {applied ? <CheckIcon /> : null}
            {applied ? "Applied" : "Apply"}
            {!applied && <ArrowRightIcon />}
          </Button>
        </div>
      </div>
    </div>
  );
}
