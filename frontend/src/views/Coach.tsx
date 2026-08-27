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
    <div className="stack-l">
      <Reveal>
        <div className="row wrap">
          <span className="tile tile-l" style={{ background: "var(--gold-soft)", color: "var(--gold-deep)", width: 46, height: 46 }}>
            <Icon name="spark" size={22} />
          </span>
          <div className="grow">
            <h2 className="h1">AI Coach</h2>
            <p className="txt-s muted mt-s">
              Personal insights from your own data — private, on-device, always honest.
            </p>
          </div>
          <span className="badge" style={{ background: "var(--leaf-soft)", color: "var(--leaf-deep)" }}>
            <Icon name="check" size={12} sw={2.6} /> 100% on-device
          </span>
        </div>
      </Reveal>

      <div className="split">
        <Reveal delay={70}>
          <section className="card chat-card" aria-label="Coach chat">
            <div ref={scrollRef} className="chat-scroll">
              {messages.map((m, i) => (
                <div key={i} className={`chat-line ${m.role === "user" ? "user" : ""}`}>
                  {m.role === "coach" && (
                    <span className="tile tile-s" style={{ background: "var(--gold-soft)", color: "var(--gold-deep)", marginTop: 2 }}>
                      <Icon name="spark" size={15} />
                    </span>
                  )}
                  <div className={m.role === "user" ? "msg-u" : "msg-a"}>{m.text}</div>
                </div>
              ))}
              {typing && (
                <div className="chat-line">
                  <span className="tile tile-s" style={{ background: "var(--gold-soft)", color: "var(--gold-deep)", marginTop: 2 }}>
                    <Icon name="spark" size={15} />
                  </span>
                  <div className="msg-a typing-dots">
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                  </div>
                </div>
              )}
            </div>

            <div className="chat-input-bar">
              <div className="row-xs wrap mb-s">
                {SUGGESTIONS.map((s) => (
                  <button key={s} className="chip" onClick={() => send(s)} disabled={typing}>
                    <Icon name="spark" size={11} />
                    {s}
                  </button>
                ))}
              </div>
              <div className="row-s">
                <input
                  className="input grow"
                  placeholder={`Ask about your habits, ${name}…`}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send()}
                  aria-label="Ask the coach"
                />
                <button className="btn btn-primary" style={{ padding: "9px 14px" }} onClick={() => send()} aria-label="Send message" disabled={typing}>
                  <Icon name="send" size={17} />
                </button>
              </div>
            </div>
          </section>
        </Reveal>

        <div className="stack">
          <Reveal delay={130}>
            <section className="card pad-l" aria-label="Weekly review">
              <p className="tag">This week's review</p>
              <div className="row mt-m" style={{ gap: 16 }}>
                <Ring value={review.rate ?? 0} size={86} stroke={9} color="var(--gold)">
                  <span className="num" style={{ fontSize: 17 }}>{review.rate === null ? "—" : `${Math.round(review.rate * 100)}%`}</span>
                </Ring>
                <div className="txt-s bold soft">
                  <p>{review.done} of {review.scheduled} check-ins</p>
                  {review.delta !== null && (
                    <span
                      className="badge mt-s"
                      style={{
                        background: review.delta >= 0 ? "var(--leaf-soft)" : "var(--coral-soft)",
                        color: review.delta >= 0 ? "var(--leaf-deep)" : "var(--coral-deep)",
                      }}
                    >
                      <Icon name={review.delta >= 0 ? "chevR" : "chevD"} size={11} sw={2.4} />
                      {Math.abs(Math.round(review.delta * 100))} pts vs last week
                    </span>
                  )}
                </div>
              </div>
              <div className="stack-s mt-m">
                {[
                  ["Strongest habit", review.strongest?.name ?? "—"],
                  ["Needs attention", review.weakest?.name ?? "—"],
                  ["Best day", review.bestDay !== null ? WEEKDAYS_LONG[review.bestDay] : "—"],
                  ["Weakest day", review.worstDay !== null ? WEEKDAYS_LONG[review.worstDay] : "—"],
                ].map(([k, v]) => (
                  <div key={k} className="row spread" style={{ borderBottom: "1px solid var(--line)", paddingBottom: 8 }}>
                    <span className="txt-s bold muted">{k}</span>
                    <span className="txt-s heavy">{v}</span>
                  </div>
                ))}
              </div>
              <button className="btn btn-ghost btn-s w-full mt-m" onClick={() => send("How was my week? Give me the full review.")}>
                <Icon name="spark" size={14} /> Discuss this with the coach
              </button>
            </section>
          </Reveal>

          <Reveal delay={190}>
            <section className="card pad-l" aria-label="Privacy note">
              <p className="tag mb-s">How it works</p>
              <div className="stack-s">
                {[
                  ["search", "The coach scans your logs for patterns — weekday vs weekend, 7-day slides, weak days."],
                  ["leaf", "Everything runs in your browser. No data is sent to any server."],
                  ["user", "It advises; you decide. Suggestions never change your habits automatically."],
                ].map(([ic, txt]) => (
                  <div key={ic} className="row-s top">
                    <span className="tile tile-s" style={{ background: "var(--teal-soft)", color: "var(--teal-deep)", marginTop: 2 }}>
                      <Icon name={ic} size={13} />
                    </span>
                    <p className="txt-s soft">{txt}</p>
                  </div>
                ))}
              </div>
            </section>
          </Reveal>
        </div>
      </div>
    </div>
  );
}
