import { useEffect, useState } from "react";
import type { CategoryId, Habit } from "../types";
import { CATEGORIES, HABIT_COLORS, HABIT_ICONS } from "../types";
import { useStore } from "../store";
import { Icon } from "./icons";
import { Modal, Toggle, useToast } from "./ui";
import { dkey, today } from "../lib/dates";

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const DAY_LABEL: Record<number, string> = { 0: "Sun", 1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu", 5: "Fri", 6: "Sat" };

export function HabitModal({
  open,
  initial,
  onClose,
}: {
  open: boolean;
  initial: Habit | null;
  onClose: () => void;
}) {
  const { addHabit, updateHabit } = useStore();
  const toast = useToast();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<CategoryId>("health");
  const [icon, setIcon] = useState<string>("leaf");
  const [color, setColor] = useState("leaf");
  const [weekdays, setWeekdays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [goalOn, setGoalOn] = useState(false);
  const [goalValue, setGoalValue] = useState("8");
  const [goalUnit, setGoalUnit] = useState("glasses");
  const [reminder, setReminder] = useState("");
  const [startDate, setStartDate] = useState(dkey(today()));
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!open) return;
    setErr("");
    if (initial) {
      setName(initial.name);
      setDescription(initial.description ?? "");
      setCategory(initial.category);
      setIcon(initial.icon);
      setColor(initial.color);
      setWeekdays([...initial.weekdays]);
      setGoalOn(!!initial.goal);
      setGoalValue(String(initial.goal?.value ?? 8));
      setGoalUnit(initial.goal?.unit ?? "glasses");
      setReminder(initial.reminder ?? "");
      setStartDate(initial.startDate);
    } else {
      setName("");
      setDescription("");
      setCategory("health");
      setIcon("leaf");
      setColor("leaf");
      setWeekdays([0, 1, 2, 3, 4, 5, 6]);
      setGoalOn(false);
      setGoalValue("8");
      setGoalUnit("glasses");
      setReminder("");
      setStartDate(dkey(today()));
    }
  }, [open, initial]);

  const save = () => {
    if (!name.trim()) return setErr("Give your habit a name — even a tiny one.");
    if (weekdays.length === 0) return setErr("Pick at least one day for this habit.");
    const gv = Number(goalValue);
    if (goalOn && (!Number.isFinite(gv) || gv <= 0)) return setErr("The target must be a positive number.");
    const payload = {
      name: name.trim(),
      description: description.trim() || undefined,
      category,
      icon,
      color,
      weekdays: [...weekdays].sort(),
      goal: goalOn ? { value: gv, unit: goalUnit.trim() || "times" } : undefined,
      reminder: reminder || undefined,
      startDate,
    };
    if (initial) {
      updateHabit(initial.id, payload);
      toast(`“${payload.name}” updated.`, "ok");
    } else {
      addHabit(payload);
      toast(`“${payload.name}” planted. First check-in today!`, "ok");
    }
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={initial ? "Edit habit" : "New habit"} wide>
      <div className="space-y-5">
        <div>
          <label className="label" htmlFor="hf-name">Name</label>
          <input
            id="hf-name"
            className="input"
            placeholder="e.g. Study Programming"
            value={name}
            maxLength={48}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </div>

        <div>
          <label className="label" htmlFor="hf-desc">Description <span className="normal-case font-medium text-[var(--mut)]">(optional)</span></label>
          <textarea
            id="hf-desc"
            className="input min-h-[64px] resize-y"
            placeholder="Why does this habit matter to you?"
            value={description}
            maxLength={160}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div>
          <span className="label">Category</span>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(CATEGORIES) as CategoryId[]).map((c) => (
              <button
                key={c}
                type="button"
                className={`chip !px-3 !py-2 ${category === c ? "!border-transparent" : ""}`}
                style={category === c ? { background: CATEGORIES[c].soft, color: CATEGORIES[c].deep, borderColor: "transparent" } : undefined}
                onClick={() => {
                  setCategory(c);
                  setIcon(CATEGORIES[c].icon);
                }}
              >
                <Icon name={CATEGORIES[c].icon} size={14} />
                {CATEGORIES[c].label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <span className="label">Icon</span>
            <div className="grid grid-cols-6 gap-1.5">
              {HABIT_ICONS.map((ic) => (
                <button
                  key={ic}
                  type="button"
                  className="grid h-10 place-items-center rounded-lg border transition-all"
                  style={{
                    borderColor: icon === ic ? HABIT_COLORS[color].base : "var(--line)",
                    background: icon === ic ? HABIT_COLORS[color].soft : "var(--surface)",
                    color: icon === ic ? HABIT_COLORS[color].deep : "var(--mut)",
                  }}
                  onClick={() => setIcon(ic)}
                  aria-label={`Icon ${ic}`}
                  aria-pressed={icon === ic}
                >
                  <Icon name={ic} size={17} />
                </button>
              ))}
            </div>
          </div>
          <div>
            <span className="label">Color</span>
            <div className="flex flex-wrap gap-2 pt-1">
              {Object.entries(HABIT_COLORS).map(([k, c]) => (
                <button
                  key={k}
                  type="button"
                  className="grid h-9 w-9 place-items-center rounded-full text-white transition-transform hover:scale-110"
                  style={{ background: c.base, outline: color === k ? "2px solid var(--ink)" : "none", outlineOffset: 3 }}
                  onClick={() => setColor(k)}
                  aria-label={`Color ${c.label}`}
                  aria-pressed={color === k}
                >
                  {color === k && <Icon name="check" size={14} sw={2.6} />}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <span className="label">Schedule</span>
          <div className="flex flex-wrap gap-1.5">
            {DAY_ORDER.map((d) => {
              const on = weekdays.includes(d);
              return (
                <button
                  key={d}
                  type="button"
                  className="h-10 min-w-[52px] flex-1 rounded-lg border text-[13px] font-bold transition-all"
                  style={{
                    borderColor: on ? HABIT_COLORS[color].base : "var(--line)",
                    background: on ? HABIT_COLORS[color].soft : "var(--surface)",
                    color: on ? HABIT_COLORS[color].deep : "var(--mut)",
                  }}
                  onClick={() => setWeekdays((w) => (on ? w.filter((x) => x !== d) : [...w, d]))}
                  aria-pressed={on}
                >
                  {DAY_LABEL[d]}
                </button>
              );
            })}
          </div>
          <p className="mt-1.5 text-xs text-[var(--mut)]">
            {weekdays.length === 7 ? "Every day — the classic streak builder." : `${weekdays.length} day${weekdays.length === 1 ? "" : "s"} per week.`}
          </p>
        </div>

        <div className="rounded-xl border border-[var(--line)] bg-[var(--surface2)] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold">Measurable target</p>
              <p className="text-xs text-[var(--mut)]">Track a number instead of a checkbox — e.g. 8 glasses of water.</p>
            </div>
            <Toggle checked={goalOn} onChange={setGoalOn} label="Measurable target" />
          </div>
          {goalOn && (
            <div className="mt-3 flex gap-2">
              <input
                className="input !w-24"
                type="number"
                min="1"
                value={goalValue}
                onChange={(e) => setGoalValue(e.target.value)}
                aria-label="Target value"
              />
              <input
                className="input flex-1"
                placeholder="unit — glasses, minutes, pages…"
                value={goalUnit}
                maxLength={20}
                onChange={(e) => setGoalUnit(e.target.value)}
                aria-label="Target unit"
              />
            </div>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="hf-rem">Reminder time <span className="normal-case font-medium text-[var(--mut)]">(optional)</span></label>
            <input id="hf-rem" className="input" type="time" value={reminder} onChange={(e) => setReminder(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="hf-start">Start date</label>
            <input id="hf-start" className="input" type="date" value={startDate} max={dkey(today())} onChange={(e) => e.target.value && setStartDate(e.target.value)} />
          </div>
        </div>

        {err && (
          <p className="flex items-center gap-2 rounded-lg bg-[var(--coral-soft)] px-3 py-2 text-[13px] font-semibold text-[var(--coral-deep)]">
            <Icon name="alert" size={15} /> {err}
          </p>
        )}

        <div className="flex justify-end gap-2 border-t border-[var(--line)] pt-4">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save}>
            <Icon name={initial ? "check" : "plus"} size={16} sw={2.4} />
            {initial ? "Save changes" : "Create habit"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
