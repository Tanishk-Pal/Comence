"use client";
import { useEffect, useState } from "react";
import { doc, getDoc, updateDoc, increment } from "firebase/firestore";
import { db, auth, rtdb } from "@/lib/firebase";
import { ref, push, onValue } from "firebase/database";
import { useCartStore } from "@/store/cartStore";
import { Send, ShoppingCart, Heart, Share2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Link from "next/link";

type LiveSession = {
  id: string;
  sellerName: string;
  title: string;
  isActive: boolean;
  pinnedProduct?: {
    id: string;
    name: string;
    price: number;
    imageUrl: string;
  };
};

type Message = { id: string; name: string; text: string; time: number; };

export default function LiveViewerPage() {
  const { id } = useParams();
  const router = useRouter();
  const [live, setLive] = useState<LiveSession | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState("");
  const [viewers, setViewers] = useState(0);
  const [reactions, setReactions] = useState<{ id: number; x: number }[]>([]);
  const [userName, setUserName] = useState("Viewer");
  const { addItem } = useCartStore();

  useEffect(() => {
    const fetchLive = async () => {
      if (!id) return;
      const snap = await getDoc(doc(db, "lives", id as string));
      if (snap.exists()) {
        setLive({ id: snap.id, ...snap.data() } as LiveSession);
        // Increment viewer count
        await updateDoc(doc(db, "lives", id as string), { viewers: increment(1) });
        const viewerRef = ref(rtdb, `lives/${id}/viewers`);
        push(viewerRef, 1);
      }
    };
    fetchLive();

    // Get user name
    const user = auth.currentUser;
    if (user) setUserName(user.displayName ?? user.email?.split("@")[0] ?? "Viewer");
  }, [id]);

  // Listen to messages
  useEffect(() => {
    if (!id) return;
    const chatRef = ref(rtdb, `lives/${id}/messages`);
    const unsub = onValue(chatRef, (snap) => {
      const data = snap.val();
      if (!data) return;
      const msgs = Object.entries(data).map(([msgId, val]: [string, any]) => ({
        id: msgId, name: val.name, text: val.text, time: val.time,
      }));
      setMessages(msgs.sort((a, b) => a.time - b.time).slice(-50));
    });
    return () => unsub();
  }, [id]);

  // Listen to viewer count
  useEffect(() => {
    if (!id) return;
    const viewerRef = ref(rtdb, `lives/${id}/viewers`);
    const unsub = onValue(viewerRef, (snap) => {
      const data = snap.val();
      if (data) setViewers(Object.keys(data).length);
    });
    return () => unsub();
  }, [id]);

  // Listen to reactions
  useEffect(() => {
    if (!id) return;
    const reactRef = ref(rtdb, `lives/${id}/reactions`);
    const unsub = onValue(reactRef, () => {
      const newId = Date.now();
      const x = Math.random() * 80 + 10;
      setReactions((prev) => [...prev, { id: newId, x }]);
      setTimeout(() => setReactions((prev) => prev.filter((r) => r.id !== newId)), 2000);
    });
    return () => unsub();
  }, [id]);

  const sendMessage = () => {
    if (!message.trim() || !id) return;
    const chatRef = ref(rtdb, `lives/${id}/messages`);
    push(chatRef, { name: userName, text: message, time: Date.now() });
    setMessage("");
  };

  const sendReaction = () => {
    if (!id) return;
    const reactRef = ref(rtdb, `lives/${id}/reactions`);
    push(reactRef, { time: Date.now() });
  };

  const handleBuyNow = () => {
    if (!live?.pinnedProduct) return;
    addItem({
      id: live.pinnedProduct.id,
      name: live.pinnedProduct.name,
      price: live.pinnedProduct.price,
      image: live.pinnedProduct.imageUrl,
      quantity: 1,
    });
    toast.success("Added to cart! 🛒");
    router.push("/buyer/checkout");
  };

  if (!live) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <p className="text-zinc-400">Loading live session...</p>
    </div>
  );

  if (!live.isActive) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <p className="text-4xl mb-3">📴</p>
        <p className="text-white text-lg font-bold mb-2">Live has ended</p>
        <Link href="/buyer/feed" className="bg-purple-600 text-white px-6 py-2 rounded-full text-sm font-bold">
          Go Back
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white flex flex-col md:flex-row">

      {/* Left - Video area */}
      <div className="flex-1 relative bg-zinc-950 flex items-center justify-center min-h-64 md:min-h-screen">

        {/* Live placeholder — in production this would be WebRTC stream */}
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-900 to-black min-h-64">
          <div className="text-center">
            <div className="text-6xl mb-4">🎥</div>
            <p className="text-white font-bold text-xl">{live.sellerName} is Live!</p>
            <p className="text-zinc-400 text-sm mt-1">{live.title}</p>
          </div>
        </div>

        {/* Live badge */}
        <div className="absolute top-4 left-4 flex items-center gap-2">
          <div className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"/>
            LIVE
          </div>
          <div className="bg-black/60 text-white text-xs px-3 py-1 rounded-full">
            👁 {viewers} watching
          </div>
        </div>

        {/* Floating reactions */}
        {reactions.map((r) => (
          <div key={r.id}
            className="absolute bottom-32 text-2xl pointer-events-none"
            style={{
              left: `${r.x}%`,
              animation: "floatUp 2s ease-out forwards",
            }}>
            ❤️
          </div>
        ))}

        {/* Pinned product */}
        {live.pinnedProduct && (
          <div className="absolute bottom-4 left-4 right-4 md:right-auto md:w-72 bg-black/70 backdrop-blur rounded-2xl p-3 flex items-center gap-3">
            <img src={live.pinnedProduct.imageUrl} alt={live.pinnedProduct.name}
              className="w-12 h-12 rounded-xl object-cover"/>
            <div className="flex-1">
              <p className="text-white text-sm font-bold">{live.pinnedProduct.name}</p>
              <p className="text-purple-400 font-bold">₹{live.pinnedProduct.price}</p>
            </div>
            <button onClick={handleBuyNow}
              className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition">
              Buy ⚡
            </button>
          </div>
        )}

        {/* Action buttons */}
        <div className="absolute right-4 bottom-20 flex flex-col gap-3">
          <button onClick={sendReaction}
            className="bg-zinc-800/80 p-3 rounded-full">
            <Heart className="w-5 h-5 text-red-400"/>
          </button>
          <button onClick={() => {
            navigator.clipboard.writeText(window.location.href);
            toast.success("Link copied! 🔗");
          }} className="bg-zinc-800/80 p-3 rounded-full">
            <Share2 className="w-5 h-5 text-white"/>
          </button>
          <Link href="/buyer/cart" className="bg-zinc-800/80 p-3 rounded-full">
            <ShoppingCart className="w-5 h-5 text-white"/>
          </Link>
        </div>

        <style>{`
          @keyframes floatUp {
            0% { transform: translateY(0); opacity: 1; }
            100% { transform: translateY(-200px); opacity: 0; }
          }
        `}</style>
      </div>

      {/* Right - Chat panel */}
      <div className="w-full md:w-80 flex flex-col bg-zinc-950 border-l border-zinc-800">
        <div className="p-4 border-b border-zinc-800">
          <p className="text-white font-bold">{live.title}</p>
          <p className="text-zinc-400 text-xs">@{live.sellerName}</p>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2" style={{ maxHeight: "400px" }}>
          <p className="text-zinc-500 text-xs font-semibold">💬 LIVE CHAT</p>
          {messages.length === 0 && (
            <p className="text-zinc-600 text-sm text-center mt-4">
              Be the first to comment!
            </p>
          )}
          {messages.map((msg) => (
            <div key={msg.id} className="flex gap-2 items-start">
              <div className="w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                {msg.name[0]?.toUpperCase()}
              </div>
              <div className="bg-zinc-800 rounded-xl px-3 py-2 flex-1">
                <p className="text-purple-400 text-xs font-semibold">{msg.name}</p>
                <p className="text-white text-sm">{msg.text}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Chat input */}
        <div className="p-4 border-t border-zinc-800 flex gap-2">
          <input value={message} onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Say something..."
            className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:ring-2 ring-purple-500"/>
          <button onClick={sendMessage}
            className="bg-purple-600 hover:bg-purple-700 p-2 rounded-xl transition">
            <Send className="w-5 h-5"/>
          </button>
        </div>
      </div>
    </div>
  );
}