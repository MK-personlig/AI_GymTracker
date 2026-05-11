import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError("");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) {
      setStatus("error");
      setError(error.message);
    } else {
      setStatus("sent");
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-full max-w-sm mx-auto px-6 py-12">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-neutral-700 to-neutral-900 ring-1 ring-neutral-700 flex items-center justify-center mb-5">
        <span className="text-2xl font-bold tracking-tight">G</span>
      </div>
      <h1 className="text-2xl font-semibold mb-1">Gym Tracker</h1>
      <p className="text-sm text-neutral-500 mb-8">Sign in with your email</p>

      {status === "sent" ? (
        <div className="text-center w-full">
          <div className="rounded-xl bg-neutral-900 border border-neutral-800 p-5 mb-3">
            <p className="text-base font-medium mb-1">Check your inbox</p>
            <p className="text-sm text-neutral-500">
              We sent a magic link to <span className="text-neutral-300">{email}</span>.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setStatus("idle");
              setEmail("");
            }}
            className="text-sm text-neutral-400 hover:text-white"
          >
            Use a different email
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="w-full space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full px-4 py-3 rounded-xl bg-neutral-900 border border-neutral-800 focus:outline-none focus:border-neutral-600 focus:ring-2 focus:ring-neutral-700 text-base"
            required
            autoFocus
            autoComplete="email"
          />
          <button
            type="submit"
            disabled={status === "sending"}
            className="w-full py-3 rounded-xl bg-white text-black font-semibold disabled:opacity-50 disabled:cursor-not-allowed active:bg-neutral-200"
          >
            {status === "sending" ? "Sending…" : "Send magic link"}
          </button>
          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}
        </form>
      )}
    </div>
  );
}
