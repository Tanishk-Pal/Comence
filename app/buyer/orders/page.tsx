"use client";
import { useEffect, useState } from "react";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import Link from "next/link";
import { ChevronLeft, Package } from "lucide-react";

type Order = {
  id: string;
  items: { name: string; image: string; price: number; quantity: number }[];
  total: number;
  status: string;
  paymentMethod: string;
  address: string;
  createdAt: any;
  trackingSteps: { label: string; done: boolean; time: string | null }[];
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    const fetch = async () => {
      if (!auth.currentUser) return;
      const q = query(
        collection(db, "orders"),
        where("userId", "==", auth.currentUser.uid),
      );
      const snap = await getDocs(q);
      setOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Order)));
      setLoading(false);
    };
    fetch();
  }, []);

  if (selectedOrder) {
    return (
      <main className="min-h-screen bg-black px-4 py-6 max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setSelectedOrder(null)} className="text-zinc-400 hover:text-white">
            <ChevronLeft className="w-6 h-6"/>
          </button>
          <h1 className="text-xl font-bold text-white">Order Details</h1>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-4">
          <p className="text-zinc-400 text-xs mb-1">Order ID</p>
          <p className="text-white font-bold text-sm">#{selectedOrder.id.slice(0,8).toUpperCase()}</p>
        </div>

        {/* Items */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-4">
          <p className="text-white font-bold mb-3">Items Ordered</p>
          {selectedOrder.items.map((item, i) => (
            <div key={i} className="flex gap-3 mb-3">
              <img src={item.image} alt={item.name} className="w-14 h-14 rounded-xl object-cover"/>
              <div className="flex-1">
                <p className="text-white text-sm font-semibold">{item.name}</p>
                <p className="text-zinc-400 text-xs">Qty: {item.quantity}</p>
                <p className="text-purple-400 font-bold text-sm">₹{item.price * item.quantity}</p>
              </div>
            </div>
          ))}
          <div className="border-t border-zinc-800 pt-3 flex justify-between">
            <span className="text-white font-bold">Total Paid</span>
            <span className="text-purple-400 font-bold">₹{selectedOrder.total}</span>
          </div>
        </div>

        {/* Order tracker */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-4">
          <p className="text-white font-bold mb-4">📦 Order Tracker</p>
          {(selectedOrder.trackingSteps ?? [
            { label: "Order Placed", done: true },
            { label: "Processing", done: false },
            { label: "Dispatched", done: false },
            { label: "Out for Delivery", done: false },
            { label: "Delivered", done: false },
          ]).map((step, i) => (
            <div key={i} className="flex gap-3 mb-4 relative">
              {i < 4 && (
                <div className={`absolute left-4 top-8 w-0.5 h-6 ${step.done ? "bg-green-500" : "bg-zinc-700"}`}/>
              )}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 z-10 ${step.done ? "bg-green-500 text-white" : "bg-zinc-800 text-zinc-500"}`}>
                {step.done ? "✓" : i + 1}
              </div>
              <div className="flex-1 pt-1">
                <p className={`text-sm font-semibold ${step.done ? "text-green-400" : "text-zinc-500"}`}>
                  {step.label}
                </p>
                {step.done && step.time && (
                  <p className="text-zinc-600 text-xs">{new Date(step.time).toLocaleDateString()}</p>
                )}
              </div>
              {step.done && <span className="text-green-400 text-xs pt-1">✅</span>}
            </div>
          ))}
        </div>

        {/* Delivery address */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-4">
          <p className="text-white font-bold mb-2">📍 Delivery Address</p>
          <p className="text-zinc-400 text-sm">{selectedOrder.address}</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <p className="text-white font-bold mb-2">💳 Payment Method</p>
          <p className="text-zinc-400 text-sm capitalize">{selectedOrder.paymentMethod}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black px-4 py-6 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/buyer/feed" className="text-zinc-400 hover:text-white">
          <ChevronLeft className="w-6 h-6"/>
        </Link>
        <h1 className="text-xl font-bold text-white">My Orders</h1>
      </div>

      {loading ? (
        <p className="text-zinc-500 text-center mt-20">Loading orders...</p>
      ) : orders.length === 0 ? (
        <div className="text-center mt-20">
          <p className="text-5xl mb-4">📦</p>
          <p className="text-zinc-400 mb-4">No orders yet!</p>
          <Link href="/buyer/feed"
            className="bg-purple-600 text-white px-6 py-3 rounded-full font-bold">
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map((order) => (
            <button key={order.id} onClick={() => setSelectedOrder(order)}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-left hover:border-purple-500 transition">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-purple-600/20 rounded-xl flex items-center justify-center">
                  <Package className="w-5 h-5 text-purple-400"/>
                </div>
                <div className="flex-1">
                  <p className="text-white font-bold text-sm">#{order.id.slice(0,8).toUpperCase()}</p>
                  <p className="text-zinc-500 text-xs">
                    {order.createdAt?.toDate?.()?.toLocaleDateString() ?? "Recent"}
                  </p>
                </div>
                <span className="bg-green-500/20 text-green-400 text-xs font-bold px-2 py-1 rounded-full">
                  {order.status ?? "Confirmed"}
                </span>
              </div>
              <div className="flex gap-2 mb-2 overflow-x-auto">
                {order.items?.slice(0, 3).map((item, i) => (
                  <img key={i} src={item.image} alt={item.name}
                    className="w-12 h-12 rounded-xl object-cover flex-shrink-0"/>
                ))}
              </div>
              <div className="flex justify-between items-center">
                <p className="text-zinc-400 text-xs">{order.items?.length} item(s)</p>
                <p className="text-purple-400 font-bold">₹{order.total}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </main>
  );
}