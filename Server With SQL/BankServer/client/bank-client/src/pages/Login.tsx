import "./Login.css";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { api } from "../api";
import "./Login.css";

function extractErrorMessage(e: unknown): string {
  if (!axios.isAxiosError(e)) return "Login failed";
  const d = e.response?.data;
  if (d && typeof d === "object" && "message" in d) {
    const m = (d as { message?: unknown }).message;
    if (typeof m === "string") return m;
  }
  return e.message || "Login failed";
}

export default function Login() {
  const nav = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);

    try {
      const res = await api.post("/auth/login", { username, password });
      const jwt = res.data.jwt as string;
      localStorage.setItem("jwt", jwt);
      nav("/dashboard");
    } catch (e: unknown) {
      setErr(extractErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login">
      <div className="loginCard">
        <div className="loginHeader">
          <div className="loginLogo">🏦</div>
          <div>
            <h2 className="loginTitle">Sign in</h2>
            <p className="loginSub">Use your bank username and password.</p>
          </div>
        </div>

        <form onSubmit={submit}>
          <label className="loginLabel">Username</label>
          <input
            className="loginInput"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="e.g. itay1"
            autoComplete="username"
          />

          <label className="loginLabel">Password</label>
          <input
            className="loginInput"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />

          <button className="loginBtn" disabled={busy}>
            {busy ? "Signing in..." : "Sign in"}
          </button>

          {err && <div className="loginError">{err}</div>}

          <div className="loginFooter">© 2026 Bank Client</div>
        </form>
      </div>
    </div>
  );
}