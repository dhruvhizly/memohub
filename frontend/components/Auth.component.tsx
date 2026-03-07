"use client";

import { FormEvent, useState } from "react";
import { CONSTANTS } from "@/lib/constants";
import { useUserName } from "@/lib/store";

type AuthProps = {
  setUserId: (newUserid: string) => void;
  setUsername: (newUsername: string) => void;
};

const Auth = ({ setUserId, setUsername }: AuthProps) => {
  const [mode, setMode] = useState<"LOGIN" | "SIGNUP">("LOGIN");
  const username = useUserName((s) => s.username);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const handleModeChange = () =>
    setMode((prev) => (prev == "LOGIN" ? "SIGNUP" : "LOGIN"));

  const handleAuth = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    try {
      const endpoint = new URL(
        mode === "SIGNUP" ? "/auth/signup" : "/auth/login",
        CONSTANTS.SERVER_URL
      ).toString();

      const res = await fetch(endpoint, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });

      if (!res.ok) {
        if (res.status === 401 && res.statusText === "Unauthorized") {
          setMsg("Invalid credentials!");
          return;
        }
        setMsg("Something went wrong");
        return;
      }

      const {id, name} = await res.json();
      setUserId(id);
      setUsername(name);
    } catch (err: any) {
      setMsg(err.message || "Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col justify-center items-center">
      <div className="w-full flex items-center justify-center p-4">
        <form
          onSubmit={handleAuth}
          className="w-full max-w-sm bg-black shadow-lg p-6 rounded-xl flex flex-col gap-4"
        >
          <h2 className="text-2xl font-bold text-center">
            {mode === "SIGNUP" ? "Create an account" : "Welcome back!"}
          </h2>

          <input
            type="text"
            placeholder="Username"
            value={username}
            className="border p-2 rounded-lg"
            onChange={(e) => setUsername(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            className="border p-2 rounded-lg"
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button
            disabled={loading}
            className="bg-black text-white p-2 rounded-lg hover:opacity-90 disabled:opacity-40 border cursor-pointer border-white"
            type="submit"
          >
            {loading
              ? mode === "SIGNUP"
                ? "Creating account..."
                : "Logging in..."
              : mode === "SIGNUP"
              ? "Sign Up"
              : "Login"}
          </button>
          {msg && <p className="text-center text-sm text-gray-700">{msg}</p>}
        </form>
      </div>
      <div className="text-white">
        {mode == "SIGNUP" ? "Already a user? " : "Not a user? "}
        <button
          onClick={handleModeChange}
          className="cursor-pointer text-blue-400"
        >
          {mode == "SIGNUP" ? "Login" : "Signup"}
        </button>
      </div>
    </div>
  );
};

export default Auth;
