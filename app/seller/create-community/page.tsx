"use client";
import { useState } from "react";
import { collection, addDoc, getDocs, query, where } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import Link from "next/link";

const CITIES = ["Indore", "Bhopal", "Jabalpur", "Gwalior", "Ujjain", "Sagar", "Ratlam", "Dewas", "Mumbai", "Delhi", "Pune", "Bangalore", "Hyderabad", "Chennai", "Kolkata", "Jaipur", "Surat", "Other"];

const MALL_TYPES = [
  { id: "mall", label: "🏬 Shopping Mall", desc: "Multiple shops under one roof" },
  { id: "market", label: "🛒 Local Market", desc: "Street market with variety" },
  { id: "bazaar", label: "🏪 Bazaar", desc: "Traditional Indian bazaar" },
  { id: "plaza", label: "🏢 Commercial Plaza", desc: "Business complex" },
];

export default function CreateCommunity() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [city, setCity] = useState("Indore");
  const [area, setArea] = useState("");
  const [type, setType] = useState("mall");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [deliveryDay, setDeliveryDay] = useState("Same Day");
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) { toast.error("Please login!"); return; }
    setLoading(true);
    try {
      const userSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
      const sellerName = userSnap.data()?.name ?? "Seller";

      // Check if seller already has a community
      const existing = await getDocs(
        query(collection(db, "communities"), where("ownerId", "==", auth.currentUser.uid))
      );

      const communityData = {
        name,
        city,
        area,
        type,
        description,
        imageUrl: imageUrl || `https://images.unsplash.com/photo-1567449303078-57ad995bd17f?w=600`,
        deliveryDay,
        ownerId: auth.currentUser.uid,
        ownerName: sellerName,
        memberCount: 1,
        productCount: 0,
        rating: 4.5,
        isActive: true,
        createdAt: new Date(),
        tags: [city, type, area].filter(Boolean),
      };

      let communityId = "";
      if (!existing.empty) {
        // Update existing
        communityId = existing.docs[0].id;
        toast.success("Community updated!");
      } else {
        const ref = await addDoc(collection(db, "communities"), communityData);
        communityId = ref.id;
        toast.success("Mall created! 🎉");
      }

      router.push(`/mall/${communityId}`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to create mall!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white px-4 py-8 max-w-md mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/seller/dashboard" className="text-zinc-400 hover:text-white">←</Link>
        <h1 className="text-xl font-bold">Create Your Mall 🏬</h1>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-6">
        <p className="text-purple-400 font-semibold text-sm mb-1">💡 What is a Mall Community?</p>
        <p className="text-zinc-400 text-xs leading-relaxed">
          Create a digital mall for your area! Multiple sellers join your community. Buyers can shop from all shops and get everything delivered on the same day — just like visiting a real mall!
        </p>
      </div>

      <form onSubmit={handleCreate} className="flex flex-col gap-4">

        {/* Mall name */}
        <div>
          <label className="text-zinc-400 text-xs block mb-1">Mall / Market Name *</label>
          <input required value={name} onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Vijay Nagar Mall, Sadar Bazar"
            className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none focus:ring-2 ring-purple-500"/>
        </div>

        {/* City */}
        <div>
          <label className="text-zinc-400 text-xs block mb-1">City *</label>
          <select value={city} onChange={(e) => setCity(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-sm text-white outline-none focus:ring-2 ring-purple-500">
            {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Area */}
        <div>
          <label className="text-zinc-400 text-xs block mb-1">Area / Locality *</label>
          <input required value={area} onChange={(e) => setArea(e.target.value)}
            placeholder="e.g. Vijay Nagar, Palasia, MG Road"
            className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none focus:ring-2 ring-purple-500"/>
        </div>

        {/* Mall type */}
        <div>
          <label className="text-zinc-400 text-xs block mb-2">Type *</label>
          <div className="grid grid-cols-2 gap-2">
            {MALL_TYPES.map((t) => (
              <button type="button" key={t.id} onClick={() => setType(t.id)}
                className={`p-3 rounded-2xl border text-left transition ${type === t.id ? "border-purple-500 bg-purple-600/20" : "border-zinc-700 bg-zinc-900 hover:border-zinc-600"}`}>
                <p className="text-sm font-semibold text-white">{t.label}</p>
                <p className="text-zinc-500 text-xs">{t.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="text-zinc-400 text-xs block mb-1">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder="Tell buyers what's special about your mall..."
            rows={3}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none focus:ring-2 ring-purple-500 resize-none"/>
        </div>

        {/* Image URL */}
        <div>
          <label className="text-zinc-400 text-xs block mb-1">Mall Image URL (optional)</label>
          <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)}
            placeholder="Paste image URL..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none focus:ring-2 ring-purple-500"/>
          {imageUrl && <img src={imageUrl} alt="preview" className="w-full h-32 object-cover rounded-xl mt-2"/>}
        </div>

        {/* Delivery */}
        <div>
          <label className="text-zinc-400 text-xs block mb-2">Delivery Promise</label>
          <div className="flex gap-2">
            {["Same Day", "Next Day", "2 Days"].map((d) => (
              <button type="button" key={d} onClick={() => setDeliveryDay(d)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition border ${deliveryDay === d ? "bg-green-600 border-green-500 text-white" : "border-zinc-700 text-zinc-400 hover:border-zinc-500"}`}>
                {d}
              </button>
            ))}
          </div>
        </div>

        <button disabled={loading} type="submit"
          className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 py-4 rounded-2xl font-bold text-white text-lg transition">
          {loading ? "Creating... ⏳" : "Create Mall 🏬"}
        </button>
      </form>
    </main>
  );
}