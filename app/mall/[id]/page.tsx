"use client";
import { useEffect, useState } from "react";
import { doc, getDoc, collection, getDocs, query, where, addDoc, updateDoc, increment } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useCartStore } from "@/store/cartStore";
import { MapPin, Star, Store, ShoppingBag, Search, ChevronLeft, Package, Users, Zap } from "lucide-react";
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

type Seller = { id: string; name: string; sellerId: string; shopName?: string; };

export default function MallDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [community, setCommunity] = useState<Community | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [search, setSearch] = useState("");
  const [selectedSeller, setSelectedSeller] = useState("All");
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("");
  const [isOwner, setIsOwner] = useState(false);
  const [joining, setJoining] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const { addItem, items } = useCartStore();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) setUserEmail(user.email ?? "");
    });
    return unsub;
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      setLoading(true);

      // Fetch community
      const commSnap = await getDoc(doc(db, "communities", id as string));
      if (!commSnap.exists()) { setLoading(false); return; }
      const commData = { id: commSnap.id, ...commSnap.data() } as Community;
      setCommunity(commData);
      setIsOwner(auth.currentUser?.uid === commData.ownerId);

      // Fetch members
      const membersSnap = await getDocs(
        query(collection(db, "communityMembers"), where("communityId", "==", id))
      );
      const memberIds = membersSnap.docs.map((d) => d.data().sellerId as string);

      // Check if current user is member
      if (auth.currentUser) {
        setIsMember(memberIds.includes(auth.currentUser.uid) || auth.currentUser.uid === commData.ownerId);
      }

      // Fetch sellers info
      const sellersList: Seller[] = [];
      for (const sellerId of [...memberIds, commData.ownerId]) {
        const userSnap = await getDoc(doc(db, "users", sellerId));
        if (userSnap.exists()) {
          sellersList.push({ id: userSnap.id, name: userSnap.data().name, sellerId, shopName: userSnap.data().shopName });
        }
      }
      setSellers(sellersList);

      // Fetch all products from member sellers
      const allProducts: Product[] = [];
      const allSellerIds = [...new Set([...memberIds, commData.ownerId])];
      for (const sellerId of allSellerIds) {
        const pSnap = await getDocs(
          query(collection(db, "products"), where("sellerId", "==", sellerId))
        );
        const sellerName = sellersList.find((s) => s.sellerId === sellerId)?.name ?? "Seller";
        pSnap.docs.forEach((d) => {
          allProducts.push({ id: d.id, ...d.data(), sellerName } as Product);
        });
      }
      setProducts(allProducts);
      setLoading(false);
    };

    fetchData();
  }, [id]);

  const handleJoinMall = async () => {
    if (!auth.currentUser) { router.push("/auth/login"); return; }
    setJoining(true);
    try {
      await addDoc(collection(db, "communityMembers"), {
        communityId: id,
        sellerId: auth.currentUser.uid,
        joinedAt: new Date(),
      });
      await updateDoc(doc(db, "communities", id as string), {
        memberCount: increment(1),
      });
      setIsMember(true);
      toast.success("You joined the mall! 🎉");
    } catch {
      toast.error("Failed to join!");
    } finally {
      setJoining(false);
    }
  };

  const handleAddToCart = (p: Product) => {
    if (!userEmail) { router.push("/auth/login"); toast.error("Please login first!"); return; }
    addItem({ id: p.id, name: p.name, price: p.price, image: p.imageUrl, quantity: 1 });
    toast.success(`${p.name} added! 🛒`);
  };

  const handleBuyNow = (p: Product) => {
    if (!userEmail) { router.push("/auth/login"); return; }
    addItem({ id: p.id, name: p.name, price: p.price, image: p.imageUrl, quantity: 1 });
    router.push("/buyer/checkout");
  };

  const filteredProducts = products.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description?.toLowerCase().includes(search.toLowerCase());
    const matchSeller = selectedSeller === "All" || p.sellerId === selectedSeller;
    return matchSearch && matchSeller;
  });

  const typeEmoji: Record<string, string> = { mall: "🏬", market: "🛒", bazaar: "🏪", plaza: "🏢" };

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
        <p className="text-zinc-600">Mall not found!</p>
        <Link href="/mall" className="mt-4 inline-block bg-purple-600 text-white px-6 py-2 rounded-full text-sm font-bold">Browse Malls</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white">

      {/* Hero banner */}
      <div className="relative h-56">
        <img src={community.imageUrl} alt={community.name} className="w-full h-full object-cover"/>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"/>
        <div className="absolute top-4 left-4">
          <Link href="/mall" className="bg-black/50 text-white p-2 rounded-full block">
            <ChevronLeft className="w-5 h-5"/>
          </Link>
        </div>
        <div className="absolute bottom-4 left-4 right-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-white/20 backdrop-blur text-white text-xs font-bold px-3 py-1 rounded-full">
              {typeEmoji[community.type]} {community.type}
            </span>
            <span className="bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">
              ⚡ {community.deliveryDay} Delivery
            </span>
          </div>
          <h1 className="text-white text-2xl font-bold">{community.name}</h1>
          <div className="flex items-center gap-1 text-zinc-300 text-sm">
            <MapPin className="w-4 h-4"/>
            <span>{community.area}, {community.city}</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-0 border-b border-zinc-200">
        {[
          { icon: <Star className="w-4 h-4 text-yellow-400 fill-yellow-400"/>, value: community.rating, label: "Rating" },
          { icon: <Store className="w-4 h-4 text-purple-500"/>, value: community.memberCount, label: "Shops" },
          { icon: <ShoppingBag className="w-4 h-4 text-blue-500"/>, value: products.length, label: "Products" },
        ].map((s, i) => (
          <div key={i} className="flex-1 py-4 text-center border-r border-zinc-200 last:border-r-0">
            <div className="flex items-center justify-center gap-1 mb-0.5">
              {s.icon}
              <span className="font-bold text-zinc-900">{s.value}</span>
            </div>
            <p className="text-zinc-400 text-xs">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="px-4 py-4">

        {/* Description */}
        {community.description && (
          <p className="text-zinc-500 text-sm mb-4">{community.description}</p>
        )}

        {/* Join mall button for sellers */}
        {userEmail && !isMember && (
          <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 mb-4 flex items-center gap-3">
            <Store className="w-8 h-8 text-purple-500 flex-shrink-0"/>
            <div className="flex-1">
              <p className="text-purple-700 font-semibold text-sm">Are you a seller?</p>
              <p className="text-purple-400 text-xs">Join this mall to list your products here</p>
            </div>
            <button onClick={handleJoinMall} disabled={joining}
              className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition">
              {joining ? "Joining..." : "Join Mall"}
            </button>
          </div>
        )}

        {isMember && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-3 mb-4 flex items-center gap-2">
            <span className="text-green-500">✓</span>
            <p className="text-green-600 text-sm font-semibold">You are a member of this mall!</p>
          </div>
        )}

        {/* Cart summary if items */}
        {items.length > 0 && (
          <div className="bg-purple-600 rounded-2xl p-4 mb-4 flex items-center gap-3">
            <ShoppingBag className="w-6 h-6 text-white"/>
            <div className="flex-1">
              <p className="text-white font-bold">{items.length} items in cart</p>
              <p className="text-purple-200 text-xs">From multiple shops — one delivery!</p>
            </div>
            <Link href="/buyer/checkout"
              className="bg-white text-purple-600 text-xs font-bold px-4 py-2 rounded-xl">
              Checkout ⚡
            </Link>
          </div>
        )}

        {/* Shops in this mall */}
        <div className="mb-4">
          <p className="text-zinc-900 font-bold mb-3 flex items-center gap-2">
            <Store className="w-5 h-5 text-purple-600"/>
            Shops in this Mall ({sellers.length})
          </p>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <button onClick={() => setSelectedSeller("All")}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold transition border ${selectedSeller === "All" ? "bg-purple-600 text-white border-purple-600" : "bg-white text-zinc-600 border-zinc-300"}`}>
              All Shops
            </button>
            {sellers.map((seller) => (
              <button key={seller.sellerId} onClick={() => setSelectedSeller(seller.sellerId)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold transition border whitespace-nowrap ${selectedSeller === seller.sellerId ? "bg-purple-600 text-white border-purple-600" : "bg-white text-zinc-600 border-zinc-300"}`}>
                🏪 {seller.name}
              </button>
            ))}
          </div>
        </div>

        {/* Search products */}
        <div className="flex items-center gap-2 bg-zinc-100 border border-zinc-300 rounded-full px-4 py-2.5 mb-4">
          <Search className="w-4 h-4 text-zinc-400 flex-shrink-0"/>
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products in this mall..."
            className="flex-1 bg-transparent text-sm text-zinc-900 placeholder-zinc-400 outline-none"/>
        </div>

        {/* Products */}
        <p className="text-zinc-900 font-bold mb-3 flex items-center gap-2">
          <Package className="w-5 h-5 text-green-600"/>
          Products ({filteredProducts.length})
        </p>

        {filteredProducts.length === 0 ? (
          <div className="text-center mt-10">
            <p className="text-4xl mb-3">📦</p>
            <p className="text-zinc-400">No products yet in this mall!</p>
            {isMember && (
              <Link href="/seller/add-product"
                className="mt-4 inline-block bg-purple-600 text-white px-6 py-2 rounded-full text-sm font-bold">
                Add Your Products
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pb-8">
            {filteredProducts.map((p) => (
              <div key={p.id} className="bg-white border border-zinc-200 rounded-2xl overflow-hidden hover:shadow-lg hover:border-purple-300 transition">
                <div className="relative">
                  <Link href={`/buyer/product/${p.id}`}>
                    <img src={p.imageUrl} alt={p.name} className="w-full h-36 object-cover"/>
                  </Link>
                  {p.offer && (
                    <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                      {p.offer}% OFF
                    </span>
                  )}
                  {/* Shop badge */}
                  <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
                    🏪 {p.sellerName}
                  </div>
                </div>
                <div className="p-3">
                  <p className="text-zinc-900 text-sm font-semibold line-clamp-1">{p.name}</p>
                  <p className="text-purple-600 font-bold text-base">₹{p.price}</p>
                  <div className="flex gap-1.5 mt-2">
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