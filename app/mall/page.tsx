"use client";
import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Search, MapPin, Star, ShoppingBag, ChevronRight, Store } from "lucide-react";
import Link from "next/link";

type Community = {
  id: string;
  name: string;
  city: string;
  area: string;
  type: string;
  description: string;
  imageUrl: string;
  deliveryDay: string;
  memberCount: number;
  productCount: number;
  rating: number;
  ownerName: string;
};

const CITIES = ["All", "Indore", "Bhopal", "Jabalpur", "Gwalior", "Ujjain", "Mumbai", "Delhi", "Pune", "Bangalore"];

export default function MallPage() {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [filtered, setFiltered] = useState<Community[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCity, setSelectedCity] = useState("All");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const snap = await getDocs(collection(db, "communities"));
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Community));
      setCommunities(data);
      setFiltered(data);
      setLoading(false);
    };
    fetch();
  }, []);

  useEffect(() => {
    let result = communities;
    if (selectedCity !== "All") result = result.filter((c) => c.city === selectedCity);
    if (search.trim()) {
      result = result.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.area.toLowerCase().includes(search.toLowerCase()) ||
        c.city.toLowerCase().includes(search.toLowerCase())
      );
    }
    setFiltered(result);
  }, [search, selectedCity, communities]);

  const typeEmoji: Record<string, string> = {
    mall: "🏬", market: "🛒", bazaar: "🏪", plaza: "🏢",
  };

  return (
    <div className="min-h-screen bg-white">

      {/* Header */}
      <div className="bg-gradient-to-br from-purple-900 to-black px-4 pt-10 pb-8">
        <Link href="/buyer/feed" className="text-zinc-400 hover:text-white text-sm mb-4 block">← Back to Home</Link>
        <h1 className="text-3xl font-bold text-white mb-1">🏬 Digital Malls</h1>
        <p className="text-purple-200 text-sm mb-6">Shop from multiple stores, get everything delivered together!</p>

        {/* Search */}
        <div className="flex items-center gap-2 bg-white rounded-full px-4 py-3 shadow-lg">
          <Search className="w-4 h-4 text-zinc-400 flex-shrink-0"/>
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search malls, markets, bazaars..."
            className="flex-1 bg-transparent text-sm text-zinc-900 placeholder-zinc-400 outline-none"/>
        </div>
      </div>

      <div className="px-4 py-6">

        {/* How it works */}
        <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 mb-6">
          <p className="text-purple-700 font-bold mb-3">🎯 How Digital Mall Works</p>
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { emoji: "🏬", title: "Pick a Mall", sub: "Choose your local market" },
              { emoji: "🛍️", title: "Shop All Stores", sub: "Add from any shop" },
              { emoji: "🚚", title: "One Delivery", sub: "All items, one day" },
            ].map((s) => (
              <div key={s.title}>
                <p className="text-2xl mb-1">{s.emoji}</p>
                <p className="text-purple-700 text-xs font-bold">{s.title}</p>
                <p className="text-purple-400 text-xs">{s.sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* City filter */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide">
          {CITIES.map((city) => (
            <button key={city} onClick={() => setSelectedCity(city)}
              className={`text-xs font-semibold px-4 py-2 rounded-full whitespace-nowrap transition border ${selectedCity === city ? "bg-purple-600 text-white border-purple-600" : "bg-white text-zinc-600 border-zinc-300 hover:border-purple-400"}`}>
              {city}
            </button>
          ))}
        </div>

        {/* Stats bar */}
        <div className="flex gap-3 mb-6">
          <div className="flex-1 bg-zinc-50 border border-zinc-200 rounded-2xl p-3 text-center">
            <p className="text-2xl font-bold text-purple-600">{communities.length}</p>
            <p className="text-zinc-500 text-xs">Malls</p>
          </div>
          <div className="flex-1 bg-zinc-50 border border-zinc-200 rounded-2xl p-3 text-center">
            <p className="text-2xl font-bold text-green-600">{CITIES.length - 1}+</p>
            <p className="text-zinc-500 text-xs">Cities</p>
          </div>
          <div className="flex-1 bg-zinc-50 border border-zinc-200 rounded-2xl p-3 text-center">
            <p className="text-2xl font-bold text-blue-600">1 Day</p>
            <p className="text-zinc-500 text-xs">Delivery</p>
          </div>
        </div>

        {/* Malls list */}
        {loading ? (
          <div className="flex flex-col gap-4">
            {[1,2,3].map((i) => (
              <div key={i} className="h-48 bg-zinc-100 rounded-2xl animate-pulse"/>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center mt-16">
            <p className="text-5xl mb-3">🏬</p>
            <p className="text-zinc-600 text-lg font-bold mb-2">No malls found!</p>
            <p className="text-zinc-400 text-sm mb-6">Be the first to create a mall in your area</p>
            <Link href="/seller/create-community"
              className="bg-purple-600 text-white px-8 py-3 rounded-full font-bold text-sm">
              Create a Mall
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {filtered.map((community) => (
              <Link href={`/mall/${community.id}`} key={community.id}>
                <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden hover:shadow-lg hover:border-purple-300 transition">
                  {/* Banner image */}
                  <div className="relative h-40">
                    <img src={community.imageUrl} alt={community.name}
                      className="w-full h-full object-cover"/>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"/>
                    <div className="absolute top-3 left-3">
                      <span className="bg-white/20 backdrop-blur text-white text-xs font-bold px-3 py-1 rounded-full">
                        {typeEmoji[community.type]} {community.type.charAt(0).toUpperCase() + community.type.slice(1)}
                      </span>
                    </div>
                    <div className="absolute top-3 right-3">
                      <span className="bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                        {community.deliveryDay} Delivery
                      </span>
                    </div>
                    <div className="absolute bottom-3 left-3">
                      <h3 className="text-white font-bold text-lg">{community.name}</h3>
                      <div className="flex items-center gap-1 text-zinc-300 text-xs">
                        <MapPin className="w-3 h-3"/>
                        <span>{community.area}, {community.city}</span>
                      </div>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    {community.description && (
                      <p className="text-zinc-500 text-sm mb-3 line-clamp-2">{community.description}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400"/>
                          <span className="text-zinc-700 text-sm font-semibold">{community.rating}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Store className="w-4 h-4 text-zinc-400"/>
                          <span className="text-zinc-500 text-sm">{community.memberCount} shops</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <ShoppingBag className="w-4 h-4 text-zinc-400"/>
                          <span className="text-zinc-500 text-sm">{community.productCount} items</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-purple-600 font-semibold text-sm">
                        Enter <ChevronRight className="w-4 h-4"/>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Create mall CTA */}
        <div className="mt-8 bg-gradient-to-r from-purple-600 to-purple-800 rounded-2xl p-6 text-center">
          <p className="text-white font-bold text-lg mb-1">🏬 Own a Shop?</p>
          <p className="text-purple-200 text-sm mb-4">Create your digital mall and invite other local sellers to join!</p>
          <Link href="/seller/create-community"
            className="bg-white text-purple-700 font-bold px-8 py-3 rounded-full text-sm inline-block hover:bg-purple-50 transition">
            Create Mall →
          </Link>
        </div>
      </div>
    </div>
  );
}