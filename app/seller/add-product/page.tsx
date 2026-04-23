"use client";
import { useState } from "react";
import { collection, addDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import Link from "next/link";

const CATEGORIES = ["Electronics", "Fashion", "Beauty", "Food", "Sports", "Home", "Other"];

export default function AddProduct() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [stock, setStock] = useState("1");
  const [category, setCategory] = useState("Electronics");
  const [offer, setOffer] = useState("");
  const [images, setImages] = useState<string[]>(["", "", ""]);
  const [loading, setLoading] = useState(false);

  const handleImageChange = (index: number, value: string) => {
    const updated = [...images];
    updated[index] = value;
    setImages(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) { toast.error("Please login!"); return; }
    const validImages = images.filter((img) => img.trim() !== "");
    if (validImages.length === 0) { toast.error("Add at least one image URL!"); return; }
    setLoading(true);
    try {
      await addDoc(collection(db, "products"), {
        name,
        price: Number(price),
        description,
        stock: Number(stock),
        category,
        offer: offer ? Number(offer) : null,
        imageUrl: validImages[0],
        images: validImages,
        sellerId: auth.currentUser.uid,
        createdAt: new Date(),
      });
      toast.success("Product added! 🎉");
      router.push("/seller/dashboard");
    } catch (err) {
      console.error(err);
      toast.error("Failed to add product");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-black px-4 py-8 max-w-md mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/seller/dashboard" className="text-zinc-400 hover:text-white">←</Link>
        <h1 className="text-xl font-bold text-white">Add Product</h1>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">

        {/* Multiple images */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <p className="text-white font-semibold mb-3">Product Images (up to 3)</p>
          {images.map((img, i) => (
            <div key={i} className="mb-3">
              <label className="text-zinc-400 text-xs block mb-1">Image {i + 1} URL {i === 0 && "(required)"}</label>
              <input value={img} onChange={(e) => handleImageChange(i, e.target.value)}
                placeholder={`Paste image ${i + 1} URL...`}
                className="w-full bg-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:ring-2 ring-purple-500"/>
              {img && (
                <img src={img} alt={`preview ${i}`}
                  className="w-full h-32 object-cover rounded-xl mt-2"/>
              )}
            </div>
          ))}
        </div>

        <input required value={name} onChange={(e) => setName(e.target.value)}
          placeholder="Product name"
          className="bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none focus:ring-2 ring-purple-500"/>

        <input required type="number" value={price} onChange={(e) => setPrice(e.target.value)}
          placeholder="Price (₹)"
          className="bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none focus:ring-2 ring-purple-500"/>

        <textarea required value={description} onChange={(e) => setDescription(e.target.value)}
          placeholder="Product description" rows={3}
          className="bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none focus:ring-2 ring-purple-500 resize-none"/>

        <input required type="number" value={stock} onChange={(e) => setStock(e.target.value)}
          placeholder="Stock quantity"
          className="bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none focus:ring-2 ring-purple-500"/>

        <select value={category} onChange={(e) => setCategory(e.target.value)}
          className="bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-sm text-white outline-none focus:ring-2 ring-purple-500">
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        {/* Offer */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <p className="text-white font-semibold mb-2">🎁 Add Offer (optional)</p>
          <div className="flex items-center gap-3">
            <input type="number" value={offer} onChange={(e) => setOffer(e.target.value)}
              placeholder="Discount % e.g. 20"
              min="0" max="90"
              className="flex-1 bg-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none focus:ring-2 ring-purple-500"/>
            <span className="text-white font-bold text-lg">% OFF</span>
          </div>
          {offer && (
            <p className="text-green-400 text-xs mt-2">
              ✅ Product will show {offer}% off badge!
            </p>
          )}
        </div>

        <button disabled={loading} type="submit"
          className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 py-4 rounded-2xl font-bold text-white text-lg transition">
          {loading ? "Adding... ⏳" : "Add Product 🚀"}
        </button>
      </form>
    </main>
  );
}