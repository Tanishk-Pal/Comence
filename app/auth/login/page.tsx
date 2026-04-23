"use client";
import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const snap = await getDoc(doc(db, "users", cred.user.uid));
      const role = snap.data()?.role;
      toast.success("Welcome back! 👋");
     const isAdmin = cred.user.email === "Palt51419@gmail.com";
      if (isAdmin) {
        router.push("/admin/dashboard");
      } else if (role === "seller") {
        router.push("/seller/dashboard");
      } else {
        router.push("/buyer/feed");
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.message.includes("user-not-found") || err.message.includes("wrong-password") || err.message.includes("invalid-credential")) {
          toast.error("Wrong email or password!");
        } else {
          toast.error(err.message);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex items-center justify-center min-h-screen bg-black px-4">
      <div className="w-full max-w-sm bg-zinc-900 rounded-2xl p-8 border border-zinc-800">
        <h2 className="text-2xl font-bold text-white mb-1">
          Welcome to <span className="text-purple-500">Comence</span>
        </h2>
        <p className="text-zinc-400 text-sm mb-6">Login to your account</p>
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="bg-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none focus:ring-2 ring-purple-500"/>
          <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="bg-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none focus:ring-2 ring-purple-500"/>
          <button disabled={loading} type="submit"
            className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 py-3 rounded-xl font-semibold text-white transition">
            {loading ? "Logging in..." : "Log In"}
          </button>
        </form>
        <div className="mt-4 flex flex-col gap-2 text-center">
          <p className="text-zinc-400 text-sm">
            New buyer?{" "}
            <Link href="/auth/signup?role=buyer" className="text-purple-400 hover:underline">
              Sign up as Buyer
            </Link>
          </p>
          <p className="text-zinc-400 text-sm">
            New seller?{" "}
            <Link href="/auth/signup?role=seller" className="text-purple-400 hover:underline">
              Sign up as Seller
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}