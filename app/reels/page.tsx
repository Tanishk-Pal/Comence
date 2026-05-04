"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { collection, getDocs, orderBy, query, doc, updateDoc, increment } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/store/cartStore";
import toast from "react-hot-toast";
import Link from "next/link";

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

const isExternalUrl = (url: string) =>
  url.includes("youtube.com") ||
  url.includes("youtu.be") ||
  url.includes("instagram.com");

export default function ReelsPage() {
  const [reels, setReels] = useState<Reel[]>([]);
  const [resolvedUrls, setResolvedUrls] = useState<Record<string, string>>({});
  const [loadingUrls, setLoadingUrls] = useState<Set<string>>(new Set());
  const [likedReels, setLikedReels] = useState<Set<string>>(new Set());
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const { addItem } = useCartStore();
  const router = useRouter();

  // ── 1. Fetch reels from Firestore ──────────────────────────────────────────
  useEffect(() => {
    const fetchReels = async () => {
      const q = query(collection(db, "reels"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Reel[];
      setReels(data);
    };
    fetchReels();
  }, []);

  // ── 2. Extract external URLs (YouTube/Instagram) on load ──────────────────
  useEffect(() => {
    if (reels.length === 0) return;

    reels.forEach((reel) => {
      if (!isExternalUrl(reel.videoUrl)) return; // cloudinary/mp4 — skip
      if (resolvedUrls[reel.id]) return;          // already resolved
      if (loadingUrls.has(reel.id)) return;       // already in flight

      setLoadingUrls((prev) => new Set([...prev, reel.id]));

      fetch("/api/extract-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: reel.videoUrl }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.videoUrl) {
            setResolvedUrls((prev) => ({ ...prev, [reel.id]: data.videoUrl }));
          }
        })
        .catch(() => {})
        .finally(() => {
          setLoadingUrls((prev) => {
            const next = new Set(prev);
            next.delete(reel.id);
            return next;
          });
        });
    });
  }, [reels]);

  // ── 3. IntersectionObserver — auto-play on scroll ─────────────────────────
  const setupObserver = useCallback(() => {
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target as HTMLVideoElement;
          if (entry.isIntersecting) {
            // Only play if src is set and not empty
            if (video.src && video.src !== window.location.href) {
              video.play().catch(() => {});
            }
          } else {
            video.pause();
            video.currentTime = 0;
          }
        });
      },
      { threshold: 0.7 }
    );

    videoRefs.current.forEach((v) => {
      if (v) observerRef.current!.observe(v);
    });
  }, []);

  // Re-setup observer whenever reels or resolvedUrls change
  useEffect(() => {
    if (reels.length === 0) return;
    // Small timeout lets React finish rendering new src attributes
    const t = setTimeout(setupObserver, 100);
    return () => clearTimeout(t);
  }, [reels, resolvedUrls, setupObserver]);

  useEffect(() => {
    return () => observerRef.current?.disconnect();
  }, []);

  // ── 4. Actions ────────────────────────────────────────────────────────────
  const handleLike = async (reel: Reel) => {
    if (likedReels.has(reel.id)) return;
    setLikedReels((prev) => new Set([...prev, reel.id]));
    await updateDoc(doc(db, "reels", reel.id), { likes: increment(1) });
    toast("❤️ Liked!", { duration: 800 });
  };

  const handleShare = (reel: Reel) => {
    if (navigator.share) {
      navigator.share({ title: reel.productName, text: reel.caption, url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied! 🔗");
    }
  };

  const handleBuy = (reel: Reel) => {
    if (!auth.currentUser) { router.push("/auth/login"); return; }
    addItem({ id: reel.id, name: reel.productName, price: reel.price, image: reel.productImage, quantity: 1 });
    router.push("/buyer/checkout");
  };

  // ── 5. Render ─────────────────────────────────────────────────────────────
  return (
    <main
      className="bg-black h-screen overflow-y-scroll"
      style={{ scrollSnapType: "y mandatory", WebkitOverflowScrolling: "touch" }}
    >
      {reels.length === 0 && (
        <div className="flex items-center justify-center h-screen text-zinc-500 text-lg">
          No reels yet!
        </div>
      )}

      {reels.map((reel, index) => {
        const isLiked = likedReels.has(reel.id);
        const isLoading = loadingUrls.has(reel.id);

        // Use resolved URL for YouTube/Instagram, original for direct mp4/cloudinary
        const playbackUrl = isExternalUrl(reel.videoUrl)
          ? resolvedUrls[reel.id] ?? ""
          : reel.videoUrl;

        return (
          <div
            key={reel.id}
            className="relative w-full h-screen flex-shrink-0 bg-zinc-950"
            style={{ scrollSnapAlign: "start", scrollSnapStop: "always" }}
          >
            {/* VIDEO */}
            {isLoading ? (
              <div className="w-full h-full flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-zinc-400 text-sm">Loading video...</p>
                </div>
              </div>
            ) : (
              <video
                ref={(el) => { videoRefs.current[index] = el; }}
                src={playbackUrl}
                className="w-full h-full object-cover"
                loop
                muted
                playsInline
                preload="metadata"
                onError={() => {
                  // If URL expired, try re-extracting
                  if (isExternalUrl(reel.videoUrl)) {
                    setResolvedUrls((prev) => {
                      const next = { ...prev };
                      delete next[reel.id];
                      return next;
                    });
                  }
                }}
                onClick={(e) => {
                  const v = e.currentTarget;
                  v.muted = !v.muted;
                }}
              />
            )}

            {/* Gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

            {/* Back */}
            <Link href="/buyer/feed" className="absolute top-4 left-4 z-10 bg-black/50 rounded-full p-2.5">
              <span className="text-white text-base">←</span>
            </Link>

            {/* Right actions */}
            <div className="absolute right-3 bottom-48 flex flex-col items-center gap-5 z-10">
              <button onClick={() => handleLike(reel)} className="flex flex-col items-center gap-1">
                <div className={`p-3 rounded-full transition ${isLiked ? "bg-red-500" : "bg-black/50"}`}>
                  <span className="text-2xl">{isLiked ? "❤️" : "🤍"}</span>
                </div>
                <span className="text-white text-xs font-bold">{reel.likes + (isLiked ? 1 : 0)}</span>
              </button>

              <button onClick={() => handleShare(reel)} className="flex flex-col items-center gap-1">
                <div className="p-3 rounded-full bg-black/50"><span className="text-2xl">↗️</span></div>
                <span className="text-white text-xs font-bold">Share</span>
              </button>
            </div>

            {/* Bottom info */}
            <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
              <p className="text-white font-bold text-sm mb-1">@{reel.sellerName}</p>
              <p className="text-zinc-300 text-xs mb-3 line-clamp-2">{reel.caption}</p>

              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md rounded-2xl p-3">
                <img src={reel.productImage} alt={reel.productName} className="w-12 h-12 rounded-xl object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-bold truncate">{reel.productName}</p>
                  <p className="text-purple-400 font-bold">₹{reel.price}</p>
                </div>
                <button onClick={() => handleBuy(reel)}
                  className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition flex-shrink-0">
                  Buy ⚡
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </main>
  );
}