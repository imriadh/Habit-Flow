import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "../store";
import { Icon } from "../components/icons";
import { Reveal, Ring } from "../components/ui";
import { WEEKDAYS_LONG } from "../lib/dates";
import { coachReply, weeklyReview } from "../lib/stats";

interface Msg {
  role: "user" | "coach";
  text: string;
}

const SUGGESTIONS = [
  "How was my week?",
  "Why am I losing consistency?",
  "What should I improve?",
  "Suggest new habits",
];

export function Coach() {
  const { state } = useStore();
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "coach",
      text: `Hi ${state.profile.name.split(" ")[0]} — I'm your habit coach. I analyze your tracking data right here in the browser (nothing is uploaded) and turn it into plain advice.\n\nAsk me anything about your habits, or tap a suggestion below.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const name = state.profile.name.split(" ")[0];

  const review = useMemo(() => weeklyReview(state), [state]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, typing]);

  const send = (raw?: string) => {
    const text = (raw ?? input).trim();
    if (!text || typing) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text }]);
    setTyping(true);
    window.setTimeout(() => {
      setMessages((m) => [...m, { role: "coach", text: coachReply(state, text) }]);
      setTyping(false);
    }, 750 + Math.random() * 550);
  };

  return (
    <div className="space-y-5">
      <Reveal>
        <div className="flex flex-wrap items-center gap-3">
          <span className="tile !h-11 !w-11 !rounded-xl" style={{ background: "var(--gold-soft)", color: "var(--gold-deep)" }}>
            <Icon name="spark" size={22} />
          </span>
          <div>
            <h2 className="disp text-2xl font-extrabold tracking-tight sm:text-3xl">AI Coach</h2>
            <p className="mt-0.5 text-sm font-medium text-[var(--mut)]">
              Personal insights from your own data — private, on-device, always honest.
            </p>
          </div>
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-[var(--leaf-soft)] px-3 py-1 text-[11px] font-bold text-[var(--leaf-deep)]">
            <Icon name="check" size={12} sw={2.6} /> 100% on-device
          </span>
        </div>
      </Reveal>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <Reveal delay={70}>
          <section className="card flex flex-col overflow-hidden" aria-label="Coach chat">
            <div ref={scrollRef} className="h-[52vh] min-h-[380px] space-y-4 overflow-y-auto px-5 py-5">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`flex max-w-[85%] items-start gap-2.5 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                    {m.role === "coach" && (
                      <span className="tile mt-0.5 !h-8 !w-8 !rounded-lg" style={{ background: "var(--gold-soft)", color: "var(--gold-deep)" }}>
                        <Icon name="spark" size={15} />
                      </span>
                    )}
                    <div
                      className={`px-4 py-3 text-[14px] font-medium leading-relaxed whitespace-pre-line ${
                        m.role === "user" ? "msg-u" : "msg-a"
                      }`}
                    >
                      {m.text}
                    </div>
                  </div>
                </div>
              ))}
              {typing && (
                <div className="flex items-center gap-2.5">
                  <span className="tile !h-8 !w-8 !rounded-lg" style={{ background: "var(--gold-soft)", color: "var(--gold-deep)" }}>
                    <Icon name="spark" size={15} />
                  </span>
                  <div className="msg-a flex items-center gap-1.5 px-4 py-3.5">
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-[var(--line)] bg-[var(--surface2)] px-4 py-3.5">
              <div className="mb-2.5 flex flex-wrap gap-1.5">
                {SUGGESTIONS.map((s) => (
                  <button key={s} className="chip !text-[12px]" onClick={() => send(s)} disabled={typing}>
                    <Icon name="spark" size={11} />
                    {s}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  className="input flex-1"
                  placeholder={`Ask about your habits, ${name}…`}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send()}
                  aria-label="Ask the coach"
                />
                <button className="btn btn-primary !px-3.5" onClick={() => send()} aria-label="Send message" disabled={typing}>
                  <Icon name="send" size={17} />
                </button>
              </div>
            </div>
          </section>
        </Reveal>

        <div className="space-y-5">
          <Reveal delay={130}>
            <section className="card p-5" aria-label="Weekly review">
              <p className="tag">This week's review</p>
              <div className="mt-3 flex items-center gap-4">
                <Ring value={review.rate ?? 0} size={86} stroke={9} color="var(--gold)">
                  <span className="num text-lg">{review.rate === null ? "—" : `${Math.round(review.rate * 100)}%`}</span>
                </Ring>
                <div className="text-[13px] font-semibold text-[var(--ink2)]">
                  <p>
                    {review.done} of {review.scheduled} check-ins
                  </p>
                  {review.delta !== null && (
                    <p className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${review.delta >= 0 ? "bg-[var(--leaf-soft)] text-[var(--leaf-deep)]" : "bg-[var(--coral-soft)] text-[var(--coral-deep)]"}`}>
                      <Icon name={review.delta >= 0 ? "chevR" : "chevD"} size={11} sw={2.4} />
                      {Math.abs(Math.round(review.delta * 100))} pts vs last week
                    </p>
                  )}
                </div>
              </div>
              <dl className="mt-4 space-y-2 text-[13px]">
                {[
                  ["Strongest habit", review.strongest?.name ?? "—"],
                  ["Needs attention", review.weakest?.name ?? "—"],
                  ["Best day", review.bestDay !== null ? WEEKDAYS_LONG[review.bestDay] : "—"],
                  ["Weakest day", review.worstDay !== null ? WEEKDAYS_LONG[review.worstDay] : "—"],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between gap-3 border-b border-[var(--line)] pb-2 last:border-b-0 last:pb-0">
                    <dt className="font-semibold text-[var(--mut)]">{k}</dt>
                    <dd className="font-bold">{v}</dd>
                  </div>
                ))}
              </dl>
              <button className="btn btn-ghost mt-4 w-full !text-[13px]" onClick={() => send("How was my week? Give me the full review.")}>
                <Icon name="spark" size={15} /> Discuss this with the coach
              </button>
            </section>
          </Reveal>

          <Reveal delay={190}>
            <section className="card p-5" aria-label="Privacy note">
              <p className="tag mb-2">How it works</p>
              <ul className="space-y-2.5 text-[13px] font-medium text-[var(--ink2)]">
                {[
                  ["search", "The coach scans your logs for patterns — weekday vs weekend, 7-day slides, weak days."],
                  ["leaf", "Everything runs in your browser. No data is sent to any server."],
                  ["user", "It advises; you decide. Suggestions never change your habits automatically."],
                ].map(([ic, txt]) => (
                  <li key={ic} className="flex items-start gap-2.5">
                    <span className="tile mt-0.5 !h-7 !w-7 !rounded-lg" style={{ background: "var(--teal-soft)", color: "var(--teal-deep)" }}>
                      <Icon name={ic} size={13} />
                    </span>
                    {txt}
                  </li>
                ))}
              </ul>
            </section>
          </Reveal>
        </div>
      </div>
    </div>
  );
}
