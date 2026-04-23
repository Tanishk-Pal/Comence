"use client";
import { useEffect, useState } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useCartStore } from "@/store/cartStore";
import { Home, Play, Search, ShoppingCart, User, Star, Zap, Tag, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Product = { id: string; name: string; price: number; imageUrl: string; description: string; sellerId: string; category?: string; offer?: number; };
type Reel = { id: string; videoUrl: string; caption: string; sellerName: string; productName: string; price: number; productImage: string; likes: number; };

export default function BuyerFeed() {
  const [tab, setTab] = useState<"home" | "reels" | "search" | "cart" | "profile">("home");
  const [products, setProducts] = useState<Product[]>([]);
  const [reels, setReels] = useState<Reel[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const { addItem, items, total, removeItem, clearCart } = useCartStore();
  const router = useRouter();

  useEffect(() => {
    const fetchAll = async () => {
      const pSnap = await getDocs(collection(db, "products"));
      const rSnap = await getDocs(query(collection(db, "reels"), orderBy("createdAt", "desc")));
      setProducts(pSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Product)));
      setReels(rSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Reel)));
    };
    fetchAll();
  }, []);

  const handleBuyNow = (p: Product) => {
    addItem({ id: p.id, name: p.name, price: p.price, image: p.imageUrl, quantity: 1 });
    router.push("/buyer/checkout");
  };

  const handleAddToCart = (p: Product) => {
    addItem({ id: p.id, name: p.name, price: p.price, image: p.imageUrl, quantity: 1 });
    toast.success(`${p.name} added to cart! 🛒`);
  };

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const filteredProducts = products.filter((p) =>
    selectedCategory === "All" || p.category === selectedCategory
  );

  return (
    <div className="bg-white text-zinc-900 min-h-screen flex flex-col w-full">

      {/* Top navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-zinc-200 shadow-sm px-4 py-3 flex items-center gap-3">
        <span className="text-xl font-bold text-zinc-900 flex-shrink-0">Com<span className="text-purple-500">ence</span></span>

        {/* Google-style search bar */}
        <div className="flex-1 flex items-center gap-2 bg-zinc-100 border border-zinc-300 hover:border-zinc-400 rounded-full px-4 py-2 shadow-sm transition">
          <Search className="w-4 h-4 text-zinc-400 flex-shrink-0" />
          <input
            type="text"
            placeholder="Search products, categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && search.trim()) {
                router.push(`/search?q=${encodeURIComponent(search)}`);
              }
            }}
            className="flex-1 bg-transparent text-sm text-zinc-900 placeholder-zinc-400 outline-none min-w-0"
          />
          {search && (
            <button onClick={() => setSearch("")} className="text-zinc-400 hover:text-zinc-600 text-lg leading-none">×</button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <Link href="/auth/signup?role=seller"
            className="hidden md:block bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold px-3 py-1.5 rounded-full transition">
            Sell Your Product
          </Link>
          <button onClick={() => setTab("cart")} className="relative">
            <ShoppingCart className="w-6 h-6 text-zinc-700" />
            {items.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-purple-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">
                {items.length}
              </span>
            )}
          </button>
          <button onClick={() => setTab("profile")}>
            <User className="w-6 h-6 text-zinc-500 hover:text-zinc-900" />
          </button>
        </div>
      </nav>

      {/* Main layout */}
      <div className="flex mt-14 min-h-screen">

        {/* PC Sidebar */}
        <div className="hidden md:flex flex-col fixed left-0 top-14 bottom-0 w-56 bg-white border-r border-zinc-200 p-4 gap-1 z-40">
          {[
            { id: "home", emoji: "🏠", label: "Home" },
            { id: "reels", emoji: "🎬", label: "Reels" },
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
          <div className="mt-auto">
            <Link href="/auth/signup?role=seller"
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold bg-purple-100 text-purple-600 hover:bg-purple-600 hover:text-white transition">
              <span>🏪</span> Become a Seller
            </Link>
          </div>
        </div>

        {/* Page content */}
        <div className="flex-1 md:ml-56 mb-16 md:mb-0 overflow-y-auto">

          {/* HOME TAB */}
          {tab === "home" && (
            <div>
              {/* Banner */}
              <div className="bg-gradient-to-r from-purple-900 via-purple-700 to-purple-500 mx-4 mt-4 rounded-2xl p-6 md:p-8">
                <p className="text-yellow-400 text-xs font-bold mb-1">🔥 LIMITED TIME OFFER</p>
                <p className="text-white text-2xl md:text-3xl font-bold mb-1">Up to 70% OFF</p>
                <p className="text-purple-200 text-sm mb-4">On top products today only!</p>
                <button className="bg-white text-purple-700 text-sm font-bold px-6 py-2 rounded-full">
                  Shop Now →
                </button>
              </div>

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
                  <span className="ml-auto text-purple-600 text-sm cursor-pointer font-semibold">See all →</span>
                </div>
                <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-3">
                  {products.slice(0, 7).map((p) => (
                    <Link href={`/buyer/product/${p.id}`} key={p.id}>
                      <div className="bg-white border border-zinc-200 rounded-2xl p-3 hover:border-purple-400 hover:shadow-md transition">
                        <div className="relative mb-2">
                          <img src={p.imageUrl} alt={p.name}
                            className="w-full h-24 md:h-32 object-cover rounded-xl" />
                          <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                            SALE
                          </span>
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
                  <button onClick={() => setTab("reels")}
                    className="ml-auto text-purple-600 text-sm font-semibold">See all →</button>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {reels.slice(0, 8).map((r) => (
                    <button key={r.id} onClick={() => setTab("reels")}
                      className="relative min-w-32 h-48 rounded-2xl overflow-hidden flex-shrink-0 bg-zinc-100 hover:scale-105 transition shadow-sm">
                      <video src={r.videoUrl} muted playsInline
                        className="w-full h-full object-cover" />
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
                  <p className="text-zinc-900 font-bold text-lg">
                    {selectedCategory === "All" ? "All Products" : selectedCategory}
                  </p>
                  <span className="text-zinc-400 text-sm">({filteredProducts.length})</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {(search ? filtered : filteredProducts).map((p) => (
                    <div key={p.id} className="bg-white border border-zinc-200 rounded-2xl overflow-hidden hover:shadow-lg hover:border-purple-300 transition">
                      <div className="relative">
                        <Link href={`/buyer/product/${p.id}`}>
                          <img src={p.imageUrl} alt={p.name}
                            className="w-full h-44 object-cover hover:opacity-90 transition" />
                        </Link>
                        <span className="absolute top-2 left-2 bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                          In Stock
                        </span>
                        {p.offer && (
                          <span className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                            {p.offer}% OFF
                          </span>
                        )}
                      </div>
                      <div className="p-3">
                        <p className="text-zinc-900 text-sm font-semibold line-clamp-1">{p.name}</p>
                        <p className="text-zinc-400 text-xs line-clamp-1 mb-1">{p.description}</p>
                        <div className="flex gap-0.5 mb-2">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star key={s} className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                          ))}
                        </div>
                        <p className="text-purple-600 font-bold text-base mb-2">₹{p.price}</p>
                        <div className="flex gap-1.5">
                          <button onClick={() => handleAddToCart(p)}
                            className="flex-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-bold py-2 rounded-xl transition">
                            🛒 Cart
                          </button>
                          <button onClick={() => handleBuyNow(p)}
                            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold py-2 rounded-xl transition">
                            ⚡ Buy
                          </button>
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
              <div className="w-full max-w-sm snap-y snap-mandatory overflow-y-scroll"
                style={{ height: "calc(100vh - 56px)" }}>
                {reels.length === 0 && (
                  <div className="flex items-center justify-center h-full text-zinc-500">
                    No reels yet!
                  </div>
                )}
                {reels.map((reel) => (
                  <div key={reel.id} className="relative snap-start bg-zinc-900"
                    style={{ height: "calc(100vh - 56px)" }}>
                    <video src={reel.videoUrl} autoPlay loop muted playsInline
                      className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <p className="text-white font-bold text-sm mb-1">@{reel.sellerName}</p>
                      <p className="text-zinc-300 text-xs mb-3">{reel.caption}</p>
                      <div className="flex items-center gap-3 bg-white/10 backdrop-blur rounded-2xl p-3">
                        <img src={reel.productImage} alt={reel.productName}
                          className="w-12 h-12 rounded-xl object-cover" />
                        <div className="flex-1">
                          <p className="text-white text-sm font-bold">{reel.productName}</p>
                          <p className="text-purple-400 font-bold">₹{reel.price}</p>
                        </div>
                        <button onClick={() => {
                          addItem({ id: reel.id, name: reel.productName, price: reel.price, image: reel.productImage, quantity: 1 });
                          router.push("/buyer/checkout");
                        }} className="bg-purple-600 text-white text-xs font-bold px-4 py-2 rounded-xl">
                          Buy ⚡
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SEARCH TAB */}
          {tab === "search" && (
            <div className="px-4 mt-4">
              <div className="flex items-center gap-2 bg-zinc-100 border border-zinc-300 rounded-full px-4 py-2.5 mb-4 shadow-sm">
                <Search className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                <input value={search} onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && search.trim()) router.push(`/search?q=${encodeURIComponent(search)}`);
                  }}
                  placeholder="Search products..."
                  className="flex-1 bg-transparent text-sm text-zinc-900 placeholder-zinc-400 outline-none" />
                {search && (
                  <button onClick={() => setSearch("")} className="text-zinc-400 text-lg leading-none">×</button>
                )}
              </div>
              {search && (
                <p className="text-zinc-400 text-sm mb-4">{filtered.length} results for "{search}"</p>
              )}
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
                        <button onClick={() => handleAddToCart(p)}
                          className="flex-1 bg-zinc-100 text-zinc-800 text-xs font-bold py-2 rounded-xl hover:bg-zinc-200 transition">
                          🛒 Cart
                        </button>
                        <button onClick={() => handleBuyNow(p)}
                          className="flex-1 bg-purple-600 text-white text-xs font-bold py-2 rounded-xl hover:bg-purple-700 transition">
                          ⚡ Buy
                        </button>
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
                  <button onClick={() => setTab("home")}
                    className="mt-4 bg-purple-600 text-white px-8 py-3 rounded-full font-bold">
                    Start Shopping
                  </button>
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
                        <button onClick={() => removeItem(item.id)}
                          className="text-red-400 hover:text-red-500 self-start mt-1">
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
                      <div className="flex justify-between text-zinc-400 text-sm mb-2">
                        <span>Subtotal ({items.length} items)</span>
                        <span>₹{total()}</span>
                      </div>
                      <div className="flex justify-between text-zinc-400 text-sm mb-2">
                        <span>Delivery</span>
                        <span className="text-green-600 font-semibold">FREE</span>
                      </div>
                      <div className="border-t border-zinc-200 pt-3 mt-3 flex justify-between text-zinc-900 font-bold text-lg">
                        <span>Total</span>
                        <span className="text-purple-600">₹{total()}</span>
                      </div>
                    </div>
                    <Link href="/buyer/checkout"
                      className="block w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 rounded-2xl text-center text-lg transition">
                      Checkout ⚡
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PROFILE TAB */}
          {tab === "profile" && (
            <div className="px-4 mt-6 max-w-md mx-auto">
              <div className="text-center mb-6">
                <div className="w-24 h-24 rounded-full bg-purple-600 flex items-center justify-center text-4xl font-bold text-white mx-auto mb-3">
                  T
                </div>
                <p className="text-zinc-900 font-bold text-xl">My Account</p>
                <p className="text-zinc-400 text-sm">Manage your profile</p>
              </div>
              <div className="flex flex-col gap-3">
                <div className="bg-white border border-zinc-200 rounded-2xl p-4 text-zinc-900 flex items-center gap-3 shadow-sm">
                  <span className="text-2xl">📦</span>
                  <div>
                    <p className="font-semibold">My Orders</p>
                    <p className="text-zinc-400 text-xs">Track your orders</p>
                  </div>
                </div>
                <Link href="/auth/signup?role=seller"
                  className="bg-white border border-zinc-200 rounded-2xl p-4 text-zinc-900 flex items-center gap-3 hover:border-purple-400 transition shadow-sm">
                  <span className="text-2xl">🏪</span>
                  <div>
                    <p className="font-semibold">Become a Seller</p>
                    <p className="text-zinc-400 text-xs">Start selling your products</p>
                  </div>
                </Link>
                <Link href="/admin/dashboard"
                  className="bg-white border border-zinc-200 rounded-2xl p-4 text-zinc-900 flex items-center gap-3 hover:border-purple-400 transition shadow-sm">
                  <span className="text-2xl">⚙️</span>
                  <div>
                    <p className="font-semibold">Admin Panel</p>
                    <p className="text-zinc-400 text-xs">Manage the platform</p>
                  </div>
                </Link>
                <Link href="/"
                  className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-500 flex items-center gap-3 hover:bg-red-100 transition">
                  <span className="text-2xl">🚪</span>
                  <div>
                    <p className="font-semibold">Logout</p>
                    <p className="text-red-300 text-xs">Sign out of your account</p>
                  </div>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom navigation — mobile only */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-200 flex justify-around py-3 z-50 shadow-lg">
        {[
          { id: "home", icon: <Home className="w-6 h-6" />, label: "Home" },
          { id: "reels", icon: <Play className="w-6 h-6" />, label: "Reels" },
          { id: "search", icon: <Search className="w-6 h-6" />, label: "Search" },
          { id: "cart", icon: <ShoppingCart className="w-6 h-6" />, label: "Cart" },
          { id: "profile", icon: <User className="w-6 h-6" />, label: "Profile" },
        ].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id as typeof tab)}
            className={`flex flex-col items-center gap-1 transition ${tab === t.id ? "text-purple-600" : "text-zinc-400"}`}>
            {t.icon}
            <span className="text-xs">{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}