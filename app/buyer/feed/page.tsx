"use client";
import { useEffect, useState, useRef } from "react";
import { collection, getDocs, orderBy, query, doc, updateDoc, getDoc, increment } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useCartStore } from "@/store/cartStore";
import { Home, Play, Search, ShoppingCart, User, Star, Zap, Tag, Trash2, Settings, Store, Plus } from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut, onAuthStateChanged } from "firebase/auth";

type Product = { id: string; name: string; price: number; imageUrl: string; description: string; sellerId: string; category?: string; offer?: number; };
type Reel = { id: string; videoUrl: string; caption: string; sellerName: string; productName: string; price: number; productImage: string; likes: number; };
type Order = { id: string; items: any[]; total: number; status: string; createdAt: any; paymentMethod: string; address: string; userId?: string; };

const BANNERS = [
  { bg: "from-purple-900 via-purple-700 to-purple-500", badge: "🔥 LIMITED TIME OFFER", title: "Up to 70% OFF", sub: "On top products today only!", btn: "Shop Now →" },
  { bg: "from-blue-900 via-blue-700 to-blue-500", badge: "⚡ FLASH SALE", title: "New Arrivals!", sub: "Fresh products added daily", btn: "Explore Now →" },
  { bg: "from-green-900 via-green-700 to-green-500", badge: "🚚 FREE DELIVERY", title: "Order Above ₹499", sub: "Get free delivery on all orders", btn: "Shop Now →" },
  { bg: "from-pink-900 via-pink-700 to-pink-500", badge: "🎁 SPECIAL OFFER", title: "Buy 2 Get 1 Free", sub: "On selected products today", btn: "Grab Deal →" },
];

const ADMIN_EMAIL = "palt51419@gmail.com";

