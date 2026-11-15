"use client";;
import { ChevronRightIcon, EllipsisIcon, FolderIcon, PencilIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useLayoutEffect, useRef, useState } from "react";
import { Menu, MenuItem, MenuPopup, MenuTrigger } from "@/components/coss/menu";
import { cn } from "@/lib/utils";

const SEP = 20;
const MORE = 28;

export function OverflowBreadcrumb({
  segments,
  onNavigate,
  onRename,
  maxCurrentWidth = 200,
  className
}) {
  const reduce = useReducedMotion();
  const navRef = useRef(null);
  const measureRef = useRef(null);
  const [width, setWidth] = useState(0);
  const [sizes, setSizes] = useState([]);
  const [editing, setEditing] = useState(false);

  useLayoutEffect(() => {
    const el = navRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  // Measure every crumb once, offstage, so collapsing never depends on what is currently shown.
  useLayoutEffect(() => {
    const row = measureRef.current;
    if (!row) return;
    setSizes(Array.from(row.children, (c) => (c).offsetWidth));
  }, [segments.map((s) => s.label).join("\u0000")]);

  const n = segments.length;
  const lastIndex = n - 1;
  let shown = segments.map((_, i) => i);
  if (sizes.length === n && width > 0 && n > 2) {
    const current = Math.min(sizes[lastIndex], maxCurrentWidth) + (onRename ? 18 : 0);
    const all = current + sizes.slice(0, lastIndex).reduce((a, b) => a + b + SEP, 0);
    if (all > width) {
      let budget = width - current - MORE - SEP;
      const keep = new Set([lastIndex]);
      if (sizes[0] + SEP <= budget) {
        keep.add(0);
        budget -= sizes[0] + SEP;
      }
      for (let i = lastIndex - 1; i >= 1; i--) {
        if (sizes[i] + SEP > budget) break;
        keep.add(i);
        budget -= sizes[i] + SEP;
      }
      shown = [...keep].sort((a, b) => a - b);
    }
  }
  const hidden = segments.map((_, i) => i).filter((i) => i !== lastIndex && !shown.includes(i));
  const moreAt = hidden.length ? (shown[0] === 0 ? 1 : 0) : -1;

  const slots = shown.map((i) => ({ key: segments[i].id, kind: "crumb", index: i }));
  if (moreAt >= 0) slots.splice(moreAt, 0, { key: "__more", kind: "more" });

  const ease = [0.23, 1, 0.32, 1];
  const item = {
    layout: reduce ? false : ("position"),
    initial: reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.96, transition: { duration: 0.1 } },
    transition: { duration: 0.18, ease },
  };

  return (
    <nav aria-label="Ruta" className={cn("relative min-w-0", className)} ref={navRef}>
      <div aria-hidden className="pointer-events-none invisible absolute inset-x-0 top-0 h-0 overflow-hidden">
        <div className="flex w-max whitespace-nowrap" ref={measureRef}>
          {segments.map((s) => (
            <span className="flex h-7 items-center gap-1.5 px-1.5 font-medium text-sm [&_svg]:size-4" key={s.id}>
              {s.icon}
              {s.label}
            </span>
          ))}
        </div>
      </div>
      <ol className="flex min-w-0 items-center">
        <AnimatePresence initial={false} mode="popLayout">
          {slots.map((slot, k) => {
            const sep = k > 0 && (
              <ChevronRightIcon aria-hidden className="mx-0.5 size-4 shrink-0 text-muted-foreground/60" />
            );
            if (slot.kind === "more") {
              return (
                <motion.li className="flex shrink-0 items-center" key={slot.key} {...item}>
                  {sep}
                  <Menu>
                    <MenuTrigger
                      aria-label={`Ver ${hidden.length} más`}
                      className="relative flex h-7 w-7 cursor-pointer items-center justify-center rounded-md before:absolute before:-inset-y-1 before:inset-x-0 text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring data-popup-open:bg-accent data-popup-open:text-foreground"
                    >
                      <EllipsisIcon className="size-4" />
                    </MenuTrigger>
                    <MenuPopup
                      align="start"
                      className="min-w-48 transition-[scale,opacity] duration-150 ease-out data-ending-style:opacity-0 data-starting-style:scale-[0.96] data-starting-style:opacity-0"
                      sideOffset={6}
                    >
                      {hidden.map((i, depth) => (
                        <MenuItem key={segments[i].id} onClick={() => onNavigate?.(segments[i], i)}>
                          <span className="flex items-center gap-2" style={{ paddingInlineStart: depth * 10 }}>
                            {segments[i].icon ?? <FolderIcon className="size-4 text-muted-foreground" />}
                            {segments[i].label}
                          </span>
                        </MenuItem>
                      ))}
                    </MenuPopup>
                  </Menu>
                </motion.li>
              );
            }
            const s = segments[slot.index];
            const isLast = slot.index === lastIndex;
            return (
              <motion.li className={cn("flex items-center", isLast ? "min-w-0" : "shrink-0")} key={slot.key} {...item}>
                {sep}
                {isLast ? (
                  <CurrentCrumb
                    crumb={s}
                    editing={editing}
                    maxWidth={maxCurrentWidth}
                    onEdit={onRename ? setEditing : undefined}
                    onRename={(label) => {
                      setEditing(false);
                      if (label && label !== s.label) onRename?.(label);
                    }}
                  />
                ) : (
                  <button
                    className="relative flex h-7 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-md px-1.5 before:absolute before:-inset-y-1 before:inset-x-0 font-medium text-muted-foreground text-sm outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring [&_svg]:size-4"
                    onClick={() => onNavigate?.(s, slot.index)}
                    type="button"
                  >
                    {s.icon}
                    {s.label}
                  </button>
                )}
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ol>
    </nav>
  );
}

function CurrentCrumb({
  crumb,
  editing,
  maxWidth,
  onEdit,
  onRename
}) {
  const inputRef = useRef(null);
  const buttonRef = useRef(null);
  const [draft, setDraft] = useState(crumb.label);
  const cancelled = useRef(false);

  useLayoutEffect(() => {
    if (editing) {
      setDraft(crumb.label);
      cancelled.current = false;
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing, crumb.label]);

  const finish = (commit) => {
    cancelled.current = true;
    onRename(commit ? draft.trim() : crumb.label);
    requestAnimationFrame(() => buttonRef.current?.focus());
  };

  const onKey = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      finish(true);
    } else if (event.key === "Escape") {
      event.preventDefault();
      finish(false);
    }
  };

  if (editing) {
    return (
      <input
        aria-label="Page name"
        className="h-7 min-w-16 rounded-md border bg-background px-1.5 font-medium text-foreground text-sm outline-none ring-ring/30 [field-sizing:content] focus:border-ring focus:ring-3"
        maxLength={60}
        onBlur={() => !cancelled.current && finish(true)}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKey}
        ref={inputRef}
        style={{ maxWidth }}
        value={draft}
      />
    );
  }

  const content = (
    <>
      {crumb.icon}
      <span className="truncate">{crumb.label}</span>
    </>
  );

  if (!onEdit) {
    return (
      <span aria-current="page" className="flex h-7 min-w-0 items-center gap-1.5 px-1.5 font-medium text-foreground text-sm [&_svg]:size-4" style={{ maxWidth }}>
        {content}
      </span>
    );
  }

  return (
    <button
      aria-current="page"
      aria-label={`${crumb.label}, rename`}
      className="group/cur relative flex h-7 min-w-0 cursor-text before:absolute before:-inset-y-1 before:inset-x-0 items-center gap-1.5 rounded-md px-1.5 font-medium text-foreground text-sm outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring [&_svg]:size-4"
      onClick={() => onEdit(true)}
      ref={buttonRef}
      style={{ maxWidth: maxWidth + 22 }}
      title="Rename"
      type="button"
    >
      {content}
      <PencilIcon className="size-3! shrink-0 text-muted-foreground opacity-0 transition-opacity duration-150 group-hover/cur:opacity-100 group-focus-visible/cur:opacity-100" />
    </button>
  );
}
