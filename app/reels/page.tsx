"use client";

import { useEffect, useState, useRef } from "react";
import {
  collection,
  getDocs,
  orderBy,
  query,
  doc,
  updateDoc,
  increment,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/store/cartStore";
import toast from "react-hot-toast";

type Reel = {
  id: string;
  videoUrl: string;
  caption: string;
  productName: string;
  price: number;
  productImage: string;
  sellerName: string;
  likes: number;
};

export default function ReelsPage() {
  const [reels, setReels] = useState<Reel[]>([]);
  const [likedReels, setLikedReels] = useState<Set<string>>(new Set());
  const [mutedIds, setMutedIds] = useState<Set<string>>(new Set());

  // ✅ FIXED TYPES
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  const { addItem } = useCartStore();
  const router = useRouter();

  // ── Fetch reels ──
  useEffect(() => {
    const fetchReels = async () => {
      const snap = await getDocs(
        query(collection(db, "reels"), orderBy("createdAt", "desc"))
      );

      setReels(
        snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as Reel[]
      );
    };

    fetchReels();
  }, []);

  // ── FORCE FIRST VIDEO PLAY (CRITICAL FIX) ──
  useEffect(() => {
    const firstVideo = videoRefs.current[0];
    if (firstVideo) {
      firstVideo.play().catch(() => {});
    }
  }, [reels]);

  // ── AUTO PLAY ON SCROLL ──
  useEffect(() => {
    if (reels.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target as HTMLVideoElement;

          if (entry.isIntersecting) {
            video.play().catch(() => {});
          } else {
            video.pause();
            video.currentTime = 0;
          }
        });
      },
      {
        threshold: 0.3, // ✅ lower = smoother trigger
        root: containerRef.current,
      }
    );

    videoRefs.current.forEach((v) => {
      if (v) observer.observe(v);
    });

    return () => observer.disconnect();
  }, [reels]);

  // ── ACTIONS ──
  const handleLike = async (reel: Reel) => {
    if (likedReels.has(reel.id)) return;

    setLikedReels((prev) => new Set([...prev, reel.id]));

    await updateDoc(doc(db, "reels", reel.id), {
      likes: increment(1),
    });

    toast("❤️ Liked!");
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied!");
  };

  const handleBuy = (reel: Reel) => {
    if (!auth.currentUser) {
      router.push("/auth/login");
      return;
    }

    addItem({
      id: reel.id,
      name: reel.productName,
      price: reel.price,
      image: reel.productImage,
      quantity: 1,
    });

    router.push("/buyer/checkout");
  };

  const toggleMute = (reelId: string, video: HTMLVideoElement) => {
    video.muted = !video.muted;

    setMutedIds((prev) => {
      const next = new Set(prev);
      video.muted ? next.add(reelId) : next.delete(reelId);
      return next;
    });
  };

  // ── UI ──
  return (
    <div
      ref={containerRef}
      className="bg-black h-screen overflow-y-scroll"
      style={{ scrollSnapType: "y mandatory" }}
    >
      {reels.length === 0 && (
        <div className="h-screen flex items-center justify-center text-zinc-500">
          No reels yet
        </div>
      )}

      {reels.map((reel, index) => {
        const isLiked = likedReels.has(reel.id);
        const isMuted = mutedIds.has(reel.id);

        return (
          <div
            key={reel.id}
            className="relative w-full h-screen"
            style={{ scrollSnapAlign: "start" }}
          >
            {/* VIDEO */}
            <video
              ref={(el) => {
                videoRefs.current[index] = el;
              }}
              src={reel.videoUrl}
              className="w-full h-full object-cover"
              loop
              muted
              autoPlay
              playsInline
              preload="auto"
              onClick={(e) => {
                const video = e.currentTarget;
                if (video.paused) video.play();
                toggleMute(reel.id, video);
              }}
            />

            {/* MUTE ICON */}
            {isMuted && (
              <div className="absolute top-4 right-4 bg-black/60 p-2 rounded-full">
                🔇
              </div>
            )}

            {/* RIGHT BUTTONS */}
            <div className="absolute right-3 bottom-40 flex flex-col gap-4 text-white">
              <button onClick={() => handleLike(reel)}>
                {isLiked ? "❤️" : "🤍"} {reel.likes + (isLiked ? 1 : 0)}
              </button>

              <button onClick={handleShare}>↗️</button>
            </div>

            {/* BOTTOM INFO */}
            <div className="absolute bottom-0 w-full p-4 bg-gradient-to-t from-black/80">
              <p className="text-white text-sm">@{reel.sellerName}</p>
              <p className="text-zinc-300 text-xs">{reel.caption}</p>

              <div className="flex items-center gap-3 mt-2">
                <img
                  src={reel.productImage}
                  className="w-12 h-12 rounded"
                />

                <div className="flex-1">
                  <p className="text-white text-sm">{reel.productName}</p>
                  <p className="text-purple-400">₹{reel.price}</p>
                </div>

                <button
                  onClick={() => handleBuy(reel)}
                  className="bg-purple-600 px-4 py-2 rounded text-white"
                >
                  Buy
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}