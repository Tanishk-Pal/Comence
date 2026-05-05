"use client";
import { useState, useEffect, useRef } from "react";
import { collection, addDoc, getDocs, query, where, doc, getDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Product = { id: string; name: string; price: number; imageUrl: string; };

export default function UploadReel() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [caption, setCaption] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setAuthReady(true);
      if (!user) { router.push("/auth/login"); return; }

      getDocs(query(collection(db, "products"), where("sellerId", "==", user.uid)))
        .then((snap) => setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Product[]));
    });
    return unsub;
  }, []);

  // ✅ Only allow direct video links
  const isDirectVideo = (url: string) => {
    return (
      url.endsWith(".mp4") ||
      url.endsWith(".webm") ||
      url.endsWith(".mov") ||
      url.includes("pexels.com")
    );
  };

  // ── File Upload (Cloudinary) ──
  const handleFileUpload = async (file: File) => {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      toast.error("Cloudinary not set up!");
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      toast.error("Max 100MB allowed");
      return;
    }

    setUploadingFile(true);
    setUploadProgress(0);

    const local = URL.createObjectURL(file);
    setPreviewUrl(local);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", uploadPreset);

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`,
        { method: "POST", body: formData }
      );

      const data = await res.json();

      if (!data.secure_url) throw new Error();

      URL.revokeObjectURL(local);

      setVideoUrl(data.secure_url);
      setPreviewUrl(data.secure_url);
      setUrlInput(data.secure_url);

      toast.success("Uploaded successfully ✅");
    } catch {
      toast.error("Upload failed");
      setPreviewUrl("");
    } finally {
      setUploadingFile(false);
      setUploadProgress(0);
    }
  };

  // ── Handle URL ──
  const handleUrlSubmit = () => {
    const url = urlInput.trim();
    if (!url) return;

    if (!isDirectVideo(url)) {
      toast.error("Only MP4/WebM or Pexels videos allowed");
      return;
    }

    setVideoUrl(url);
    setPreviewUrl(url);
    toast.success("Video loaded ✅");
  };

  // ── Publish ──
  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!auth.currentUser) return router.push("/auth/login");
    if (!videoUrl) return toast.error("Add video");
    if (!selectedProduct) return toast.error("Select product");
    if (!caption.trim()) return toast.error("Add caption");

    setLoading(true);

    try {
      const product = products.find((p) => p.id === selectedProduct)!;
      const userSnap = await getDoc(doc(db, "users", auth.currentUser.uid));

      await addDoc(collection(db, "reels"), {
        videoUrl,
        caption: caption.trim(),
        productName: product.name,
        price: product.price,
        productImage: product.imageUrl,
        productId: selectedProduct,
        sellerId: auth.currentUser.uid,
        sellerName: userSnap.data()?.name ?? "Seller",
        likes: 0,
        createdAt: new Date(),
      });

      toast.success("Reel published 🎉");
      router.push("/seller/dashboard");
    } catch {
      toast.error("Publish failed");
    } finally {
      setLoading(false);
    }
  };

  if (!authReady) return <div className="text-white text-center mt-20">Loading...</div>;

  const canPublish = videoUrl && selectedProduct && caption.trim() && !loading;

  return (
    <main className="min-h-screen bg-black px-4 py-8 max-w-md mx-auto">
      <h1 className="text-white text-xl mb-6">Upload Reel</h1>

      {/* URL input */}
      <div className="flex gap-2 mb-4">
        <input
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          placeholder="Paste Pexels or MP4 link"
          className="flex-1 bg-zinc-800 text-white px-3 py-2 rounded"
        />
        <button onClick={handleUrlSubmit} className="bg-purple-600 px-4 rounded text-white">
          Load
        </button>
      </div>

      {/* Upload button */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFileUpload(f);
        }}
      />

      <button
        onClick={() => fileInputRef.current?.click()}
        className="w-full bg-zinc-800 py-4 rounded text-white mb-4"
      >
        Upload from Gallery
      </button>

      {/* Preview */}
      {previewUrl && (
        <video
          src={previewUrl}
          controls
          autoPlay
          className="w-full mb-4 rounded"
        />
      )}

      {/* Caption */}
      <textarea
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        placeholder="Caption..."
        className="w-full bg-zinc-800 text-white p-2 rounded mb-4"
      />

      {/* Product */}
      <select
        value={selectedProduct}
        onChange={(e) => setSelectedProduct(e.target.value)}
        className="w-full bg-zinc-800 text-white p-2 rounded mb-4"
      >
        <option value="">Select product</option>
        {products.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name} ₹{p.price}
          </option>
        ))}
      </select>

      {/* Publish */}
      <button
        onClick={handlePublish}
        disabled={!canPublish}
        className="w-full bg-purple-600 py-3 rounded text-white"
      >
        Publish Reel
      </button>
    </main>
  );
}