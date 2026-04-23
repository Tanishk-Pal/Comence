"use client";
import { useEffect } from "react";
import Link from "next/link";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const snap = await getDoc(doc(db, "users", user.uid));
        const data = snap.data();
        if (data?.isAdmin) {
          router.push("/admin/dashboard");
        } else {
          router.push("/buyer/feed");
        }
      }
    });
    return unsub;
  }, []);

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black px-4 text-center">
      <h1 className="text-5xl font-bold mb-3 tracking-tight">
        <span className="text-white">Com</span>
        <span className="text-purple-500">ence</span>
      </h1>
      <p className="text-zinc-400 text-lg mb-10 max-w-sm">
        Watch reels. Buy instantly. Sell to the world.
      </p>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Link href="/auth/signup"
          className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 rounded-full font-bold text-lg transition">
          Get Started Free
        </Link>
        <Link href="/auth/login"
          className="border border-zinc-700 text-zinc-300 hover:bg-zinc-800 px-8 py-4 rounded-full font-semibold transition">
          Log In
        </Link>
      </div>
      <p className="mt-6 text-zinc-600 text-xs">
        Want to sell? You can do that after signing up!
      </p>
    </main>
  );
}