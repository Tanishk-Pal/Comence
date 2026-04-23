"use client";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useCartStore } from "@/store/cartStore";
import { Star, ChevronLeft, ZoomIn } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import toast from "react-hot-toast";
import Link from "next/link";

type Product = {
  id: string; name: string; price: number; imageUrl: string;
  images?: string[]; description: string; stock: number;
  category: string; offer?: number;
};

export default function ProductPage() {
  const { id } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const [loading, setLoading] = useState(true);
  const { addItem } = useCartStore();
  const router = useRouter();

  useEffect(() => {
    const fetch = async () => {
      const snap = await getDoc(doc(db, "products", id as string));
      if (snap.exists()) setProduct({ id: snap.id, ...snap.data() } as Product);
      setLoading(false);
    };
    fetch();
  }, [id]);

  const handleBuyNow = () => {
    if (!product) return;
    const finalPrice = product.offer
      ? Math.round(product.price - (product.price * product.offer / 100))
      : product.price;
    addItem({ id: product.id, name: product.name, price: finalPrice, image: product.imageUrl, quantity: 1 });
    router.push("/buyer/checkout");
  };

  const handleAddToCart = () => {
    if (!product) return;
    const finalPrice = product.offer
      ? Math.round(product.price - (product.price * product.offer / 100))
      : product.price;
    addItem({ id: product.id, name: product.name, price: finalPrice, image: product.imageUrl, quantity: 1 });
    toast.success("Added to cart! 🛒");
  };

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"/>
        <p className="text-zinc-400">Loading product...</p>
      </div>
    </div>
  );

  if (!product) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <p className="text-4xl mb-3">😕</p>
        <p className="text-zinc-400">Product not found!</p>
        <Link href="/buyer/feed" className="mt-4 inline-block bg-purple-600 text-white px-6 py-2 rounded-full text-sm font-bold">
          Go Back
        </Link>
      </div>
    </div>
  );

  const allImages = product.images?.filter(img => img.trim() !== "").length
    ? product.images!.filter(img => img.trim() !== "")
    : [product.imageUrl];

  const discountedPrice = product.offer
    ? Math.round(product.price - (product.price * product.offer / 100))
    : product.price;

  const savedAmount = product.price - discountedPrice;

  return (
    <div className="min-h-screen bg-black">

      {/* Header */}
      <div className="sticky top-0 z-40 flex items-center gap-3 px-4 py-4 bg-black/90 backdrop-blur border-b border-zinc-800">
        <Link href="/buyer/feed" className="text-zinc-400 hover:text-white transition">
          <ChevronLeft className="w-6 h-6"/>
        </Link>
        <h1 className="text-white font-bold flex-1 line-clamp-1">{product.name}</h1>
      </div>

      {/* Main layout — responsive */}
      <div className="md:flex md:gap-8 md:px-8 md:py-6 max-w-6xl mx-auto">

        {/* Left — Images */}
        <div className="md:w-1/2 md:sticky md:top-20 md:self-start">

          {/* Main image */}
          <div className="relative group cursor-zoom-in" onClick={() => setZoomed(true)}>
            <img
              src={allImages[selectedImage]}
              alt={product.name}
              className="w-full md:rounded-2xl object-contain bg-zinc-900"
              style={{ height: "400px", objectFit: "contain" }}
            />
            {product.offer && (
              <span className="absolute top-4 left-4 bg-red-500 text-white font-bold px-3 py-1 rounded-full text-sm">
                {product.offer}% OFF
              </span>
            )}
            <div className="absolute top-4 right-4 bg-black/50 rounded-full p-2 opacity-0 group-hover:opacity-100 transition">
              <ZoomIn className="w-5 h-5 text-white"/>
            </div>
          </div>

          {/* Thumbnails */}
          {allImages.length > 1 && (
            <div className="flex gap-3 px-4 md:px-0 py-3 overflow-x-auto">
              {allImages.map((img, i) => (
                <button key={i} onClick={() => setSelectedImage(i)}
                  className={`flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition ${selectedImage === i ? "border-purple-500 scale-105" : "border-zinc-700 hover:border-zinc-500"}`}>
                  <img src={img} alt={`view ${i + 1}`}
                    className="w-full h-full object-contain bg-zinc-900"/>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right — Details */}
        <div className="md:w-1/2 px-4 md:px-0 pb-32 md:pb-8">

          {/* Name */}
          <h2 className="text-white text-2xl font-bold mt-4 md:mt-0 mb-2">{product.name}</h2>

          {/* Stars */}
          <div className="flex items-center gap-2 mb-3">
            <div className="flex gap-0.5">
              {[1,2,3,4,5].map((s) => (
                <Star key={s} className="w-4 h-4 text-yellow-400 fill-yellow-400"/>
              ))}
            </div>
            <span className="text-zinc-400 text-sm">4.8 (128 reviews)</span>
            <span className="text-green-400 text-sm font-semibold">✓ Verified</span>
          </div>

          {/* Price */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-4">
            <div className="flex items-baseline gap-3 mb-1">
              <p className="text-purple-400 text-3xl font-bold">₹{discountedPrice}</p>
              {product.offer && (
                <>
                  <p className="text-zinc-500 text-lg line-through">₹{product.price}</p>
                  <span className="bg-green-500/20 text-green-400 text-sm font-bold px-3 py-1 rounded-full">
                    {product.offer}% OFF
                  </span>
                </>
              )}
            </div>
            {product.offer && (
              <p className="text-green-400 text-sm font-semibold">
                🎉 You save ₹{savedAmount} on this order!
              </p>
            )}
            <p className="text-zinc-500 text-xs mt-1">Inclusive of all taxes</p>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="bg-green-500/20 text-green-400 text-xs px-3 py-1.5 rounded-full font-semibold">✓ In Stock ({product.stock} left)</span>
            <span className="bg-blue-500/20 text-blue-400 text-xs px-3 py-1.5 rounded-full font-semibold">🚚 Free Delivery</span>
            <span className="bg-purple-500/20 text-purple-400 text-xs px-3 py-1.5 rounded-full font-semibold">↩️ 7 Day Return</span>
            <span className="bg-yellow-500/20 text-yellow-400 text-xs px-3 py-1.5 rounded-full font-semibold">⚡ Fast Shipping</span>
          </div>

          {/* Buy buttons — visible on PC inline */}
          <div className="hidden md:flex gap-3 mb-6">
            <button onClick={handleAddToCart}
              className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-4 rounded-2xl transition text-lg">
              🛒 Add to Cart
            </button>
            <button onClick={handleBuyNow}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 rounded-2xl transition text-lg">
              ⚡ Buy Now — ₹{discountedPrice}
            </button>
          </div>

          {/* Description */}
          <div className="border-t border-zinc-800 pt-4 mb-4">
            <p className="text-white font-bold text-lg mb-2">📋 Description</p>
            <p className="text-zinc-400 text-sm leading-relaxed">{product.description}</p>
          </div>

          {/* Offers */}
          <div className="border-t border-zinc-800 pt-4 mb-4">
            <p className="text-white font-bold text-lg mb-3">🎁 Available Offers</p>
            <div className="flex flex-col gap-2">
              {[
                "💳 5% cashback on UPI payments",
                "🏦 10% off on your first order",
                "🚚 Free delivery on orders above ₹499",
                "↩️ Easy 7-day hassle-free returns",
              ].map((offer, i) => (
                <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm text-zinc-300">
                  {offer}
                </div>
              ))}
            </div>
          </div>

          {/* Reviews */}
          <div className="border-t border-zinc-800 pt-4">
            <p className="text-white font-bold text-lg mb-4">⭐ Customer Reviews</p>

            {/* Rating summary */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-4 flex items-center gap-4">
              <div className="text-center">
                <p className="text-5xl font-bold text-white">4.8</p>
                <div className="flex gap-0.5 justify-center mt-1">
                  {[1,2,3,4,5].map((s) => (
                    <Star key={s} className="w-4 h-4 text-yellow-400 fill-yellow-400"/>
                  ))}
                </div>
                <p className="text-zinc-400 text-xs mt-1">128 reviews</p>
              </div>
              <div className="flex-1">
                {[5,4,3,2,1].map((star) => (
                  <div key={star} className="flex items-center gap-2 mb-1">
                    <span className="text-zinc-400 text-xs w-2">{star}</span>
                    <Star className="w-3 h-3 text-yellow-400 fill-yellow-400"/>
                    <div className="flex-1 bg-zinc-800 rounded-full h-1.5">
                      <div className="bg-yellow-400 h-1.5 rounded-full"
                        style={{ width: star === 5 ? "75%" : star === 4 ? "15%" : star === 3 ? "7%" : "3%" }}/>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {[
              { name: "Rahul S.", review: "Amazing product! Super fast delivery. Totally worth every rupee!", stars: 5, date: "2 days ago" },
              { name: "Priya M.", review: "Great quality, totally worth the price! Packaging was excellent.", stars: 5, date: "1 week ago" },
              { name: "Amit K.", review: "Good product, happy with my purchase. Will buy again.", stars: 4, date: "2 weeks ago" },
              { name: "Sneha R.", review: "Exactly as shown in the reel. Love it! 🔥 Highly recommend.", stars: 5, date: "3 weeks ago" },
            ].map((r, i) => (
              <div key={i} className="mb-3 bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-sm font-bold text-white">
                    {r.name[0]}
                  </div>
                  <div className="flex-1">
                    <p className="text-white text-sm font-semibold">{r.name}</p>
                    <p className="text-zinc-500 text-xs">{r.date}</p>
                  </div>
                  <div className="flex gap-0.5">
                    {[...Array(r.stars)].map((_, s) => (
                      <Star key={s} className="w-3 h-3 text-yellow-400 fill-yellow-400"/>
                    ))}
                  </div>
                </div>
                <p className="text-zinc-400 text-sm leading-relaxed">{r.review}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Fixed buy buttons — mobile only */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur border-t border-zinc-800 p-4 flex gap-3">
        <button onClick={handleAddToCart}
          className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-4 rounded-2xl transition">
          🛒 Add to Cart
        </button>
        <button onClick={handleBuyNow}
          className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 rounded-2xl transition">
          ⚡ Buy — ₹{discountedPrice}
        </button>
      </div>

      {/* Zoom modal */}
      {zoomed && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
          onClick={() => setZoomed(false)}>
          <img src={allImages[selectedImage]} alt={product.name}
            className="max-w-full max-h-full object-contain rounded-2xl"/>
          <button className="absolute top-4 right-4 text-white bg-zinc-800 rounded-full p-2">✕</button>
        </div>
      )}
    </div>
  );
}