"use client";
import { useState } from "react";
import { useCartStore } from "@/store/cartStore";
import { useRouter } from "next/navigation";
import { collection, addDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import toast from "react-hot-toast";
import Link from "next/link";
import { ShieldCheck, ChevronLeft } from "lucide-react";

export default function CheckoutPage() {
  const { items, total, clearCart } = useCartStore();
  const [paymentMethod, setPaymentMethod] = useState<"upi" | "card" | "cod">("upi");
  const [upiId, setUpiId] = useState("");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderId, setOrderId] = useState("");
  const router = useRouter();

  // Calculate discounted total
  const discountedTotal = items.reduce((sum, item) => {
    const offer = (item as any).offer;
    const discounted = offer ? Math.round(item.price - (item.price * offer / 100)) : item.price;
    return sum + discounted * item.quantity;
  }, 0);

  const savings = total() - discountedTotal;

  const handleOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const ref = await addDoc(collection(db, "orders"), {
        items,
        total: discountedTotal,
        originalTotal: total(),
        savings,
        paymentMethod,
        address,
        name,
        phone,
        userId: auth.currentUser?.uid ?? "guest",
        userEmail: auth.currentUser?.email ?? "guest",
        status: "confirmed",
        trackingStatus: "Order Placed",
        trackingSteps: [
          { label: "Order Placed", done: true, time: new Date().toISOString() },
          { label: "Processing", done: false, time: null },
          { label: "Dispatched", done: false, time: null },
          { label: "Out for Delivery", done: false, time: null },
          { label: "Delivered", done: false, time: null },
        ],
        createdAt: new Date(),
      });
      setOrderId(ref.id);
      clearCart();
      setOrderPlaced(true);
    } catch (err) {
      console.error(err);
      toast.error("Order failed. Try again!");
    } finally {
      setLoading(false);
    }
  };

  if (orderPlaced) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center px-4">
        <div className="text-center max-w-sm w-full">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-2xl font-bold text-white mb-2">Order Confirmed!</h1>
          <p className="text-zinc-400 mb-2">Your order has been placed successfully!</p>
          <p className="text-zinc-500 text-xs mb-6">Order ID: #{orderId.slice(0,8).toUpperCase()}</p>

          {/* Order tracker */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-6 text-left">
            <p className="text-white font-bold mb-4">📦 Order Tracker</p>
            {[
              { label: "Order Placed", icon: "✅", done: true },
              { label: "Processing", icon: "⏳", done: false },
              { label: "Dispatched", icon: "🚚", done: false },
              { label: "Out for Delivery", icon: "🛵", done: false },
              { label: "Delivered", icon: "🏠", done: false },
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-3 mb-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step.done ? "bg-green-500" : "bg-zinc-800"}`}>
                  {step.done ? "✓" : i + 1}
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-semibold ${step.done ? "text-green-400" : "text-zinc-500"}`}>
                    {step.icon} {step.label}
                  </p>
                </div>
                {step.done && <span className="text-green-400 text-xs">Done</span>}
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3">
            <Link href="/buyer/feed"
              className="block w-full bg-purple-600 hover:bg-purple-700 text-white font-bold px-8 py-4 rounded-2xl transition">
              Continue Shopping
            </Link>
            <Link href="/buyer/orders"
              className="block w-full bg-zinc-800 hover:bg-zinc-700 text-white font-semibold px-8 py-3 rounded-2xl transition text-sm">
              View My Orders
            </Link>
          </div>
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
        <h1 className="text-xl font-bold text-white">Checkout</h1>
      </div>

      {/* Order summary */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-4">
        <p className="text-white font-semibold mb-3">Order Summary</p>
        {items.map((item) => {
          const offer = (item as any).offer;
          const discounted = offer ? Math.round(item.price - (item.price * offer / 100)) : item.price;
          return (
            <div key={item.id} className="flex items-center gap-3 mb-3">
              <img src={item.image} alt={item.name} className="w-14 h-14 rounded-xl object-cover"/>
              <div className="flex-1">
                <p className="text-white text-sm font-semibold">{item.name}</p>
                <p className="text-zinc-400 text-xs">Qty: {item.quantity}</p>
                {offer && <span className="text-green-400 text-xs">{offer}% OFF applied!</span>}
              </div>
              <div className="text-right">
                <p className="text-purple-400 font-bold text-sm">₹{discounted * item.quantity}</p>
                {offer && <p className="text-zinc-500 text-xs line-through">₹{item.price * item.quantity}</p>}
              </div>
            </div>
          );
        })}
        <div className="border-t border-zinc-800 mt-3 pt-3">
          {savings > 0 && (
            <div className="flex justify-between text-sm mb-1">
              <span className="text-green-400">You save</span>
              <span className="text-green-400 font-bold">-₹{savings}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-lg">
            <span className="text-white">Total</span>
            <span className="text-purple-400">₹{discountedTotal}</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleOrder} className="flex flex-col gap-4">
        {/* Delivery details */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <p className="text-white font-semibold mb-3">Delivery Details</p>
          <div className="flex flex-col gap-3">
            <input required value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              className="w-full bg-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none focus:ring-2 ring-purple-500"/>
            <input required value={phone} onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone number" type="tel"
              className="w-full bg-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none focus:ring-2 ring-purple-500"/>
            <textarea required value={address} onChange={(e) => setAddress(e.target.value)}
              placeholder="Full delivery address with pincode" rows={3}
              className="w-full bg-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none focus:ring-2 ring-purple-500 resize-none"/>
          </div>
        </div>

        {/* Payment method */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <p className="text-white font-semibold mb-3">Payment Method</p>
          <div className="flex flex-col gap-2">
            {[
              { id: "upi", label: "UPI / QR Scanner", emoji: "📱", desc: "Pay via any UPI app" },
              { id: "card", label: "Credit / Debit Card", emoji: "💳", desc: "Visa, Mastercard, Rupay" },
              { id: "cod", label: "Cash on Delivery", emoji: "🚚", desc: "Pay when you receive" },
            ].map((m) => (
              <button type="button" key={m.id}
                onClick={() => setPaymentMethod(m.id as "upi" | "card" | "cod")}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition text-left ${paymentMethod === m.id ? "border-purple-500 bg-purple-600/10" : "border-zinc-700 bg-zinc-800"}`}>
                <span className="text-2xl">{m.emoji}</span>
                <div className="flex-1">
                  <p className="text-white text-sm font-semibold">{m.label}</p>
                  <p className="text-zinc-500 text-xs">{m.desc}</p>
                </div>
                {paymentMethod === m.id && <span className="text-purple-400 text-lg">✓</span>}
              </button>
            ))}
          </div>
        </div>

        {/* UPI QR */}
        {paymentMethod === "upi" && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-center">
            <p className="text-white font-semibold mb-3">Scan to Pay ₹{discountedTotal}</p>
            <div className="bg-white rounded-2xl p-4 mx-auto w-52 h-52 flex items-center justify-center mb-3">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=upi://pay?pa=comence@upi%26am=${discountedTotal}%26cu=INR%26tn=Comence+Order`}
                alt="UPI QR" className="w-44 h-44"/>
            </div>
            <p className="text-zinc-400 text-xs mb-3">or pay using UPI ID</p>
            <input value={upiId} onChange={(e) => setUpiId(e.target.value)}
              placeholder="yourname@upi"
              className="w-full bg-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none focus:ring-2 ring-purple-500"/>
          </div>
        )}

        {/* Card */}
        {paymentMethod === "card" && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <p className="text-white font-semibold mb-3">Card Details</p>
            <div className="flex flex-col gap-3">
              <input placeholder="Card number" maxLength={16}
                className="w-full bg-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none focus:ring-2 ring-purple-500"/>
              <input placeholder="Cardholder name"
                className="w-full bg-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none focus:ring-2 ring-purple-500"/>
              <div className="flex gap-3">
                <input placeholder="MM/YY"
                  className="flex-1 bg-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none focus:ring-2 ring-purple-500"/>
                <input placeholder="CVV" maxLength={3}
                  className="flex-1 bg-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none focus:ring-2 ring-purple-500"/>
              </div>
            </div>
          </div>
        )}

        {/* COD */}
        {paymentMethod === "cod" && (
          <div className="bg-green-900/20 border border-green-500/30 rounded-2xl p-4">
            <p className="text-green-400 font-semibold mb-1">🚚 Cash on Delivery</p>
            <p className="text-zinc-400 text-sm">Keep ₹{discountedTotal} ready when your order arrives!</p>
          </div>
        )}

        <div className="flex items-center gap-2 text-zinc-500 text-xs">
          <ShieldCheck className="w-4 h-4 text-green-400 flex-shrink-0"/>
          <span>100% secure checkout — your data is encrypted and safe</span>
        </div>

        <button disabled={loading || items.length === 0} type="submit"
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 py-4 rounded-2xl font-bold text-white text-lg transition">
          {loading ? "Placing Order... ⏳" : `Place Order — ₹${discountedTotal} 🚀`}
        </button>
      </form>
    </main>
  );
}