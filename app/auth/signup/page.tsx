"use client";
import { useState, Suspense } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import Link from "next/link";

function SignupForm() {
  const params = useSearchParams();
  const role = (params.get("role") as "buyer" | "seller") ?? "buyer";
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, "users", cred.user.uid), {
        name, email, role, uid: cred.user.uid, createdAt: new Date(),
      });
      toast.success("Account created!");
      router.push(role === "seller" ? "/seller/dashboard" : "/buyer/feed");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex items-center justify-center min-h-screen bg-black px-4">
      <div className="w-full max-w-sm bg-zinc-900 rounded-2xl p-8 border border-zinc-800">
        <h2 className="text-2xl font-bold text-white mb-1">
          Join as <span className="text-purple-500 capitalize">{role}</span>
        </h2>
        <p className="text-zinc-400 text-sm mb-6">Create your Comence account</p>
        <form onSubmit={handleSignup} className="flex flex-col gap-4">
          <input required value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Full name" className="bg-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none focus:ring-2 ring-purple-500"/>
          <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="Email" className="bg-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none focus:ring-2 ring-purple-500"/>
          <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="Password" className="bg-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none focus:ring-2 ring-purple-500"/>
          <button disabled={loading} type="submit"
            className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 py-3 rounded-xl font-semibold text-white transition">
            {loading ? "Creating..." : "Create Account"}
          </button>
        </form>
        <p className="text-zinc-400 text-sm text-center mt-4">
          Already have an account?{" "}
          <Link href="/auth/login" className="text-purple-400 hover:underline">Log in</Link>
        </p>
      </div>
    </main>
  );
}

export default function SignupPage() {
  return <Suspense><SignupForm /></Suspense>;
}