export default function BuyerFeed() {
  const [tab, setTab] = useState<"home" | "reels" | "mall" | "search" | "cart" | "profile" | "orders">("home");
  const [products, setProducts] = useState<Product[]>([]);
  const [reels, setReels] = useState<Reel[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [bannerIndex, setBannerIndex] = useState(0);
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("User");
  const [isAdmin, setIsAdmin] = useState(false);
  const [likedReels, setLikedReels] = useState<Set<string>>(new Set());
  const { addItem, items, total, removeItem, clearCart } = useCartStore();
  const router = useRouter();
  const bannerTimer = useRef<NodeJS.Timeout | null>(null);
  const reelContainerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  useEffect(() => {
    bannerTimer.current = setInterval(() => {
      setBannerIndex((prev) => (prev + 1) % BANNERS.length);
    }, 3000);
    return () => { if (bannerTimer.current) clearInterval(bannerTimer.current); };
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { setUserEmail(""); setUserName("Guest"); setIsAdmin(false); return; }
      setUserEmail(user.email ?? "");
      setIsAdmin(user.email === ADMIN_EMAIL);
      const snap = await getDoc(doc(db, "users", user.uid));
      setUserName(snap.data()?.name ?? "User");
      const oSnap = await getDocs(collection(db, "orders"));
      const myOrders = oSnap.docs
        .map((d) => ({ id: d.id, ...d.data() } as Order))
        .filter((o) => o.userId === user.uid || o.userId === "guest");
      setOrders(myOrders);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const fetchAll = async () => {
      const pSnap = await getDocs(collection(db, "products"));
      const rSnap = await getDocs(query(collection(db, "reels"), orderBy("createdAt", "desc")));
      setProducts(pSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Product)));
      setReels(rSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Reel)));
    };
    fetchAll();
  }, []);

  useEffect(() => {
    if (!videoRefs.current.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target as HTMLVideoElement;

          if (entry.isIntersecting) {
            video.play().catch(() => { });
          } else {
            video.pause();
            video.currentTime = 0;
          }
        });
      },
      { threshold: 0.7 }
    );

    videoRefs.current.forEach((video) => {
      if (video) observer.observe(video);
    });

    // force first video play
    videoRefs.current[0]?.play().catch(() => { });

    return () => observer.disconnect();
  }, [reels]);

  const handleBuyNow = (p: Product) => {
    if (!userEmail) { router.push("/auth/login"); toast.error("Please login first!"); return; }
    addItem({ id: p.id, name: p.name, price: p.price, image: p.imageUrl, quantity: 1 });
    router.push("/buyer/checkout");
  };

  const handleAddToCart = (p: Product) => {
    if (!userEmail) { router.push("/auth/login"); toast.error("Please login to add to cart!"); return; }
    addItem({ id: p.id, name: p.name, price: p.price, image: p.imageUrl, quantity: 1 });
    toast.success(`${p.name} added to cart! 🛒`);
  };

  const handleLikeReel = async (reel: Reel) => {
    if (likedReels.has(reel.id)) return;
    setLikedReels((prev) => new Set([...prev, reel.id]));
    await updateDoc(doc(db, "reels", reel.id), { likes: increment(1) });
    toast("❤️ Liked!", { duration: 800 });
  };

  const handleShareReel = (reel: Reel) => {
    if (navigator.share) {
      navigator.share({ title: reel.productName, text: reel.caption, url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied! 🔗");
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    clearCart();
    toast.success("Logged out!");
    router.push("/");
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm("Cancel this order?")) return;
    await updateDoc(doc(db, "orders", orderId), { status: "cancelled" });
    setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: "cancelled" } : o));
    toast.success("Order cancelled!");
  };

  const filtered = products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));
  const filteredProducts = products.filter((p) => selectedCategory === "All" || p.category === selectedCategory);
  const topOfferedProducts = [...products].filter((p) => p.offer && p.offer > 0).sort((a, b) => (b.offer ?? 0) - (a.offer ?? 0)).slice(0, 5);
  const banner = BANNERS[bannerIndex];

  return (
    <div className="bg-white text-zinc-900 min-h-screen flex flex-col w-full">

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-zinc-200 shadow-sm px-4 py-3 flex items-center gap-3">
        <span className="text-xl font-bold text-zinc-900 flex-shrink-0">Com<span className="text-purple-500">ence</span></span>
        <div className="flex-1 flex items-center gap-2 bg-zinc-100 border border-zinc-300 hover:border-zinc-400 rounded-full px-4 py-2 shadow-sm transition">
          <Search className="w-4 h-4 text-zinc-400 flex-shrink-0" />
          <input type="text" placeholder="Search products..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && search.trim()) router.push(`/search?q=${encodeURIComponent(search)}`); }}
            className="flex-1 bg-transparent text-sm text-zinc-900 placeholder-zinc-400 outline-none min-w-0" />
          {search && <button onClick={() => setSearch("")} className="text-zinc-400 hover:text-zinc-600 text-lg leading-none">×</button>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link href="/seller/dashboard" className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold px-3 py-1.5 rounded-full transition">Sell</Link>
          <button onClick={() => setTab("cart")} className="relative">
            <ShoppingCart className="w-6 h-6 text-zinc-700" />
            {items.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-purple-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">{items.length}</span>
            )}
          </button>
          {userEmail ? (
            <button onClick={() => setTab("profile")}><User className="w-6 h-6 text-zinc-500 hover:text-zinc-900" /></button>
          ) : (
            <Link href="/auth/login" className="bg-zinc-900 hover:bg-zinc-700 text-white text-xs font-semibold px-3 py-1.5 rounded-full transition">Login</Link>
          )}
        </div>
      </nav>

      <div className="flex mt-14 min-h-screen">

        {/* PC Sidebar */}
        <div className="hidden md:flex flex-col fixed left-0 top-14 bottom-0 w-56 bg-white border-r border-zinc-200 p-4 gap-1 z-40 overflow-y-auto">
          {[
            { id: "home", emoji: "🏠", label: "Home" },
            { id: "reels", emoji: "🎬", label: "Reels" },
            { id: "mall", emoji: "🏬", label: "Mall" },
            { id: "search", emoji: "🔍", label: "Search" },
            { id: "cart", emoji: "🛒", label: `Cart (${items.length})` },
            { id: "profile", emoji: "👤", label: "Profile" },
          ].map((t) => (
            <button key={t.id} onClick={() => setTab(t.id as typeof tab)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition text-left ${tab === t.id ? "bg-purple-600 text-white" : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"}`}>
              <span className="text-lg">{t.emoji}</span>
              <span>{t.label}</span>
            </button>
          ))}
          <div className="mt-auto flex flex-col gap-2 pt-4">
            <Link href="/seller/dashboard"
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold bg-purple-100 text-purple-600 hover:bg-purple-600 hover:text-white transition">
              <span>🏪</span> Become a Seller
            </Link>
            {isAdmin && (
              <Link href="/admin/dashboard"
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold bg-zinc-900 text-white hover:bg-zinc-700 transition">
                <Settings className="w-4 h-4" /><span>Admin Panel</span>
              </Link>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 md:ml-56 mb-16 md:mb-0 overflow-y-auto">

          {/* HOME TAB */}
          {tab === "home" && (
            <div>
              {/* Banner */}
              <div className={`bg-gradient-to-r ${banner.bg} mx-4 mt-4 rounded-2xl p-6 md:p-8 transition-all duration-700 relative overflow-hidden`}>
                <p className="text-yellow-300 text-xs font-bold mb-1">{banner.badge}</p>
                <p className="text-white text-2xl md:text-3xl font-bold mb-1">{banner.title}</p>
                <p className="text-white/80 text-sm mb-4">{banner.sub}</p>
                <button className="bg-white text-zinc-900 text-sm font-bold px-6 py-2 rounded-full">{banner.btn}</button>
                <div className="absolute bottom-3 right-4 flex gap-1.5">
                  {BANNERS.map((_, i) => (
                    <button key={i} onClick={() => setBannerIndex(i)}
                      className={`h-2 rounded-full transition-all ${i === bannerIndex ? "bg-white w-4" : "bg-white/40 w-2"}`} />
                  ))}
                </div>
              </div>

              {/* Mall Banner */}
              <Link href="/mall" className="mx-4 mt-4 flex items-center gap-4 bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-4 hover:shadow-lg transition">
                <span className="text-4xl">🏬</span>
                <div className="flex-1">
                  <p className="text-white font-bold">Digital Malls</p>
                  <p className="text-amber-100 text-xs">Shop from multiple local stores — one delivery!</p>
                </div>
                <span className="text-white font-bold">→</span>
              </Link>

              {/* Best Offers */}
              {topOfferedProducts.length > 0 && (
                <div className="px-4 mt-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">🏷️</span>
                    <p className="text-zinc-900 font-bold text-lg">Best Offers Right Now</p>
                    <span className="ml-auto bg-red-100 text-red-600 text-xs font-bold px-2 py-1 rounded-full">HOT 🔥</span>
                  </div>
                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {topOfferedProducts.map((p) => (
                      <Link href={`/buyer/product/${p.id}`} key={p.id}
                        className="flex-shrink-0 w-44 bg-gradient-to-br from-red-50 to-orange-50 border border-red-200 rounded-2xl overflow-hidden hover:shadow-lg transition">
                        <div className="relative">
                          <img src={p.imageUrl} alt={p.name} className="w-full h-28 object-cover" />
                          <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">{p.offer}% OFF</span>
                        </div>
                        <div className="p-2">
                          <p className="text-zinc-900 text-xs font-semibold line-clamp-1">{p.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-purple-600 font-bold text-sm">₹{Math.round(p.price - (p.price * (p.offer ?? 0) / 100))}</p>
                            <p className="text-zinc-400 text-xs line-through">₹{p.price}</p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Categories */}
              <div className="px-4 mt-6">
                <p className="text-zinc-900 font-bold mb-3 text-lg">Categories</p>
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                  {["All", "Electronics", "Fashion", "Beauty", "Food", "Sports", "Home"].map((cat) => (
                    <button key={cat} onClick={() => setSelectedCategory(cat)}
                      className={`text-sm font-semibold px-5 py-2 rounded-full whitespace-nowrap transition border ${selectedCategory === cat ? "bg-purple-600 text-white border-purple-600" : "bg-white text-zinc-600 border-zinc-300 hover:border-purple-400 hover:text-purple-600"}`}>
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Flash Deals */}
              <div className="px-4 mt-6">
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="w-5 h-5 text-yellow-500" />
                  <p className="text-zinc-900 font-bold text-lg">Flash Deals</p>
                  <span className="ml-auto text-purple-600 text-sm font-semibold">See all →</span>
                </div>
                <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-3">
                  {products.slice(0, 7).map((p) => (
                    <Link href={`/buyer/product/${p.id}`} key={p.id}>
                      <div className="bg-white border border-zinc-200 rounded-2xl p-3 hover:border-purple-400 hover:shadow-md transition">
                        <div className="relative mb-2">
                          <img src={p.imageUrl} alt={p.name} className="w-full h-24 md:h-32 object-cover rounded-xl" />
                          <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">SALE</span>
                        </div>
                        <p className="text-zinc-900 text-xs font-semibold line-clamp-1">{p.name}</p>
                        <p className="text-purple-600 text-sm font-bold">₹{p.price}</p>
                        <button onClick={(e) => { e.preventDefault(); handleAddToCart(p); }}
                          className="w-full bg-purple-600 text-white text-xs font-bold py-1.5 rounded-lg mt-2 hover:bg-purple-700 transition">
                          Add to Cart
                        </button>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Trending Reels */}
              <div className="px-4 mt-6">
                <div className="flex items-center gap-2 mb-3">
                  <Play className="w-5 h-5 text-purple-600" />
                  <p className="text-zinc-900 font-bold text-lg">Trending Reels</p>
                  <button onClick={() => setTab("reels")} className="ml-auto text-purple-600 text-sm font-semibold">See all →</button>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {reels.slice(0, 8).map((r) => (
                    <button key={r.id} onClick={() => setTab("reels")}
                      className="relative min-w-32 h-48 rounded-2xl overflow-hidden flex-shrink-0 bg-zinc-100 hover:scale-105 transition shadow-sm">
                      <video src={r.videoUrl} muted playsInline className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-2">
                        <div>
                          <p className="text-white text-xs font-semibold line-clamp-1">{r.productName}</p>
                          <p className="text-purple-400 text-xs font-bold">₹{r.price}</p>
                        </div>
                      </div>
                      <div className="absolute top-2 right-2 bg-purple-600 rounded-full p-1.5">
                        <Play className="w-3 h-3 text-white fill-white" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* All Products */}
              <div className="px-4 mt-6 pb-8">
                <div className="flex items-center gap-2 mb-3">
                  <Tag className="w-5 h-5 text-green-600" />
                  <p className="text-zinc-900 font-bold text-lg">{selectedCategory === "All" ? "All Products" : selectedCategory}</p>
                  <span className="text-zinc-400 text-sm">({filteredProducts.length})</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {(search ? filtered : filteredProducts).map((p) => (
                    <div key={p.id} className="bg-white border border-zinc-200 rounded-2xl overflow-hidden hover:shadow-lg hover:border-purple-300 transition">
                      <div className="relative">
                        <Link href={`/buyer/product/${p.id}`}>
                          <img src={p.imageUrl} alt={p.name} className="w-full h-44 object-cover hover:opacity-90 transition" />
                        </Link>
                        <span className="absolute top-2 left-2 bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">In Stock</span>
                        {p.offer && <span className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{p.offer}% OFF</span>}
                      </div>
                      <div className="p-3">
                        <p className="text-zinc-900 text-sm font-semibold line-clamp-1">{p.name}</p>
                        <p className="text-zinc-400 text-xs line-clamp-1 mb-1">{p.description}</p>
                        <div className="flex gap-0.5 mb-2">{[1, 2, 3, 4, 5].map((s) => <Star key={s} className="w-3 h-3 text-yellow-400 fill-yellow-400" />)}</div>
                        <p className="text-purple-600 font-bold text-base mb-2">₹{p.price}</p>
                        <div className="flex gap-1.5">
                          <button onClick={() => handleAddToCart(p)} className="flex-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-bold py-2 rounded-xl transition">🛒 Cart</button>
                          <button onClick={() => handleBuyNow(p)} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold py-2 rounded-xl transition">⚡ Buy</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* REELS TAB */}
          {tab === "reels" && (
            <div className="flex justify-center">
              <div
                ref={reelContainerRef}
                className="w-full max-w-sm overflow-y-scroll"
                style={{
                  height: "calc(100vh - 56px)",
                  scrollSnapType: "y mandatory",
                  WebkitOverflowScrolling: "touch",
                  overscrollBehavior: "contain",
                }}
              >
                {reels.length === 0 && (
                  <div className="flex items-center justify-center h-full text-zinc-500">
                    No reels yet!
                  </div>
                )}

                {/* RESET refs BEFORE mapping */}
                {(() => {
                  videoRefs.current = [];

                  return reels.map((reel, index) => {
                    const isLiked = likedReels.has(reel.id);

                    return (
                      <div
                        key={reel.id}
                        className="relative bg-zinc-900"
                        style={{
                          height: "calc(100vh - 56px)",
                          scrollSnapAlign: "start",
                          scrollSnapStop: "always",
                          flexShrink: 0,
                        }}
                      >
                        {/* VIDEO */}
                        <video
                          ref={(el) => {
                            if (el) videoRefs.current[index] = el;
                          }}
                          src={reel.videoUrl}
                          className="w-full h-full object-cover"
                          loop
                          muted
                          autoPlay
                          playsInline
                          preload="auto"
                        />

                        {/* OVERLAY */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />

                        {/* RIGHT ACTIONS */}
                        <div className="absolute right-3 bottom-48 flex flex-col items-center gap-5 z-10">
                          <button
                            onClick={() => handleLikeReel(reel)}
                            className="flex flex-col items-center gap-1"
                          >
                            <div className={`p-3 rounded-full ${isLiked ? "bg-red-500" : "bg-black/50"}`}>
                              <span className="text-2xl">{isLiked ? "❤️" : "🤍"}</span>
                            </div>
                            <span className="text-white text-xs font-bold">
                              {reel.likes + (isLiked ? 1 : 0)}
                            </span>
                          </button>

                          <button
                            onClick={() => handleShareReel(reel)}
                            className="flex flex-col items-center gap-1"
                          >
                            <div className="p-3 rounded-full bg-black/50">↗️</div>
                            <span className="text-white text-xs font-bold">Share</span>
                          </button>
                        </div>

                        {/* BOTTOM INFO */}
                        <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
                          <p className="text-white font-bold text-sm mb-1">
                            @{reel.sellerName}
                          </p>
                          <p className="text-zinc-300 text-xs mb-3">
                            {reel.caption}
                          </p>

                          <div className="flex items-center gap-3 bg-white/10 backdrop-blur rounded-2xl p-3">
                            <img
                              src={reel.productImage}
                              alt={reel.productName}
                              className="w-12 h-12 rounded-xl object-cover"
                            />

                            <div className="flex-1">
                              <p className="text-white text-sm font-bold">
                                {reel.productName}
                              </p>
                              <p className="text-purple-400 font-bold">
                                ₹{reel.price}
                              </p>
                            </div>

                            <button
                              onClick={() => {
                                if (!userEmail) {
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
                              }}
                              className="bg-purple-600 text-white text-xs font-bold px-4 py-2 rounded-xl"
                            >
                              Buy ⚡
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          )}


          {/* MALL TAB */}
          {tab === "mall" && (
            <div className="px-4 mt-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-zinc-900 font-bold text-xl">🏬 Digital Malls</h2>
                <Link href="/mall" className="text-purple-600 text-sm font-semibold">See all →</Link>
              </div>
              <MallPreview />
            </div>
          )}

          {/* SEARCH TAB */}
          {tab === "search" && (
            <div className="px-4 mt-4">
              <form onSubmit={(e) => { e.preventDefault(); if (search.trim()) router.push(`/search?q=${encodeURIComponent(search)}`); }}
                className="flex items-center gap-2 bg-zinc-100 border border-zinc-300 rounded-full px-4 py-2.5 mb-4 shadow-sm">
                <Search className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                <input value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search products..."
                  className="flex-1 bg-transparent text-sm text-zinc-900 placeholder-zinc-400 outline-none" />
                <button type="submit" className="bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full">Go</button>
              </form>
              {search && <p className="text-zinc-400 text-sm mb-4">{filtered.length} results for "{search}"</p>}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {(search ? filtered : products).map((p) => (
                  <div key={p.id} className="bg-white border border-zinc-200 rounded-2xl overflow-hidden hover:shadow-md hover:border-purple-300 transition">
                    <Link href={`/buyer/product/${p.id}`}>
                      <img src={p.imageUrl} alt={p.name} className="w-full h-36 object-cover" />
                    </Link>
                    <div className="p-3">
                      <p className="text-zinc-900 text-sm font-semibold line-clamp-1">{p.name}</p>
                      <p className="text-purple-600 font-bold">₹{p.price}</p>
                      <div className="flex gap-1.5 mt-2">
                        <button onClick={() => handleAddToCart(p)} className="flex-1 bg-zinc-100 text-zinc-800 text-xs font-bold py-2 rounded-xl hover:bg-zinc-200 transition">🛒 Cart</button>
                        <button onClick={() => handleBuyNow(p)} className="flex-1 bg-purple-600 text-white text-xs font-bold py-2 rounded-xl hover:bg-purple-700 transition">⚡ Buy</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CART TAB */}
          {tab === "cart" && (
            <div className="px-4 mt-4 max-w-2xl mx-auto">
              <p className="text-zinc-900 font-bold text-xl mb-4">Your Cart 🛒</p>
              {items.length === 0 ? (
                <div className="text-center mt-20">
                  <p className="text-6xl mb-3">🛒</p>
                  <p className="text-zinc-400 text-lg mb-2">Your cart is empty!</p>
                  <button onClick={() => setTab("home")} className="mt-4 bg-purple-600 text-white px-8 py-3 rounded-full font-bold">Start Shopping</button>
                </div>
              ) : (
                <div className="md:flex gap-6">
                  <div className="flex-1">
                    {items.map((item) => (
                      <div key={item.id} className="flex gap-3 bg-white border border-zinc-200 rounded-2xl p-3 mb-3 shadow-sm">
                        <img src={item.image} alt={item.name} className="w-20 h-20 rounded-xl object-cover" />
                        <div className="flex-1">
                          <p className="text-zinc-900 font-semibold">{item.name}</p>
                          <p className="text-purple-600 font-bold text-lg">₹{item.price}</p>
                          <p className="text-zinc-400 text-xs">Qty: {item.quantity}</p>
                        </div>
                        <button onClick={() => removeItem(item.id)} className="text-red-400 hover:text-red-500 self-start mt-1">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                    <button onClick={() => { clearCart(); toast.success("Cart cleared!"); }}
                      className="w-full border border-red-300 text-red-500 font-semibold py-3 rounded-2xl mb-3 text-sm hover:bg-red-50 transition">
                      🗑️ Clear Cart
                    </button>
                  </div>
                  <div className="md:w-72">
                    <div className="bg-white border border-zinc-200 rounded-2xl p-4 mb-4 shadow-sm">
                      <p className="text-zinc-900 font-bold mb-3">Order Summary</p>
                      <div className="flex justify-between text-zinc-400 text-sm mb-2"><span>Subtotal</span><span>₹{total()}</span></div>
                      <div className="flex justify-between text-zinc-400 text-sm mb-2"><span>Delivery</span><span className="text-green-600 font-semibold">FREE</span></div>
                      <div className="border-t border-zinc-200 pt-3 mt-3 flex justify-between text-zinc-900 font-bold text-lg">
                        <span>Total</span><span className="text-purple-600">₹{total()}</span>
                      </div>
                    </div>
                    <Link href="/buyer/checkout" className="block w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 rounded-2xl text-center text-lg transition">
                      Checkout ⚡
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ORDERS TAB */}
          {tab === "orders" && (
            <div className="px-4 mt-4 max-w-2xl mx-auto">
              <div className="flex items-center gap-3 mb-4">
                <button onClick={() => setTab("profile")} className="text-zinc-400 hover:text-zinc-900">←</button>
                <p className="text-zinc-900 font-bold text-xl">My Orders 📦</p>
              </div>
              {orders.length === 0 ? (
                <div className="text-center mt-20">
                  <p className="text-5xl mb-3">📦</p>
                  <p className="text-zinc-400 text-lg mb-2">No orders yet!</p>
                  <button onClick={() => setTab("home")} className="mt-4 bg-purple-600 text-white px-8 py-3 rounded-full font-bold">Start Shopping</button>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {orders.map((order) => (
                    <div key={order.id} className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-zinc-500 text-xs font-semibold">Order #{order.id.slice(0, 8).toUpperCase()}</p>
                        <span className={`text-xs font-bold px-3 py-1 rounded-full ${order.status === "cancelled" ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"}`}>
                          {order.status === "cancelled" ? "❌ Cancelled" : "✅ Confirmed"}
                        </span>
                      </div>
                      {order.items?.map((item: any, i: number) => (
                        <div key={i} className="flex items-center gap-3 mb-2">
                          <img src={item.image} alt={item.name} className="w-12 h-12 rounded-xl object-cover bg-zinc-100" />
                          <div className="flex-1">
                            <p className="text-zinc-900 text-sm font-semibold">{item.name}</p>
                            <p className="text-zinc-400 text-xs">Qty: {item.quantity}</p>
                          </div>
                          <p className="text-purple-600 font-bold text-sm">₹{item.price * item.quantity}</p>
                        </div>
                      ))}
                      <div className="border-t border-zinc-100 pt-3 mt-2 flex justify-between items-center">
                        <span className="text-zinc-900 font-bold">Total: ₹{order.total}</span>
                        {order.status !== "cancelled" && (
                          <button onClick={() => handleCancelOrder(order.id)}
                            className="bg-red-50 hover:bg-red-100 text-red-500 text-xs font-bold px-4 py-2 rounded-xl border border-red-200 transition">
                            Cancel Order
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* PROFILE TAB */}
          {tab === "profile" && (
            <div className="px-4 mt-6 max-w-md mx-auto">
              {!userEmail ? (
                <div className="text-center mt-20">
                  <p className="text-5xl mb-3">👤</p>
                  <p className="text-zinc-900 font-bold text-xl mb-2">Not logged in</p>
                  <p className="text-zinc-400 text-sm mb-6">Login to view your profile and orders</p>
                  <Link href="/auth/login" className="bg-purple-600 text-white px-8 py-3 rounded-full font-bold">Login</Link>
                </div>
              ) : (
                <>
                  <div className="text-center mb-6">
                    <div className="w-24 h-24 rounded-full bg-purple-600 flex items-center justify-center text-4xl font-bold text-white mx-auto mb-3">
                      {userName[0]?.toUpperCase() ?? "U"}
                    </div>
                    <p className="text-zinc-900 font-bold text-xl">{userName}</p>
                    <p className="text-zinc-400 text-sm">{userEmail}</p>
                  </div>
                  <div className="flex flex-col gap-3">
                    <button onClick={() => setTab("orders")}
                      className="bg-white border border-zinc-200 rounded-2xl p-4 text-zinc-900 flex items-center gap-3 shadow-sm hover:border-purple-400 transition w-full text-left">
                      <span className="text-2xl">📦</span>
                      <div><p className="font-semibold">My Orders</p><p className="text-zinc-400 text-xs">Track and view your orders</p></div>
                      <span className="ml-auto text-zinc-400">→</span>
                    </button>
                    <Link href="/seller/dashboard"
                      className="bg-white border border-zinc-200 rounded-2xl p-4 text-zinc-900 flex items-center gap-3 shadow-sm hover:border-purple-400 transition">
                      <span className="text-2xl">🏪</span>
                      <div><p className="font-semibold">Seller Dashboard</p><p className="text-zinc-400 text-xs">Manage your products & reels</p></div>
                      <span className="ml-auto text-zinc-400">→</span>
                    </Link>
                    {isAdmin && (
                      <Link href="/admin/dashboard"
                        className="bg-zinc-900 border border-zinc-700 rounded-2xl p-4 text-white flex items-center gap-3 hover:bg-zinc-800 transition">
                        <span className="text-2xl">⚙️</span>
                        <div><p className="font-semibold">Admin Panel</p><p className="text-zinc-400 text-xs">Monitor & control full platform</p></div>
                        <span className="ml-auto text-zinc-400">→</span>
                      </Link>
                    )}
                    <button onClick={handleLogout}
                      className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-500 flex items-center gap-3 hover:bg-red-100 transition w-full text-left">
                      <span className="text-2xl">🚪</span>
                      <div><p className="font-semibold">Logout</p><p className="text-red-300 text-xs">Sign out of your account</p></div>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom nav mobile */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-200 flex justify-around py-2 z-50 shadow-lg">
        {[
          { id: "home", icon: <Home className="w-5 h-5" />, label: "Home" },
          { id: "reels", icon: <Play className="w-5 h-5" />, label: "Reels" },
          { id: "mall", icon: <Store className="w-5 h-5" />, label: "Mall" },
          { id: "search", icon: <Search className="w-5 h-5" />, label: "Search" },
          { id: "cart", icon: <ShoppingCart className="w-5 h-5" />, label: "Cart" },
          { id: "profile", icon: <User className="w-5 h-5" />, label: "Profile" },
        ].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id as typeof tab)}
            className={`flex flex-col items-center gap-0.5 transition ${tab === t.id ? "text-purple-600" : "text-zinc-400"}`}>
            {t.icon}
            <span className="text-xs">{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── MallPreview Component ────────────────────────────────────────────────────
function MallPreview() {
  const [communities, setCommunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    getDocs(collection(db, "communities")).then((snap) => {
      setCommunities(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
  }, []);

  const filtered = communities.filter((c) =>
    !search ||
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.city?.toLowerCase().includes(search.toLowerCase()) ||
    c.area?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {/* How it works */}
      <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 mb-4">
        <p className="text-purple-700 font-bold text-sm mb-2">🎯 How Digital Mall Works</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            { emoji: "🏬", title: "Pick Mall", sub: "Choose local market" },
            { emoji: "🛍️", title: "Shop All", sub: "From any store" },
            { emoji: "🚚", title: "1 Delivery", sub: "All together" },
          ].map((s) => (
            <div key={s.title}>
              <p className="text-xl mb-0.5">{s.emoji}</p>
              <p className="text-purple-700 text-xs font-bold">{s.title}</p>
              <p className="text-purple-400 text-xs">{s.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 bg-zinc-100 border border-zinc-300 rounded-full px-4 py-2 mb-4">
        <Search className="w-4 h-4 text-zinc-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search Indore Mall, Bhopal Market..."
          className="flex-1 bg-transparent text-sm text-zinc-900 placeholder-zinc-400 outline-none" />
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-36 bg-zinc-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center mt-10 pb-8">
          <p className="text-4xl mb-2">🏬</p>
          <p className="text-zinc-500 mb-4 font-semibold">No malls found!</p>
          <Link href="/seller/create-community"
            className="bg-purple-600 text-white px-6 py-2 rounded-full text-sm font-bold">
            Create a Mall
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3 pb-8">
          {filtered.map((c) => (
            <Link href={`/mall/${c.id}`} key={c.id}>
              <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden hover:shadow-md hover:border-purple-300 transition">
                <div className="relative h-36">
                  <img src={c.imageUrl} alt={c.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                  <div className="absolute top-2 right-2">
                    <span className="bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">⚡ {c.deliveryDay}</span>
                  </div>
                  <div className="absolute bottom-2 left-3">
                    <p className="text-white font-bold">{c.name}</p>
                    <p className="text-zinc-300 text-xs">📍 {c.area}, {c.city}</p>
                  </div>
                </div>
                <div className="px-3 py-2 flex items-center justify-between">
                  <div className="flex gap-3 text-xs text-zinc-500">
                    <span>🏪 {c.memberCount} shops</span>
                    <span>⭐ {c.rating}</span>
                  </div>
                  <span className="text-purple-600 font-semibold text-xs">Enter →</span>
                </div>
              </div>
            </Link>
          ))}
          <Link href="/seller/create-community"
            className="flex items-center justify-center gap-2 border-2 border-dashed border-purple-300 rounded-2xl p-4 text-purple-600 hover:bg-purple-50 transition">
            <Plus className="w-5 h-5" />
            <span className="font-semibold text-sm">Create New Mall</span>
          </Link>
        </div>
      )}
    </div>
  );
}