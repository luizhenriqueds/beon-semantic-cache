"use client";

import { useEffect, useRef, useState } from "react";
import type { Result } from "@/lib/answer";

type Message = { role: "user" | "assistant"; text: string; meta?: Result };
type Chat = { id: number; title: string; messages: Message[] };

const topics = [
  "Card delivery, activation and PINs",
  "Lost, stolen or blocked cards",
  "Transfers and top-ups",
  "Exchange rates and currencies",
  "Fees, limits and declined payments",
];

const samples = [
  "How do I reset my PIN?",
  "My card has not arrived yet",
  "Why was my transfer declined?",
  "What exchange rates do you use?",
];

const newChat = (id: number): Chat => ({ id, title: "New chat", messages: [] });

export default function Home() {
  const [chats, setChats] = useState<Chat[]>([newChat(1)]);
  const [activeId, setActiveId] = useState(1);
  const [menuOpen, setMenuOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const nextId = useRef(2);

  const active = chats.find((c) => c.id === activeId)!;

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [active.messages, loading]);

  const update = (id: number, fn: (c: Chat) => Chat) =>
    setChats((all) => all.map((c) => (c.id === id ? fn(c) : c)));

  function createChat() {
    const chat = newChat(nextId.current++);
    setChats((all) => [chat, ...all]);
    setActiveId(chat.id);
    setMenuOpen(false);
  }

  function deleteChat(id: number) {
    const rest = chats.filter((c) => c.id !== id);
    if (!rest.length) rest.push(newChat(nextId.current++));
    setChats(rest);
    if (id === activeId) setActiveId(rest[0].id);
  }

  async function send(text: string) {
    if (!text.trim() || loading) return;
    const id = activeId;
    update(id, (c) => ({
      ...c,
      title: c.messages.length ? c.title : text.slice(0, 40),
      messages: [...c.messages, { role: "user", text }],
    }));
    setInput("");
    setLoading(true);
    let reply: Message;
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: text }),
      });
      if (!res.ok) throw new Error();
      const meta: Result = await res.json();
      reply = { role: "assistant", text: meta.answer, meta };
    } catch {
      reply = {
        role: "assistant",
        text: "Sorry, something went wrong. Please try again.",
      };
    }
    update(id, (c) => ({ ...c, messages: [...c.messages, reply] }));
    setLoading(false);
  }

  return (
    <div className="flex h-dvh bg-white">
      <aside
        className={`${menuOpen ? "flex" : "hidden"} absolute inset-y-0 left-0 z-10 w-64 flex-col bg-slate-900 p-3 text-slate-200 md:static md:flex`}
      >
        <div className="flex items-center gap-2 px-2 py-3">
          <span className="grid size-8 place-items-center rounded-lg bg-indigo-500 font-bold text-white">
            N
          </span>
          <span className="font-semibold text-white">Nimbus Bank</span>
        </div>
        <button
          onClick={createChat}
          className="mt-2 rounded-lg border border-slate-700 px-3 py-2 text-left text-sm hover:bg-slate-800"
        >
          + New chat
        </button>
        <p className="mt-5 px-2 text-xs uppercase tracking-wide text-slate-500">Chats</p>
        <nav className="mt-2 space-y-1 overflow-y-auto">
          {chats.map((c) => (
            <div
              key={c.id}
              className={`group flex items-center rounded-lg text-sm ${
                c.id === activeId ? "bg-slate-800 text-white" : "hover:bg-slate-800/60"
              }`}
            >
              <button
                onClick={() => {
                  setActiveId(c.id);
                  setMenuOpen(false);
                }}
                className="min-w-0 flex-1 truncate px-3 py-2 text-left"
              >
                {c.title}
              </button>
              <button
                onClick={() => deleteChat(c.id)}
                aria-label={`Delete chat ${c.title}`}
                className="px-2 py-2 text-slate-500 hover:text-red-400 md:invisible md:group-hover:visible md:focus:visible"
              >
                ✕
              </button>
            </div>
          ))}
        </nav>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Toggle menu"
            className="rounded-md px-2 py-1 text-slate-600 hover:bg-slate-100 md:hidden"
          >
            ☰
          </button>
          <div>
            <h1 className="text-sm font-semibold">Nimbus Assistant</h1>
            <p className="text-xs text-slate-500">Typically answers in seconds</p>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto bg-slate-50 px-4 py-6">
          <div className="mx-auto max-w-2xl space-y-4">
            <Bubble role="assistant">
              <p className="font-medium">Hi, I&apos;m the Nimbus assistant 👋</p>
              <p className="mt-1">I can help with:</p>
              <ul className="mt-1 list-inside list-disc text-slate-600">
                {topics.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
              <p className="mt-3">Try one of these:</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {samples.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs text-indigo-700 hover:bg-indigo-100"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </Bubble>

            {active.messages.map((m, i) => (
              <Bubble key={i} role={m.role}>
                {m.text}
                {m.meta && (
                  <p className="mt-1.5 text-xs text-slate-400">
                    {m.meta.source === "off_topic"
                      ? "off-topic"
                      : m.meta.source === "llm"
                        ? "uncached"
                        : "cached"}{" "}
                    · {Math.round(m.meta.latencyMs)} ms
                  </p>
                )}
              </Bubble>
            ))}

            {loading && <p className="text-sm text-slate-400">Typing…</p>}
            <div ref={bottom} />
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="border-t border-slate-200 px-4 py-4"
        >
          <div className="mx-auto flex max-w-2xl gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your question…"
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
            <button
              disabled={loading || !input.trim()}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

function Bubble({
  role,
  children,
}: {
  role: Message["role"];
  children: React.ReactNode;
}) {
  const user = role === "user";
  return (
    <div className={user ? "flex justify-end" : "flex"}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
          user ? "bg-indigo-600 text-white" : "border border-slate-200 bg-white"
        }`}
      >
        {children}
      </div>
    </div>
  );
}
