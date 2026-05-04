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
  const [videoUrl, setVideoUrl] = useState("");        // what gets saved to Firestore
  const [previewUrl, setPreviewUrl] = useState("");    // what the <video> previews
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [authReady, setAuthReady] = useState(false);

  // ── Wait for auth before fetching products ───────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setAuthReady(true);
      if (!user) { router.push("/auth/login"); return; }

      getDocs(query(collection(db, "products"), where("sellerId", "==", user.uid)))
        .then((snap) => setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Product[]));
    });
    return unsub;
  }, []);

  // ── Cloudinary file upload ───────────────────────────────────────────────
  const handleFileUpload = async (file: File) => {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      toast.error("Cloudinary not configured! Check .env.local");
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      toast.error("File too large! Max 100MB");
      return;
    }

    setUploadingFile(true);
    setUploadProgress(0);

    // Show local preview immediately while uploading
    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", uploadPreset);
      formData.append("resource_type", "video");

      // Use XMLHttpRequest for progress tracking
      const cloudinaryUrl = await new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            setUploadProgress(Math.round((e.loaded / e.total) * 100));
          }
        });

        xhr.addEventListener("load", () => {
          const data = JSON.parse(xhr.responseText);
          if (data.secure_url) resolve(data.secure_url);
          else reject(new Error("No URL returned"));
        });

        xhr.addEventListener("error", () => reject(new Error("Upload failed")));

        xhr.open("POST", `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`);
        xhr.send(formData);
      });

      setVideoUrl(cloudinaryUrl);   // save to Firestore
      setPreviewUrl(cloudinaryUrl); // switch preview to hosted URL
      URL.revokeObjectURL(localPreview);
      toast.success("Video uploaded! ✅");
    } catch {
      toast.error("Upload failed. Check your Cloudinary preset.");
      setPreviewUrl("");
    } finally {
      setUploadingFile(false);
      setUploadProgress(0);
    }
  };

  // ── URL paste handler — store original, preview extracted ────────────────
  const handleUrlPaste = async (url: string) => {
    url = url.trim();
    if (!url) return;

    const isExternal =
      url.includes("youtube.com") ||
      url.includes("youtu.be") ||
      url.includes("instagram.com");

    if (!isExternal) {
      // Direct mp4/cloudinary — works as-is
      setVideoUrl(url);
      setPreviewUrl(url);
      return;
    }

    // Store original URL (not extracted) so it never expires in Firestore
    setVideoUrl(url);
    setLoading(true);

    try {
      const res = await fetch("/api/extract-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const data = await res.json();

      if (data.videoUrl) {
        setPreviewUrl(data.videoUrl); // only use extracted URL for preview
        toast.success("Video ready to preview!");
      } else {
        toast.error("Couldn't preview — will still save the link");
        setPreviewUrl("");
      }
    } catch {
      toast.error("Preview failed — link will still be saved");
    } finally {
      setLoading(false);
    }
  };

  // ── Publish ──────────────────────────────────────────────────────────────
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!auth.currentUser) { toast.error("Not logged in!"); router.push("/auth/login"); return; }
    if (!selectedProduct) { toast.error("Select a product!"); return; }
    if (!videoUrl) { toast.error("Add a video!"); return; }
    if (!caption.trim()) { toast.error("Add a caption!"); return; }

    setLoading(true);

    try {
      const product = products.find((p) => p.id === selectedProduct)!;
      const userSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
      const sellerName = userSnap.data()?.name ?? "seller";

      await addDoc(collection(db, "reels"), {
        videoUrl,         // original URL — never expires for YouTube, permanent for Cloudinary
        caption: caption.trim(),
        productName: product.name,
        price: product.price,
        productImage: product.imageUrl,
        productId: selectedProduct,
        sellerId: auth.currentUser.uid,
        sellerName,
        likes: 0,
        createdAt: new Date(),
      });

      toast.success("Reel published! 🎉");
      router.push("/seller/dashboard");
    } catch (err) {
      console.error(err);
      toast.error("Publish failed");
    } finally {
      setLoading(false);
    }
  };

  if (!authReady) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const selectedProductData = products.find((p) => p.id === selectedProduct);

  return (
    <main className="min-h-screen bg-black px-4 py-8 max-w-md mx-auto pb-20">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/seller/dashboard" className="text-zinc-400 text-2xl hover:text-white transition">←</Link>
        <h1 className="text-xl font-bold text-white">Upload Reel</h1>
      </div>

      <form onSubmit={handleUpload} className="flex flex-col gap-5">

        {/* ── Video source ──────────────────────────────────────────────── */}
        <div className="bg-zinc-900 rounded-2xl p-4 flex flex-col gap-4">
          <p className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">Video Source</p>

          {/* URL input */}
          <div className="flex flex-col gap-1">
            <label className="text-zinc-400 text-xs">Paste YouTube / Instagram / Direct URL</label>
            <div className="flex gap-2">
              <input
                value={videoUrl.includes("youtube.com") || videoUrl.includes("youtu.be") || videoUrl.includes("instagram.com") ? videoUrl : videoUrl}
                onChange={(e) => {
                  setVideoUrl(e.target.value);
                  setPreviewUrl(""); // clear preview while typing
                }}
                onBlur={(e) => handleUrlPaste(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm placeholder-zinc-500 outline-none focus:border-purple-500 transition"
              />
              {loading && (
                <div className="flex items-center px-3">
                  <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-zinc-700" />
            <span className="text-zinc-500 text-xs">OR</span>
            <div className="flex-1 h-px bg-zinc-700" />
          </div>

          {/* File upload */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingFile}
              className="w-full border-2 border-dashed border-zinc-600 hover:border-purple-500 rounded-xl py-6 flex flex-col items-center gap-2 transition text-center"
            >
              {uploadingFile ? (
                <>
                  <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-purple-400 text-sm font-semibold">{uploadProgress}% uploaded</p>
                  <div className="w-40 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </>
              ) : (
                <>
                  <span className="text-3xl">📹</span>
                  <p className="text-zinc-300 text-sm font-semibold">Upload from device</p>
                  <p className="text-zinc-500 text-xs">MP4, MOV, WebM — max 100MB</p>
                </>
              )}
            </button>
          </div>
        </div>

        {/* ── Preview ───────────────────────────────────────────────────── */}
        {previewUrl && (
          <div className="relative rounded-2xl overflow-hidden bg-zinc-900">
            <video
              key={previewUrl}
              src={previewUrl}
              controls
              playsInline
              className="w-full max-h-80 object-cover"
              onError={() => {
                setPreviewUrl("");
                toast.error("Can't preview this video in browser");
              }}
            />
            <button
              type="button"
              onClick={() => { setVideoUrl(""); setPreviewUrl(""); if (fileInputRef.current) fileInputRef.current.value = ""; }}
              className="absolute top-2 right-2 bg-black/70 text-white rounded-full w-8 h-8 flex items-center justify-center text-lg hover:bg-red-500 transition"
            >×</button>
          </div>
        )}

        {/* ── Caption ───────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-1">
          <label className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">Caption</label>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Describe your product, add hashtags..."
            rows={3}
            maxLength={300}
            className="bg-zinc-900 border border-zinc-700 focus:border-purple-500 rounded-xl px-3 py-2.5 text-white text-sm placeholder-zinc-500 outline-none transition resize-none"
          />
          <p className="text-zinc-600 text-xs text-right">{caption.length}/300</p>
        </div>

        {/* ── Product ───────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-2">
          <label className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">Link a Product</label>
          <select
            value={selectedProduct}
            onChange={(e) => setSelectedProduct(e.target.value)}
            className="bg-zinc-900 border border-zinc-700 focus:border-purple-500 rounded-xl px-3 py-3 text-white text-sm outline-none transition"
          >
            <option value="">Select product...</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name} — ₹{p.price}</option>
            ))}
          </select>

          {/* Product preview card */}
          {selectedProductData && (
            <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-700 rounded-xl p-3">
              <img src={selectedProductData.imageUrl} alt={selectedProductData.name} className="w-14 h-14 rounded-xl object-cover" />
              <div>
                <p className="text-white text-sm font-semibold">{selectedProductData.name}</p>
                <p className="text-purple-400 font-bold">₹{selectedProductData.price}</p>
              </div>
              <span className="ml-auto text-green-400 text-xs font-semibold bg-green-400/10 px-2 py-1 rounded-full">✓ Linked</span>
            </div>
          )}

          {products.length === 0 && (
            <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
              <span className="text-amber-400 text-sm">⚠️ No products yet.</span>
              <Link href="/seller/add-product" className="text-amber-400 text-sm underline">Add one →</Link>
            </div>
          )}
        </div>

        {/* ── Publish button ────────────────────────────────────────────── */}
        <button
          type="submit"
          disabled={loading || uploadingFile || !videoUrl || !selectedProduct || !caption.trim()}
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-bold py-4 rounded-2xl transition text-base mt-2"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Publishing...
            </span>
          ) : "🎬 Publish Reel"}
        </button>
      </form>
    </main>
  );
}