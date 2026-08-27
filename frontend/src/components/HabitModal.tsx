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

  const cc = HABIT_COLORS[color];

  return (
    <Modal open={open} onClose={onClose} title={initial ? "Edit habit" : "New habit"} wide>
      <div className="stack-l">
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
          <label className="label" htmlFor="hf-desc">
            Description <span className="label-note">— optional</span>
          </label>
          <textarea
            id="hf-desc"
            className="input"
            placeholder="Why does this habit matter to you?"
            value={description}
            maxLength={160}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div>
          <span className="label">Category</span>
          <div className="row-xs wrap">
            {(Object.keys(CATEGORIES) as CategoryId[]).map((c) => (
              <button
                key={c}
                type="button"
                className="chip"
                style={
                  category === c
                    ? { background: CATEGORIES[c].soft, color: CATEGORIES[c].deep, borderColor: "transparent", padding: "8px 12px" }
                    : { padding: "8px 12px" }
                }
                aria-pressed={category === c}
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

        <div className="grid-2">
          <div>
            <span className="label">Icon</span>
            <div className="icon-grid">
              {HABIT_ICONS.map((ic) => (
                <button
                  key={ic}
                  type="button"
                  className="icon-cell"
                  style={{
                    borderColor: icon === ic ? cc.base : "var(--line)",
                    background: icon === ic ? cc.soft : "var(--surface)",
                    color: icon === ic ? cc.deep : "var(--mut)",
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
            <div className="row-s wrap pt-m">
              {Object.entries(HABIT_COLORS).map(([k, c]) => (
                <button
                  key={k}
                  type="button"
                  className="swatch"
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
          <div className="row-xs wrap">
            {DAY_ORDER.map((d) => {
              const on = weekdays.includes(d);
              return (
                <button
                  key={d}
                  type="button"
                  className="day-btn"
                  style={{
                    borderColor: on ? cc.base : "var(--line)",
                    background: on ? cc.soft : "var(--surface)",
                    color: on ? cc.deep : "var(--mut)",
                  }}
                  onClick={() => setWeekdays((w) => (on ? w.filter((x) => x !== d) : [...w, d]))}
                  aria-pressed={on}
                >
                  {DAY_LABEL[d]}
                </button>
              );
            })}
          </div>
          <p className="txt-xs muted mt-s">
            {weekdays.length === 7 ? "Every day — the classic streak builder." : `${weekdays.length} day${weekdays.length === 1 ? "" : "s"} per week.`}
          </p>
        </div>

        <div className="goal-box">
          <div className="row spread">
            <div>
              <p className="txt-s bold">Measurable target</p>
              <p className="txt-xs muted">Track a number instead of a checkbox — e.g. 8 glasses of water.</p>
            </div>
            <Toggle checked={goalOn} onChange={setGoalOn} label="Measurable target" />
          </div>
          {goalOn && (
            <div className="row-s mt-s">
              <input
                className="input"
                style={{ width: 96 }}
                type="number"
                min="1"
                value={goalValue}
                onChange={(e) => setGoalValue(e.target.value)}
                aria-label="Target value"
              />
              <input
                className="input grow"
                placeholder="unit — glasses, minutes, pages…"
                value={goalUnit}
                maxLength={20}
                onChange={(e) => setGoalUnit(e.target.value)}
                aria-label="Target unit"
              />
            </div>
          )}
        </div>

        <div className="grid-2">
          <div>
            <label className="label" htmlFor="hf-rem">
              Reminder time <span className="label-note">— optional</span>
            </label>
            <input id="hf-rem" className="input" type="time" value={reminder} onChange={(e) => setReminder(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="hf-start">Start date</label>
            <input
              id="hf-start"
              className="input"
              type="date"
              value={startDate}
              max={dkey(today())}
              onChange={(e) => e.target.value && setStartDate(e.target.value)}
            />
          </div>
        </div>

        {err && (
          <p className="form-err">
            <Icon name="alert" size={15} /> {err}
          </p>
        )}

        <div className="modal-foot">
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
