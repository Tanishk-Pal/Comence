"use client";
import { useState, useEffect } from "react";
import { collection, addDoc, getDocs, query, where, doc, getDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Product = { id: string; name: string; price: number; imageUrl: string; };

export default function UploadReel() {
  const router = useRouter();
  const [caption, setCaption] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [selectedProductData, setSelectedProductData] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchProducts = async () => {
      if (!auth.currentUser) return;
      const q = query(collection(db, "products"), where("sellerId", "==", auth.currentUser.uid));
      const snap = await getDocs(q);
      setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Product)));
    };
    fetchProducts();
  }, []);

  const handleProductChange = (id: string) => {
    setSelectedProduct(id);
    const product = products.find((p) => p.id === id);
    setSelectedProductData(product ?? null);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !selectedProduct || !videoUrl) {
      toast.error("Please fill all fields!");
      return;
    }
    setLoading(true);
    try {
      const product = products.find((p) => p.id === selectedProduct);
      const userSnap = await getDoc(doc(db, "users", auth.currentUser!.uid));
      const sellerName = userSnap.data()?.name ?? "seller";

      await addDoc(collection(db, "reels"), {
        videoUrl,
        caption,
        productName: product?.name,
        price: product?.price,
        productImage: product?.imageUrl,
        productId: selectedProduct,
        sellerId: auth.currentUser!.uid,
        sellerName,
        likes: 0,
        createdAt: new Date(),
      });
      toast.success("Reel published! 🎉");
      router.push("/seller/dashboard");
    } catch (err) {
      console.error(err);
      toast.error("Upload failed. Try again!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-black px-4 py-8 max-w-md mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/seller/dashboard" className="text-zinc-400 hover:text-white text-xl">←</Link>
        <h1 className="text-xl font-bold text-white">Upload Reel</h1>
      </div>

      <form onSubmit={handleUpload} className="flex flex-col gap-4">

        {/* Video URL input */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3">
          <label className="text-zinc-400 text-xs block mb-2">Video URL</label>
          <input required value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="Paste video URL here e.g. https://..."
            className="w-full bg-transparent text-sm text-white placeholder-zinc-500 outline-none"/>
        </div>

        {/* Video preview */}
        {videoUrl && (
          <video src={videoUrl} controls
            className="w-full rounded-2xl max-h-72 object-cover bg-zinc-900"/>
        )}

        <textarea required value={caption} onChange={(e) => setCaption(e.target.value)}
          placeholder="Write a caption... 🔥" rows={3}
          className="bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none focus:ring-2 ring-purple-500 resize-none"/>

        {/* Product selector */}
        <select required value={selectedProduct} onChange={(e) => handleProductChange(e.target.value)}
          className="bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-sm text-white outline-none focus:ring-2 ring-purple-500">
          <option value="">🛍️ Link a product to this reel</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>{p.name} — ₹{p.price}</option>
          ))}
        </select>

        {/* Product preview card */}
        {selectedProductData && (
          <div className="flex items-center gap-3 bg-zinc-900 border border-purple-500/30 rounded-2xl p-3">
            <img src={selectedProductData.imageUrl} alt={selectedProductData.name}
              className="w-16 h-16 rounded-xl object-cover bg-zinc-800"/>
            <div>
              <p className="text-white font-semibold text-sm">{selectedProductData.name}</p>
              <p className="text-purple-400 font-bold text-lg">₹{selectedProductData.price}</p>
              <p className="text-zinc-500 text-xs">This product will show on your reel</p>
            </div>
          </div>
        )}

        <button disabled={loading} type="submit"
          className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 py-4 rounded-2xl font-bold text-white text-lg transition">
          {loading ? "Publishing... ⏳" : "Publish Reel 🚀"}
        </button>
      </form>

      {/* Helper text */}
      <div className="mt-6 bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
        <p className="text-zinc-400 text-xs font-semibold mb-2">📹 Free video URLs to use:</p>
        <p className="text-zinc-500 text-xs mb-1">• https://www.w3schools.com/html/mov_bbb.mp4</p>
        <p className="text-zinc-500 text-xs">• https://www.w3schools.com/html/movie.mp4</p>
      </div>
    </main>
  );
}