"use client";
import { useEffect, useState } from "react";
import { collection, getDocs, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

const ADMIN_EMAIL = "Palt51419@gmail.com";

type Product = { id: string; name: string; price: number; imageUrl: string; category?: string; sellerId: string; };
type Order = { id: string; total: number; status: string; userId?: string; createdAt?: any; };
type User = { id: string; name: string; email: string; role?: string; };

export default function AdminDashboard() {
  const router = useRouter();
  const [tab, setTab] = useState<"overview" | "products" | "orders" | "users">("overview");
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Auth guard
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user || user.email !== ADMIN_EMAIL) {
        toast.error("Access denied!");
        router.push("/");
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    const fetchAll = async () => {
      const [pSnap, oSnap, uSnap] = await Promise.all([
        getDocs(collection(db, "products")),
        getDocs(collection(db, "orders")),
        getDocs(collection(db, "users")),
      ]);
      setProducts(pSnap.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
      setOrders(oSnap.docs.map(d => ({ id: d.id, ...d.data() } as Order)));
      setUsers(uSnap.docs.map(d => ({ id: d.id, ...d.data() } as User)));
      setLoading(false);
    };
    fetchAll();
  }, []);

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    await deleteDoc(doc(db, "products", id));
    setProducts(prev => prev.filter(p => p.id !== id));
    toast.success("Product deleted!");
  };

  const handleCancelOrder = async (id: string) => {
    await updateDoc(doc(db, "orders", id), { status: "cancelled" });
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: "cancelled" } : o));
    toast.success("Order cancelled!");
  };

  if (loading) return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <p className="text-white text-xl animate-pulse">Loading Admin Panel...</p>
    </div>
  );

  const stats = [
    { label: "Total Products", value: products.length, emoji: "📦", color: "from-purple-600 to-purple-400" },
    { label: "Total Orders", value: orders.length, emoji: "🧾", color: "from-blue-600 to-blue-400" },
    { label: "Total Users", value: users.length, emoji: "👥", color: "from-green-600 to-green-400" },
    { label: "Revenue", value: `₹${orders.filter(o => o.status !== "cancelled").reduce((sum, o) => sum + (o.total || 0), 0)}`, emoji: "💰", color: "from-yellow-500 to-yellow-300" },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="bg-zinc-900 border-b border-zinc-800 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <span className="text-2xl">⚙️</span>
          <div>
            <p className="font-bold text-lg">Admin Panel</p>
            <p className="text-zinc-400 text-xs">Full platform control</p>
          </div>
        </div>
        <button onClick={() => router.push("/")}
          className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm px-4 py-2 rounded-xl transition">
          ← Back to Store
        </button>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {stats.map(s => (
            <div key={s.label} className={`bg-gradient-to-br ${s.color} rounded-2xl p-4`}>
              <p className="text-3xl mb-1">{s.emoji}</p>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-white/70 text-xs">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {(["overview", "products", "orders", "users"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-xl text-sm font-semibold capitalize transition ${tab === t ? "bg-purple-600 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"}`}>
              {t}
            </button>
          ))}
        </div>

        {/* OVERVIEW */}
        {tab === "overview" && (
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800">
              <p className="font-bold mb-3 text-purple-400">🕐 Recent Orders</p>
              {orders.slice(0, 5).map(o => (
                <div key={o.id} className="flex justify-between items-center py-2 border-b border-zinc-800 last:border-0">
                  <span className="text-zinc-400 text-xs">#{o.id.slice(0, 8).toUpperCase()}</span>
                  <span className="text-white text-sm font-bold">₹{o.total}</span>
                  <span className={`text-xs px-2 py-1 rounded-full font-semibold ${o.status === "cancelled" ? "bg-red-900 text-red-400" : "bg-green-900 text-green-400"}`}>
                    {o.status}
                  </span>
                </div>
              ))}
            </div>
            <div className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800">
              <p className="font-bold mb-3 text-blue-400">📦 Recent Products</p>
              {products.slice(0, 5).map(p => (
                <div key={p.id} className="flex items-center gap-3 py-2 border-b border-zinc-800 last:border-0">
                  <img src={p.imageUrl} alt={p.name} className="w-10 h-10 rounded-lg object-cover" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-semibold truncate">{p.name}</p>
                    <p className="text-purple-400 text-xs">₹{p.price}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PRODUCTS */}
        {tab === "products" && (
          <div>
            <p className="text-zinc-400 text-sm mb-4">{products.length} total products</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map(p => (
                <div key={p.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                  <img src={p.imageUrl} alt={p.name} className="w-full h-40 object-cover" />
                  <div className="p-3">
                    <p className="font-semibold">{p.name}</p>
                    <p className="text-purple-400 font-bold">₹{p.price}</p>
                    <p className="text-zinc-500 text-xs mt-1">Seller: {p.sellerId?.slice(0, 10)}...</p>
                    <button onClick={() => handleDeleteProduct(p.id)}
                      className="w-full mt-3 bg-red-900 hover:bg-red-800 text-red-400 text-xs font-bold py-2 rounded-xl transition">
                      🗑️ Delete Product
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ORDERS */}
        {tab === "orders" && (
          <div className="flex flex-col gap-3">
            {orders.map(o => (
              <div key={o.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-zinc-400 text-xs">#{o.id.slice(0, 10).toUpperCase()}</p>
                  <p className="font-bold text-white">₹{o.total}</p>
                  <p className="text-zinc-500 text-xs">User: {o.userId?.slice(0, 12) ?? "guest"}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-3 py-1 rounded-full font-bold ${o.status === "cancelled" ? "bg-red-900 text-red-400" : "bg-green-900 text-green-400"}`}>
                    {o.status}
                  </span>
                  {o.status !== "cancelled" && (
                    <button onClick={() => handleCancelOrder(o.id)}
                      className="bg-red-900 hover:bg-red-800 text-red-400 text-xs font-bold px-3 py-2 rounded-xl transition">
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* USERS */}
        {tab === "users" && (
          <div className="flex flex-col gap-3">
            {users.map(u => (
              <div key={u.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center text-xl font-bold flex-shrink-0">
                  {u.name?.[0]?.toUpperCase() ?? "U"}
                </div>
                <div>
                  <p className="font-semibold text-white">{u.name}</p>
                  <p className="text-zinc-400 text-sm">{u.email}</p>
                  <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">{u.role ?? "buyer"}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}