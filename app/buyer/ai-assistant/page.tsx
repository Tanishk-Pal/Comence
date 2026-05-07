"use client";

import { useState } from "react";

type Chat = {
  role: "user" | "ai";
  text: string;
};

export default function TanxAIPage() {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const [chats, setChats] = useState<Chat[]>([
    {
      role: "ai",
      text: "Hi, I am Tanx AI. Ask me about any product.",
    },
  ]);

  const askAI = async () => {
    if (!message.trim()) return;

    const userMessage = message;

    // ADD USER MESSAGE
    setChats((prev) => [
      ...prev,
      {
        role: "user",
        text: userMessage,
      },
    ]);

    // CLEAR INPUT
    setMessage("");

    setLoading(true);

    try {
      const res = await fetch("/api/tanx", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage,
        }),
      });

      const data = await res.json();

      setChats((prev) => [
        ...prev,
        {
          role: "ai",
          text: data.reply || "No response",
        },
      ]);
    } catch (err) {
      console.log(err);

      setChats((prev) => [
        ...prev,
        {
          role: "ai",
          text: "AI failed. Try again.",
        },
      ]);
    }

    setLoading(false);
  };

  return (
    <div className="flex flex-col h-full">

      {/* CHAT AREA */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {chats.map((chat, index) => (
          <div
            key={index}
            className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap ${
              chat.role === "user"
                ? "ml-auto bg-purple-600 text-white"
                : "bg-zinc-100 text-zinc-800"
            }`}
          >
            {chat.text}
          </div>
        ))}

        {loading && (
          <div className="bg-zinc-100 text-zinc-500 rounded-2xl px-4 py-3 text-sm w-fit">
            Tanx AI thinking...
          </div>
        )}
      </div>

      {/* INPUT */}
      <div className="border-t border-zinc-200 p-3 flex gap-2">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Ask Tanx AI..."
          className="flex-1 h-12 max-h-28 border border-zinc-300 rounded-2xl px-4 py-3 outline-none resize-none text-sm"
        />

        <button
          onClick={askAI}
          disabled={loading}
          className="bg-purple-600 hover:bg-purple-700 text-white px-5 rounded-2xl font-bold"
        >
          ↑
        </button>
      </div>
    </div>
  );
}