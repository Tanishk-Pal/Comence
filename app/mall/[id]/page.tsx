"use client";
import { useEffect, useState } from "react";
import { doc, getDoc, collection, getDocs, query, where, addDoc, updateDoc, increment } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useCartStore } from "@/store/cartStore";
import { MapPin, Star, Store, ShoppingBag, Search, ChevronLeft, Package, Plus } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { onAuthStateChanged } from "firebase/auth";

type Community = {
  id: string; name: string; city: string; area: string; type: string;
  description: string; imageUrl: string; deliveryDay: string;
  memberCount: number; productCount: number; rating: number;
  ownerName: string; ownerId: string;
};

type Product = {
  id: string; name: string; price: number; imageUrl: string;
  description: string; category?: string; offer?: number;
  sellerId: string; sellerName?: string;
};

type Seller = { id: string; name: string; sellerId: string; };

const SECTIONS = ["All", "Clothes", "Food", "Electronics", "Stationery", "Grocery", "Beauty", "Sports", "Home", "Other"];

export default function MallDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [community, setCommunity] = useState<Community | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [search, setSearch] = useState("");
  const [selectedSection, setSelectedSection] = useState("All");
  const [selectedSeller, setSelectedSeller] = useState("All");
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [isMember, setIsMember] = useState(false);
  const [joining, setJoining] = useState(false);
  const { addItem, items } = useCartStore();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) { setUserEmail(user.email ?? ""); setUserId(user.uid); }
    });
    return unsub;
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      setLoading(true);

      const commSnap = await getDoc(doc(db, "communities", id as string));
      if (!commSnap.exists()) { setLoading(false); return; }
      const commData = { id: commSnap.id, ...commSnap.data() } as Community;
      setCommunity(commData);

      // Fetch members
      const membersSnap = await getDocs(
        query(collection(db, "communityMembers"), where("communityId", "==", id))
      );
      const memberIds = membersSnap.docs.map((d) => d.data().sellerId as string);
      const allSellerIds = [...new Set([commData.ownerId, ...memberIds])];

      if (auth.currentUser) {
        setIsMember(allSellerIds.includes(auth.currentUser.uid));
      }

      // Fetch seller names
      const sellersList: Seller[] = [];
      for (const sellerId of allSellerIds) {
        const uSnap = await getDoc(doc(db, "users", sellerId));
        if (uSnap.exists()) {
          sellersList.push({ id: uSnap.id, name: uSnap.data().name, sellerId });
        }
      }
      setSellers(sellersList);

      // Fetch products from all member sellers
      const allProducts: Product[] = [];
      for (const sellerId of allSellerIds) {
        const pSnap = await getDocs(query(collection(db, "products"), where("sellerId", "==", sellerId)));
        const sellerName = sellersList.find((s) => s.sellerId === sellerId)?.name ?? "Seller";
        pSnap.docs.forEach((d) => {
          allProducts.push({ id: d.id, ...d.data(), sellerName } as Product);
        });
      }
      setProducts(allProducts);
      setLoading(false);
    };
    fetchData();
  }, [id, userId]);

  const handleJoinMall = async () => {
    if (!auth.currentUser) { router.push("/auth/login"); return; }
    setJoining(true);
    try {
      // Check if already member
      const existing = await getDocs(
        query(collection(db, "communityMembers"),
          where("communityId", "==", id),
          where("sellerId", "==", auth.currentUser.uid))
      );
      if (!existing.empty) { toast.error("Already a member!"); setIsMember(true); setJoining(false); return; }

      await addDoc(collection(db, "communityMembers"), {
        communityId: id,
        sellerId: auth.currentUser.uid,
        joinedAt: new Date(),
      });
      await updateDoc(doc(db, "communities", id as string), { memberCount: increment(1) });
      setIsMember(true);
      toast.success("You joined the mall! Now add your products 🎉");
    } catch {
      toast.error("Failed to join!");
    } finally {
      setJoining(false);
    }
  };

  const handleAddToCart = (p: Product) => {
    if (!userEmail) { router.push("/auth/login"); toast.error("Please login!"); return; }
    addItem({ id: p.id, name: p.name, price: p.price, image: p.imageUrl, quantity: 1 });
    toast.success(`${p.name} added! 🛒`);
  };

  const handleBuyNow = (p: Product) => {
    if (!userEmail) { router.push("/auth/login"); return; }
    addItem({ id: p.id, name: p.name, price: p.price, image: p.imageUrl, quantity: 1 });
    router.push("/buyer/checkout");
  };

  const filteredProducts = products.filter((p) => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    const matchSection = selectedSection === "All" || p.category === selectedSection;
    const matchSeller = selectedSeller === "All" || p.sellerId === selectedSeller;
    return matchSearch && matchSection && matchSeller;
  });

  // Group products by section
  const sections = SECTIONS.filter((s) => s !== "All").filter((s) =>
    products.some((p) => p.category === s)
  );

  if (loading) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"/>
        <p className="text-zinc-400">Loading mall...</p>
      </div>
    </div>
  );

  if (!community) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <p className="text-4xl mb-3">🏬</p>
        <p className="text-zinc-600 mb-4">Mall not found!</p>
        <Link href="/mall" className="bg-purple-600 text-white px-6 py-2 rounded-full text-sm font-bold">Browse Malls</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Hero */}
      <div className="relative h-52">
        <img src={community.imageUrl} alt={community.name} className="w-full h-full object-cover"/>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-black/20"/>
        <div className="absolute top-4 left-4">
          <Link href="/mall" className="bg-black/50 text-white p-2 rounded-full block">
            <ChevronLeft className="w-5 h-5"/>
          </Link>
        </div>
        <div className="absolute bottom-4 left-4 right-4">
          <div className="flex gap-2 mb-1 flex-wrap">
            <span className="bg-white/20 backdrop-blur text-white text-xs font-bold px-3 py-1 rounded-full">
              🏬 {community.type}
            </span>
            <span className="bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">
              ⚡ {community.deliveryDay} Delivery
            </span>
          </div>
          <h1 className="text-white text-2xl font-bold">{community.name}</h1>
          <div className="flex items-center gap-1 text-zinc-300 text-xs">
            <MapPin className="w-3 h-3"/>
            <span>{community.area}, {community.city}</span>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="bg-white flex border-b border-zinc-200">
        {[
          { icon: "⭐", value: community.rating, label: "Rating" },
          { icon: "🏪", value: sellers.length, label: "Shops" },
          { icon: "📦", value: products.length, label: "Products" },
        ].map((s, i) => (
          <div key={i} className="flex-1 py-3 text-center border-r border-zinc-200 last:border-r-0">
            <p className="font-bold text-zinc-900 text-sm">{s.icon} {s.value}</p>
            <p className="text-zinc-400 text-xs">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="px-4 py-4">

        {/* Cart sticky bar */}
        {items.length > 0 && (
          <div className="bg-purple-600 rounded-2xl p-3 mb-4 flex items-center gap-3 sticky top-0 z-10">
            <ShoppingBag className="w-5 h-5 text-white flex-shrink-0"/>
            <div className="flex-1">
              <p className="text-white font-bold text-sm">{items.length} items from {sellers.length > 1 ? "multiple shops" : "1 shop"}</p>
              <p className="text-purple-200 text-xs">All delivered together! 🚚</p>
            </div>
            <Link href="/buyer/checkout"
              className="bg-white text-purple-600 text-xs font-bold px-4 py-2 rounded-xl">
              Checkout ⚡
            </Link>
          </div>
        )}

        {/* Join mall for sellers */}
        {userEmail && !isMember && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4">
            <p className="text-amber-700 font-bold text-sm mb-1">🏪 Are you a local seller?</p>
            <p className="text-amber-600 text-xs mb-3">Join {community.name} to list your products here. Buyers in {community.city} will discover you!</p>
            <button onClick={handleJoinMall} disabled={joining}
              className="bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold px-6 py-2 rounded-xl transition w-full">
              {joining ? "Joining..." : `Join ${community.name} as Seller`}
            </button>
          </div>
        )}

        {isMember && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-3 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-green-500 text-lg">✅</span>
              <div>
                <p className="text-green-700 font-semibold text-sm">You are a member!</p>
                <p className="text-green-500 text-xs">Your products are visible in this mall</p>
              </div>
            </div>
            <Link href="/seller/add-product"
              className="bg-green-600 text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1">
              <Plus className="w-3 h-3"/> Add Product
            </Link>
          </div>
        )}

        {/* Shops filter */}
        <div className="mb-4">
          <p className="text-zinc-900 font-bold text-sm mb-2">🏪 Shops ({sellers.length})</p>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <button onClick={() => setSelectedSeller("All")}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold border transition ${selectedSeller === "All" ? "bg-purple-600 text-white border-purple-600" : "bg-white text-zinc-600 border-zinc-300"}`}>
              All Shops
            </button>
            {sellers.map((s) => (
              <button key={s.sellerId} onClick={() => setSelectedSeller(s.sellerId)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold border transition whitespace-nowrap ${selectedSeller === s.sellerId ? "bg-purple-600 text-white border-purple-600" : "bg-white text-zinc-600 border-zinc-300"}`}>
                🏪 {s.name}
              </button>
            ))}
          </div>
        </div>

        {/* Section tabs — like mall floors */}
        <div className="mb-4">
          <p className="text-zinc-900 font-bold text-sm mb-2">🏬 Sections</p>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {SECTIONS.map((section) => {
              const count = section === "All"
                ? products.length
                : products.filter((p) => p.category === section).length;
              if (count === 0 && section !== "All") return null;
              const sectionEmoji: Record<string, string> = {
                All: "🛍️", Clothes: "👗", Food: "🍔", Electronics: "📱",
                Stationery: "📝", Grocery: "🛒", Beauty: "💄",
                Sports: "⚽", Home: "🏠", Other: "📦",
              };
              return (
                <button key={section} onClick={() => setSelectedSection(section)}
                  className={`flex-shrink-0 flex items-center gap-1 px-4 py-2 rounded-full text-xs font-bold border transition whitespace-nowrap ${selectedSection === section ? "bg-purple-600 text-white border-purple-600" : "bg-white text-zinc-600 border-zinc-300 hover:border-purple-400"}`}>
                  {sectionEmoji[section]} {section}
                  {count > 0 && <span className={`text-xs rounded-full px-1.5 py-0.5 ${selectedSection === section ? "bg-white/20" : "bg-zinc-100"}`}>{count}</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 bg-white border border-zinc-300 rounded-full px-4 py-2.5 mb-4 shadow-sm">
          <Search className="w-4 h-4 text-zinc-400 flex-shrink-0"/>
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search in ${community.name}...`}
            className="flex-1 bg-transparent text-sm text-zinc-900 placeholder-zinc-400 outline-none"/>
        </div>

        {/* Products grouped by section */}
        {selectedSection === "All" && sections.length > 0 ? (
          sections.map((section) => {
            const sectionProducts = filteredProducts.filter((p) => p.category === section);
            if (sectionProducts.length === 0) return null;
            const sectionEmoji: Record<string, string> = {
              Clothes: "👗", Food: "🍔", Electronics: "📱", Stationery: "📝",
              Grocery: "🛒", Beauty: "💄", Sports: "⚽", Home: "🏠", Other: "📦",
            };
            return (
              <div key={section} className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">{sectionEmoji[section] ?? "📦"}</span>
                  <p className="text-zinc-900 font-bold">{section}</p>
                  <span className="text-zinc-400 text-sm">({sectionProducts.length})</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {sectionProducts.map((p) => (
                    <ProductCard key={p.id} p={p} onAddToCart={handleAddToCart} onBuyNow={handleBuyNow}/>
                  ))}
                </div>
              </div>
            );
          })
        ) : (
          filteredProducts.length === 0 ? (
            <div className="text-center mt-12 pb-8">
              <p className="text-4xl mb-3">📦</p>
              <p className="text-zinc-500 font-semibold mb-1">No products here yet!</p>
              {isMember && (
                <Link href="/seller/add-product"
                  className="mt-4 inline-block bg-purple-600 text-white px-6 py-2 rounded-full text-sm font-bold">
                  + Add Your Products
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pb-8">
              {filteredProducts.map((p) => (
                <ProductCard key={p.id} p={p} onAddToCart={handleAddToCart} onBuyNow={handleBuyNow}/>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}

function ProductCard({ p, onAddToCart, onBuyNow }: {
  p: any;
  onAddToCart: (p: any) => void;
  onBuyNow: (p: any) => void;
}) {
  return (
    <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden hover:shadow-md hover:border-purple-300 transition">
      <div className="relative">
        <Link href={`/buyer/product/${p.id}`}>
          <img src={p.imageUrl} alt={p.name} className="w-full h-36 object-cover"/>
        </Link>
        {p.offer && (
          <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
            {p.offer}% OFF
          </span>
        )}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
          <p className="text-white text-xs font-semibold">🏪 {p.sellerName}</p>
        </div>
      </div>
      <div className="p-3">
        <p className="text-zinc-900 text-sm font-semibold line-clamp-1">{p.name}</p>
        <p className="text-purple-600 font-bold">₹{p.price}</p>
        <div className="flex gap-1.5 mt-2">
          <button onClick={() => onAddToCart(p)}
            className="flex-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-bold py-2 rounded-xl transition">
            🛒 Cart
          </button>
          <button onClick={() => onBuyNow(p)}
            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold py-2 rounded-xl transition">
            ⚡ Buy
          </button>
        </div>
      </div>
    </div>
  );
}