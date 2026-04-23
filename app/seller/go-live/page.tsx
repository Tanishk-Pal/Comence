"use client";
import { useState, useRef, useEffect } from "react";
import { collection, addDoc, getDocs, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { db, auth, rtdb } from "@/lib/firebase";
import { ref, push, onValue, serverTimestamp } from "firebase/database";
import { doc, getDoc } from "firebase/firestore";
import toast from "react-hot-toast";
import Link from "next/link";
import { Video, VideoOff, Mic, MicOff, Users, Heart, Send, ShoppingBag, X } from "lucide-react";

type Message = { id: string; name: string; text: string; time: number; };
type Product = { id: string; name: string; price: number; imageUrl: string; };

export default function GoLivePage() {
  const [isLive, setIsLive] = useState(false);
  const [camOn, setCamOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [viewers, setViewers] = useState(0);
  const [reactions, setReactions] = useState<{ id: number; x: number }[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [pinnedProduct, setPinnedProduct] = useState<Product | null>(null);
  const [liveId, setLiveId] = useState<string | null>(null);
  const [sellerName, setSellerName] = useState("Seller");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      if (!auth.currentUser) return;
      const q = query(collection(db, "products"), where("sellerId", "==", auth.currentUser.uid));
      const snap = await getDocs(q);
      setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Product)));
    };
    const fetchName = async () => {
      if (!auth.currentUser) return;
      const snap = await getDoc(doc(db, "users", auth.currentUser.uid));
      setSellerName(snap.data()?.name ?? "Seller");
    };
    fetchProducts();
    fetchName();
  }, []);

  // Listen to chat messages when live
  useEffect(() => {
    if (!liveId) return;
    const chatRef = ref(rtdb, `lives/${liveId}/messages`);
    const unsub = onValue(chatRef, (snap) => {
      const data = snap.val();
      if (!data) return;
      const msgs = Object.entries(data).map(([id, val]: [string, any]) => ({
        id, name: val.name, text: val.text, time: val.time,
      }));
      setMessages(msgs.sort((a, b) => a.time - b.time));
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    });
    return () => unsub();
  }, [liveId]);

  // Listen to viewer count
  useEffect(() => {
    if (!liveId) return;
    const viewerRef = ref(rtdb, `lives/${liveId}/viewers`);
    const unsub = onValue(viewerRef, (snap) => {
      setViewers(snap.val() ?? 0);
    });
    return () => unsub();
  }, [liveId]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch {
      toast.error("Camera access denied!");
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  const handleGoLive = async () => {
    if (!auth.currentUser) return;
    await startCamera();
    try {
      const liveDoc = await addDoc(collection(db, "lives"), {
        sellerId: auth.currentUser.uid,
        sellerName,
        title: `${sellerName} is Live! 🔴`,
        pinnedProductId: pinnedProduct?.id ?? null,
        pinnedProduct: pinnedProduct ?? null,
        startedAt: new Date(),
        isActive: true,
        viewers: 0,
      });
      setLiveId(liveDoc.id);
      setIsLive(true);
      toast.success("You are LIVE! 🔴");
    } catch {
      toast.error("Failed to go live!");
    }
  };

  const handleEndLive = () => {
    stopCamera();
    setIsLive(false);
    setLiveId(null);
    setMessages([]);
    toast.success("Live ended!");
  };

  const toggleCamera = () => {
    const videoTrack = streamRef.current?.getVideoTracks()[0];
    if (videoTrack) { videoTrack.enabled = !videoTrack.enabled; setCamOn(!camOn); }
  };

  const toggleMic = () => {
    const audioTrack = streamRef.current?.getAudioTracks()[0];
    if (audioTrack) { audioTrack.enabled = !audioTrack.enabled; setMicOn(!micOn); }
  };

  const sendMessage = () => {
    if (!message.trim() || !liveId) return;
    const chatRef = ref(rtdb, `lives/${liveId}/messages`);
    push(chatRef, { name: sellerName + " (Seller)", text: message, time: Date.now() });
    setMessage("");
  };

  const sendReaction = () => {
    const id = Date.now();
    const x = Math.random() * 80 + 10;
    setReactions((prev) => [...prev, { id, x }]);
    setTimeout(() => setReactions((prev) => prev.filter((r) => r.id !== id)), 2000);
    if (liveId) {
      const reactRef = ref(rtdb, `lives/${liveId}/reactions`);
      push(reactRef, { time: Date.now() });
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <Link href="/seller/dashboard" className="text-zinc-400 hover:text-white">← Back</Link>
        <h1 className="font-bold text-lg">Go Live 🔴</h1>
        <div className="w-16"/>
      </div>

      <div className="flex flex-col md:flex-row h-[calc(100vh-56px)]">

        {/* Left — Camera feed */}
        <div className="relative flex-1 bg-zinc-950 flex items-center justify-center">

          {/* Video */}
          <video ref={videoRef} muted playsInline autoPlay
            className="w-full h-full object-cover"/>

          {/* Not live placeholder */}
          {!isLive && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950">
              <div className="text-6xl mb-4">🎥</div>
              <p className="text-zinc-400 text-lg mb-2">Ready to go live?</p>
              <p className="text-zinc-600 text-sm">Your audience is waiting!</p>
            </div>
          )}

          {/* Live badge */}
          {isLive && (
            <div className="absolute top-4 left-4 flex items-center gap-2">
              <div className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"/>
                LIVE
              </div>
              <div className="bg-black/60 text-white text-xs px-3 py-1 rounded-full flex items-center gap-1">
                <Users className="w-3 h-3"/>
                {viewers} watching
              </div>
            </div>
          )}

          {/* Floating reactions */}
          {reactions.map((r) => (
            <div key={r.id} className="absolute bottom-24 text-3xl animate-bounce pointer-events-none"
              style={{ left: `${r.x}%`, animation: "floatUp 2s ease-out forwards" }}>
              ❤️
            </div>
          ))}

          {/* Pinned product card */}
          {isLive && pinnedProduct && (
            <div className="absolute bottom-4 left-4 right-4 md:right-auto md:w-72 bg-black/70 backdrop-blur rounded-2xl p-3 flex items-center gap-3">
              <img src={pinnedProduct.imageUrl} alt={pinnedProduct.name}
                className="w-12 h-12 rounded-xl object-cover"/>
              <div className="flex-1">
                <p className="text-white text-sm font-bold">{pinnedProduct.name}</p>
                <p className="text-purple-400 font-bold">₹{pinnedProduct.price}</p>
              </div>
              <div className="bg-purple-600 text-white text-xs font-bold px-3 py-2 rounded-xl">
                Buy ⚡
              </div>
            </div>
          )}

          {/* Camera controls */}
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex items-center gap-4">
            {isLive && (
              <>
                <button onClick={toggleCamera}
                  className={`p-3 rounded-full ${camOn ? "bg-zinc-700" : "bg-red-600"}`}>
                  {camOn ? <Video className="w-5 h-5"/> : <VideoOff className="w-5 h-5"/>}
                </button>
                <button onClick={toggleMic}
                  className={`p-3 rounded-full ${micOn ? "bg-zinc-700" : "bg-red-600"}`}>
                  {micOn ? <Mic className="w-5 h-5"/> : <MicOff className="w-5 h-5"/>}
                </button>
                <button onClick={sendReaction}
                  className="p-3 rounded-full bg-zinc-700">
                  <Heart className="w-5 h-5 text-red-400"/>
                </button>
              </>
            )}
          </div>

          {/* Go Live / End Live button */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
            {!isLive ? (
              <button onClick={handleGoLive}
                className="bg-red-600 hover:bg-red-700 text-white font-bold px-10 py-3 rounded-full text-lg transition">
                🔴 Go Live
              </button>
            ) : (
              <button onClick={handleEndLive}
                className="bg-zinc-700 hover:bg-zinc-600 text-white font-bold px-10 py-3 rounded-full text-lg transition">
                End Live
              </button>
            )}
          </div>
        </div>

        {/* Right panel */}
        <div className="w-full md:w-80 flex flex-col border-l border-zinc-800 bg-zinc-950">

          {/* Pin a product */}
          <div className="p-4 border-b border-zinc-800">
            <p className="text-zinc-400 text-xs font-semibold mb-2">📦 PIN A PRODUCT</p>
            <select value={pinnedProduct?.id ?? ""}
              onChange={(e) => {
                const p = products.find((p) => p.id === e.target.value);
                setPinnedProduct(p ?? null);
              }}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white outline-none">
              <option value="">Select product to pin...</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name} — ₹{p.price}</option>
              ))}
            </select>
            {pinnedProduct && (
              <div className="flex items-center gap-2 mt-2 bg-zinc-900 rounded-xl p-2">
                <img src={pinnedProduct.imageUrl} alt={pinnedProduct.name}
                  className="w-10 h-10 rounded-lg object-cover"/>
                <div className="flex-1">
                  <p className="text-white text-xs font-semibold">{pinnedProduct.name}</p>
                  <p className="text-purple-400 text-xs font-bold">₹{pinnedProduct.price}</p>
                </div>
                <button onClick={() => setPinnedProduct(null)}>
                  <X className="w-4 h-4 text-zinc-500"/>
                </button>
              </div>
            )}
          </div>

          {/* Live stats */}
          {isLive && (
            <div className="flex gap-3 p-4 border-b border-zinc-800">
              <div className="flex-1 bg-zinc-900 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-red-400">{viewers}</p>
                <p className="text-zinc-500 text-xs">Watching</p>
              </div>
              <div className="flex-1 bg-zinc-900 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-purple-400">{messages.length}</p>
                <p className="text-zinc-500 text-xs">Comments</p>
              </div>
            </div>
          )}

          {/* Chat */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
            <p className="text-zinc-500 text-xs font-semibold">💬 LIVE CHAT</p>
            {messages.length === 0 && (
              <p className="text-zinc-600 text-sm text-center mt-4">
                {isLive ? "Waiting for comments..." : "Go live to see chat!"}
              </p>
            )}
            {messages.map((msg) => (
              <div key={msg.id} className="flex gap-2 items-start">
                <div className="w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {msg.name[0]}
                </div>
                <div className="bg-zinc-900 rounded-xl px-3 py-2 flex-1">
                  <p className="text-purple-400 text-xs font-semibold">{msg.name}</p>
                  <p className="text-white text-sm">{msg.text}</p>
                </div>
              </div>
            ))}
            <div ref={chatEndRef}/>
          </div>

          {/* Chat input */}
          {isLive && (
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
          )}
        </div>
      </div>

      <style>{`
        @keyframes floatUp {
          0% { transform: translateY(0); opacity: 1; }
          100% { transform: translateY(-200px); opacity: 0; }
        }
      `}</style>
    </div>
  );
}