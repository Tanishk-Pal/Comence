"use client";
import { useEffect, useState } from "react";
import { collection, getDocs, query, where, deleteDoc, doc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import Link from "next/link";
import { Video, Package, BarChart3, Plus, Image, Star, Trash2, LogOut } from "lucide-react";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

type Product = { id: string; name: string; price: number; stock: number; imageUrl: string; description: string; };
type Reel = { id: string; productName: string; caption: string; likes: number; videoUrl: string; };

export default function SellerDashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [reels, setReels] = useState<Reel[]>([]);
  const [tab, setTab] = useState<"dashboard" | "products" | "reels" | "publish">("dashboard");
  const [loading, setLoading] = useState(true);
  const user = auth.currentUser;
  const router = useRouter();

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    const pSnap = await getDocs(query(collection(db, "products"), where("sellerId", "==", user.uid)));
    const rSnap = await getDocs(query(collection(db, "reels"), where("sellerId", "==", user.uid)));
    setProducts(pSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Product)));
    setReels(rSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Reel)));
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/");
    toast.success("Logged out!");
  };

  const deleteProduct = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    await deleteDoc(doc(db, "products", id));
    toast.success("Product deleted!");
    fetchData();
  };

  const deleteReel = async (id: string) => {
    if (!confirm("Delete this reel?")) return;
    await deleteDoc(doc(db, "reels", id));
    toast.success("Reel deleted!");
    fetchData();
  };

  return (
    <div className="bg-black min-h-screen max-w-md mx-auto">
      {/* Header */}
      <div className="px-4 pt-6 pb-4 border-b border-zinc-800 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">
            Com<span className="text-purple-500">ence</span> Studio
          </h1>
          <p className="text-zinc-400 text-xs mt-0.5">Seller Dashboard</p>
        </div>
        <button onClick={handleLogout}
          className="flex items-center gap-2 text-zinc-400 hover:text-red-400 text-sm transition">
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 px-4 py-3 overflow-x-auto border-b border-zinc-800">
        {[
          { id: "dashboard", label: "📊 Overview" },
          { id: "products", label: "📦 Products" },
          { id: "reels", label: "🎬 Reels" },
          { id: "publish", label: "➕ Publish" },
        ].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id as typeof tab)}
            className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition ${tab === t.id ? "bg-purple-600 text-white" : "bg-zinc-900 text-zinc-400"}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="px-4 py-4">

        {/* DASHBOARD TAB */}
        {tab === "dashboard" && (
          <div>
            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              {[
                { label: "Products", value: products.length, icon: "📦", color: "text-blue-400" },
                { label: "Reels", value: reels.length, icon: "🎬", color: "text-purple-400" },
                { label: "Total Stock", value: products.reduce((s, p) => s + p.stock, 0), icon: "🏪", color: "text-green-400" },
                { label: "Total Likes", value: reels.reduce((s, r) => s + r.likes, 0), icon: "❤️", color: "text-red-400" },
              ].map((s) => (
                <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                  <p className="text-2xl mb-1">{s.icon}</p>
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-zinc-400 text-sm">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Quick actions */}
            <p className="text-white font-bold mb-3">Quick Actions</p>
            <div className="grid grid-cols-2 gap-3 mb-6">
              <Link href="/seller/add-product"
                className="flex items-center gap-3 bg-purple-600 hover:bg-purple-700 rounded-2xl p-4 transition">
                <Package className="w-6 h-6 text-white" />
                <span className="text-white font-semibold text-sm">Add Product</span>
              </Link>
              <Link href="/seller/upload-reel"
                className="flex items-center gap-3 bg-zinc-800 hover:bg-zinc-700 rounded-2xl p-4 border border-zinc-700 transition">
                <Video className="w-6 h-6 text-purple-400" />
                <span className="text-white font-semibold text-sm">Upload Reel</span>
              </Link>

              <Link href="/seller/go-live"
                className="flex items-center gap-3 bg-red-600/20 hover:bg-red-600/30 rounded-2xl p-4 border border-red-500/30 transition">
                <Video className="w-6 h-6 text-red-400" />
                <span className="text-white font-semibold text-sm">🔴 Go Live</span>
              </Link>
              <button onClick={() => setTab("publish")}
                className="flex items-center gap-3 bg-zinc-800 hover:bg-zinc-700 rounded-2xl p-4 border border-zinc-700 transition">
                <Image className="w-6 h-6 text-blue-400" />
                <span className="text-white font-semibold text-sm">Post Images</span>
              </button>
              <button onClick={() => setTab("products")}
                className="flex items-center gap-3 bg-zinc-800 hover:bg-zinc-700 rounded-2xl p-4 border border-zinc-700 transition">
                <BarChart3 className="w-6 h-6 text-green-400" />
                <span className="text-white font-semibold text-sm">My Products</span>
              </button>
            </div>

            {/* Tips */}
            <div className="bg-purple-900/30 border border-purple-500/30 rounded-2xl p-4">
              <p className="text-purple-400 font-semibold mb-2">💡 Seller Tips</p>
              <p className="text-zinc-400 text-sm mb-1">• Upload reels to get 3x more views</p>
              <p className="text-zinc-400 text-sm mb-1">• Add clear product images to boost sales</p>
              <p className="text-zinc-400 text-sm">• Reply to comments to build trust</p>
            </div>
          </div>
        )}

        {/* PRODUCTS TAB */}
        {tab === "products" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-white font-bold">My Products ({products.length})</p>
              <Link href="/seller/add-product"
                className="bg-purple-600 text-white text-xs font-bold px-3 py-2 rounded-full flex items-center gap-1">
                <Plus className="w-3 h-3" /> Add New
              </Link>
            </div>
            {loading ? (
              <p className="text-zinc-500 text-center">Loading...</p>
            ) : products.length === 0 ? (
              <div className="text-center mt-10">
                <p className="text-4xl mb-3">📦</p>
                <p className="text-zinc-400">No products yet!</p>
                <Link href="/seller/add-product"
                  className="mt-4 inline-block bg-purple-600 text-white px-6 py-2 rounded-full text-sm font-bold">
                  Add First Product
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {products.map((p) => (
                  <div key={p.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3">
                    <div className="flex items-center gap-3 mb-3">
                      <img src={p.imageUrl} alt={p.name}
                        className="w-16 h-16 rounded-xl object-cover bg-zinc-800" />
                      <div className="flex-1">
                        <p className="text-white font-semibold text-sm">{p.name}</p>
                        <p className="text-purple-400 font-bold">₹{p.price}</p>
                        <p className="text-zinc-500 text-xs">Stock: {p.stock}</p>
                      </div>
                    </div>
                    {/* Product actions */}
                    <div className="grid grid-cols-3 gap-2">
                      <Link href="/seller/upload-reel"
                        className="flex flex-col items-center gap-1 bg-zinc-800 rounded-xl p-2 text-center hover:bg-zinc-700">
                        <Video className="w-4 h-4 text-purple-400" />
                        <span className="text-zinc-300 text-xs">Add Reel</span>
                      </Link>
                      <button onClick={() => setTab("publish")}
                        className="flex flex-col items-center gap-1 bg-zinc-800 rounded-xl p-2 hover:bg-zinc-700">
                        <Image className="w-4 h-4 text-blue-400" />
                        <span className="text-zinc-300 text-xs">Add Post</span>
                      </button>
                      <button onClick={() => deleteProduct(p.id)}
                        className="flex flex-col items-center gap-1 bg-red-600/10 rounded-xl p-2 hover:bg-red-600/20">
                        <Trash2 className="w-4 h-4 text-red-400" />
                        <span className="text-red-400 text-xs">Delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* REELS TAB */}
        {tab === "reels" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-white font-bold">My Reels ({reels.length})</p>
              <Link href="/seller/upload-reel"
                className="bg-purple-600 text-white text-xs font-bold px-3 py-2 rounded-full flex items-center gap-1">
                <Plus className="w-3 h-3" /> Upload
              </Link>
            </div>
            {reels.length === 0 ? (
              <div className="text-center mt-10">
                <p className="text-4xl mb-3">🎬</p>
                <p className="text-zinc-400">No reels yet!</p>
                <Link href="/seller/upload-reel"
                  className="mt-4 inline-block bg-purple-600 text-white px-6 py-2 rounded-full text-sm font-bold">
                  Upload First Reel
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {reels.map((r) => (
                  <div key={r.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                    <div className="relative h-40 bg-zinc-800">
                      <video src={r.videoUrl} muted playsInline
                        className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-2">
                        <p className="text-white text-xs font-semibold line-clamp-1">{r.productName}</p>
                      </div>
                    </div>
                    <div className="p-2">
                      <p className="text-zinc-400 text-xs line-clamp-1 mb-2">{r.caption}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-red-400 text-xs">❤️ {r.likes}</span>
                        <button onClick={() => deleteReel(r.id)}
                          className="text-red-400 hover:text-red-300">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* PUBLISH TAB */}
        {tab === "publish" && (
          <div>
            <p className="text-white font-bold mb-4">Publish Content</p>
            <div className="flex flex-col gap-3">
              <Link href="/seller/upload-reel"
                className="flex items-center gap-4 bg-zinc-900 border border-zinc-800 rounded-2xl p-4 hover:border-purple-500 transition">
                <div className="w-12 h-12 bg-purple-600/20 rounded-2xl flex items-center justify-center">
                  <Video className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <p className="text-white font-semibold">Upload Reel</p>
                  <p className="text-zinc-500 text-xs">Short video to promote product</p>
                </div>
                <span className="ml-auto text-zinc-500">→</span>
              </Link>

              <Link href="/seller/add-product"
                className="flex items-center gap-4 bg-zinc-900 border border-zinc-800 rounded-2xl p-4 hover:border-purple-500 transition">
                <div className="w-12 h-12 bg-blue-600/20 rounded-2xl flex items-center justify-center">
                  <Image className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <p className="text-white font-semibold">Add Product Post</p>
                  <p className="text-zinc-500 text-xs">Product images with description</p>
                </div>
                <span className="ml-auto text-zinc-500">→</span>
              </Link>

              <Link href="/seller/add-product"
                className="flex items-center gap-4 bg-zinc-900 border border-zinc-800 rounded-2xl p-4 hover:border-purple-500 transition">
                <div className="w-12 h-12 bg-green-600/20 rounded-2xl flex items-center justify-center">
                  <Package className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <p className="text-white font-semibold">Add New Product</p>
                  <p className="text-zinc-500 text-xs">List product with price and stock</p>
                </div>
                <span className="ml-auto text-zinc-500">→</span>
              </Link>

              <Link href="/seller/add-product"
                className="flex items-center gap-4 bg-zinc-900 border border-zinc-800 rounded-2xl p-4 hover:border-purple-500 transition">
                <div className="w-12 h-12 bg-yellow-600/20 rounded-2xl flex items-center justify-center">
                  <Star className="w-6 h-6 text-yellow-400" />
                </div>
                <div>
                  <p className="text-white font-semibold">Request Reviews</p>
                  <p className="text-zinc-500 text-xs">Get buyers to review your product</p>
                </div>
                <span className="ml-auto text-zinc-500">→</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}