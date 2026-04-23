"use client";
import { useCartStore } from "@/store/cartStore";
import { Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";

export default function CartPage() {
  const { items, removeItem, total, clearCart } = useCartStore();

  const handleCheckout = () => {
    if (items.length === 0) return;
    toast.success("Order placed successfully! 🎉");
    clearCart();
  };

  return (
    <main className="min-h-screen bg-black px-4 py-8 max-w-md mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/buyer/feed" className="text-zinc-400 hover:text-white">←</Link>
        <h1 className="text-xl font-bold">Your Cart</h1>
      </div>

      {items.length === 0 ? (
        <div className="text-center text-zinc-500 mt-20">
          <p className="text-lg mb-3">Your cart is empty</p>
          <Link href="/buyer/feed" className="text-purple-400 hover:underline">Browse reels →</Link>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3 mb-6">
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-3 bg-zinc-900 rounded-2xl p-3 border border-zinc-800">
                <img src={item.image} alt={item.name} className="w-14 h-14 rounded-xl object-cover"/>
                <div className="flex-1">
                  <p className="font-semibold text-sm">{item.name}</p>
                  <p className="text-purple-400 text-sm">₹{item.price} × {item.quantity}</p>
                </div>
                <button onClick={() => removeItem(item.id)}>
                  <Trash2 className="w-5 h-5 text-red-400 hover:text-red-300"/>
                </button>
              </div>
            ))}
          </div>

          <div className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800 mb-4">
            <div className="flex justify-between text-sm text-zinc-400 mb-2">
              <span>Subtotal</span><span>₹{total()}</span>
            </div>
            <div className="flex justify-between font-bold text-white">
              <span>Total</span><span>₹{total()}</span>
            </div>
          </div>

          <button onClick={handleCheckout}
            className="w-full bg-purple-600 hover:bg-purple-700 py-4 rounded-2xl font-bold text-lg transition">
            Place Order — ₹{total()}
          </button>
        </>
      )}
    </main>
  );
}