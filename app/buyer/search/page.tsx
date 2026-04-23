"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useCartStore } from "@/store/cartStore";
import { Star, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

type Product = {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  description?: string;
  category?: string;
  offer?: number;
};

function SearchResults() {
  const params = useSearchParams();
  const searchQuery = params.get("q") || "";
  const [products, setProducts] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState(searchQuery);
  const { addItem } = useCartStore();
  const router = useRouter();

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      const snap = await getDocs(collection(db, "products"));
      const all = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Product));
      setAllProducts(all);
      setLoading(false);
    };
    fetchAll();
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setProducts(allProducts);
      return;
    }
    const filtered = allProducts.filter((p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setProducts(filtered);
  }, [searchQuery, allProducts]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/search?q=${encodeURIComponent(input)}`);
  };

  const handleBuyNow = (p: Product) => {
    addItem({ id: p.id, name: p.name, price: p.price, image: p.imageUrl, quantity: 1 });
    router.push("/buyer/checkout");
  };

  const handleAddToCart = (p: Product) => {
    addItem({ id: p.id, name: p.name, price: p.price, image: p.imageUrl, quantity: 1 });
    toast.success(`${p.name} added to cart! 🛒`);
  };

  return (
    <div className="min-h-screen bg-white text-zinc-900">

      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-zinc-200 px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3 max-w-4xl mx-auto">
          <Link href="/buyer/feed" className="text-zinc-500 hover:text-zinc-900 font-bold text-lg">←</Link>
          <form onSubmit={handleSearch} className="flex-1 flex items-center gap-2 bg-zinc-100 border border-zinc-300 rounded-full px-4 py-2 shadow-inner">
            <Search className="w-4 h-4 text-zinc-400 flex-shrink-0"/>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Search products, categories..."
              className="flex-1 bg-transparent text-sm text-zinc-900 placeholder-zinc-400 outline-none"
            />
            <button type="submit"
              className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-4 py-1.5 rounded-full transition">
              Search
            </button>
          </form>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">

        {/* Results count */}
        {searchQuery && (
          <p className="text-zinc-500 text-sm mb-4">
            {loading ? "Searching..." : `${products.length} results for "${searchQuery}"`}
          </p>
        )}

        {/* Category pills */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-4">
          {["All", "Electronics", "Fashion", "Beauty", "Food", "Sports", "Home"].map((cat) => (
            <button key={cat}
              onClick={() => { setInput(cat === "All" ? "" : cat); router.push(cat === "All" ? "/search" : `/search?q=${cat}`); }}
              className={`text-xs font-semibold px-4 py-1.5 rounded-full whitespace-nowrap transition border ${
                searchQuery === cat
                  ? "bg-purple-600 text-white border-purple-600"
                  : "bg-white text-zinc-600 border-zinc-300 hover:border-purple-400 hover:text-purple-600"
              }`}>
              {cat}
            </button>
          ))}
        </div>

        {/* Loading skeleton */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-zinc-100 rounded-2xl h-64 animate-pulse"/>
            ))}
          </div>

        /* No results */
        ) : products.length === 0 ? (
          <div className="text-center mt-20">
            <p className="text-4xl mb-3">🔍</p>
            <p className="text-zinc-600 text-lg mb-2">No results for "{searchQuery}"</p>
            <p className="text-zinc-400 text-sm mb-6">Try a different keyword</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {["Electronics", "Fashion", "Beauty", "Food", "Sports"].map((cat) => (
                <button key={cat}
                  onClick={() => { setInput(cat); router.push(`/search?q=${cat}`); }}
                  className="bg-zinc-100 hover:bg-purple-600 hover:text-white text-zinc-600 text-sm px-4 py-2 rounded-full border border-zinc-300 transition">
                  {cat}
                </button>
              ))}
            </div>
          </div>

        /* Product grid */
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((p) => (
              <div key={p.id} className="bg-white border border-zinc-200 rounded-2xl overflow-hidden hover:shadow-lg hover:border-purple-300 transition">
                <div className="relative">
                  <Link href={`/buyer/product/${p.id}`}>
                    <img src={p.imageUrl} alt={p.name}
                      className="w-full h-40 object-cover hover:opacity-90 transition"/>
                  </Link>
                  {p.offer && (
                    <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                      {p.offer}% OFF
                    </span>
                  )}
                </div>
                <div className="p-3">
                  <p className="text-zinc-900 text-sm font-semibold line-clamp-1">{p.name}</p>
                  {p.description && (
                    <p className="text-zinc-400 text-xs line-clamp-1 mb-1">{p.description}</p>
                  )}
                  <div className="flex gap-0.5 mb-1">
                    {[1,2,3,4,5].map((s) => (
                      <Star key={s} className="w-3 h-3 text-yellow-400 fill-yellow-400"/>
                    ))}
                  </div>
                  <p className="text-purple-600 font-bold mb-2">₹{p.price}</p>
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
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-zinc-400">Loading...</p>
      </div>
    }>
      <SearchResults />
    </Suspense>
  );
}