"use client";
import { useEffect, useState } from "react";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import toast from "react-hot-toast";

type Reel = { id: string; caption: string; sellerName: string; productName: string; price: number; videoUrl: string; productImage: string; };
type Product = { id: string; name: string; price: number; imageUrl: string; sellerId: string; description: string; };

export default function AdminDashboard() {
  const [reels, setReels] = useState<Reel[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [tab, setTab] = useState<"reels" | "products">("reels");
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    const reelsSnap = await getDocs(collection(db, "reels"));
    const productsSnap = await getDocs(collection(db, "products"));
    setReels(reelsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Reel)));
    setProducts(productsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Product)));
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const deleteReel = async (id: string) => {
    if (!confirm("Delete this reel?")) return;
    await deleteDoc(doc(db, "reels", id));
    toast.success("Reel deleted!");
    fetchData();
  };

  const deleteProduct = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    await deleteDoc(doc(db, "products", id));
    toast.success("Product deleted!");
    fetchData();
  };

  return (
    <main className="min-h-screen bg-black text-white px-4 py-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">
        Com<span className="text-purple-500">ence</span> Admin
      </h1>
      <p className="text-zinc-400 text-sm mb-6">Full control panel</p>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <p className="text-3xl font-bold text-purple-400">{reels.length}</p>
          <p className="text-zinc-400 text-sm">Total Reels</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <p className="text-3xl font-bold text-purple-400">{products.length}</p>
          <p className="text-zinc-400 text-sm">Total Products</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button onClick={() => setTab("reels")}
          className={`px-6 py-2 rounded-full font-semibold text-sm transition ${tab === "reels" ? "bg-purple-600 text-white" : "bg-zinc-900 text-zinc-400"}`}>
          Reels
        </button>
        <button onClick={() => setTab("products")}
          className={`px-6 py-2 rounded-full font-semibold text-sm transition ${tab === "products" ? "bg-purple-600 text-white" : "bg-zinc-900 text-zinc-400"}`}>
          Products
        </button>
      </div>

      {loading ? (
        <p className="text-zinc-500 text-center">Loading...</p>
      ) : tab === "reels" ? (
        <div className="flex flex-col gap-3">
          {reels.length === 0 && <p className="text-zinc-500">No reels yet!</p>}
          {reels.map((reel) => (
            <div key={reel.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <img src={reel.productImage} alt={reel.productName}
                  className="w-14 h-14 rounded-xl object-cover bg-zinc-800"/>
                <div className="flex-1">
                  <p className="text-white font-semibold text-sm">{reel.productName}</p>
                  <p className="text-purple-400 text-sm">₹{reel.price}</p>
                  <p className="text-zinc-500 text-xs">@{reel.sellerName}</p>
                </div>
              </div>
              <p className="text-zinc-400 text-xs mb-3 line-clamp-2">{reel.caption}</p>
              <div className="flex gap-2">
                <a href={reel.videoUrl} target="_blank"
                  className="flex-1 text-center bg-zinc-800 hover:bg-zinc-700 text-white text-xs py-2 rounded-xl transition">
                  View Video
                </a>
                <button onClick={() => deleteReel(reel.id)}
                  className="flex-1 bg-red-600/20 hover:bg-red-600/40 text-red-400 text-xs py-2 rounded-xl transition">
                  Delete Reel
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {products.length === 0 && <p className="text-zinc-500">No products yet!</p>}
          {products.map((product) => (
            <div key={product.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <img src={product.imageUrl} alt={product.name}
                  className="w-14 h-14 rounded-xl object-cover bg-zinc-800"/>
                <div className="flex-1">
                  <p className="text-white font-semibold text-sm">{product.name}</p>
                  <p className="text-purple-400 text-sm">₹{product.price}</p>
                  <p className="text-zinc-500 text-xs line-clamp-1">{product.description}</p>
                </div>
                <button onClick={() => deleteProduct(product.id)}
                  className="bg-red-600/20 hover:bg-red-600/40 text-red-400 text-xs px-3 py-2 rounded-xl transition">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}