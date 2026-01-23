import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import { useAuth } from "../auth/AuthContext";
import { getErrorMessage } from "../api/error";

export default function Login() {
  const nav = useNavigate();
  const { setToken } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

    async function submit() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await api.post("/auth/login", { username, password });
      const jwt = res.data?.jwt;
      if (!jwt) throw new Error("No jwt returned");
      setToken(jwt);
      nav("/stock");
    } catch (e: unknown) {
      setMsg(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0b1220", color: "white", display: "grid", placeItems: "center", padding: 18 }}>
      <div style={{ width: 360, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 16, padding: 16 }}>
        <h2 style={{ marginTop: 0 }}>Login</h2>

        <div style={{ display: "grid", gap: 10 }}>
          <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="username" />
          <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="password" type="password" />
          <button disabled={busy} onClick={submit}>{busy ? "..." : "התחבר"}</button>
          {msg && <div style={{ opacity: 0.9 }}>{msg}</div>}
        </div>
      </div>
    </div>
  );
}