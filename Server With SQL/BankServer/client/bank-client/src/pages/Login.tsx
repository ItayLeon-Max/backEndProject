import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { api } from "../api";

type Mode = "login" | "register";

function extractErrorMessage(e: unknown): string {
  if (!axios.isAxiosError(e)) return "Request failed";

  const status = e.response?.status;
  const data = e.response?.data;

  if (status === 401) return "שם משתמש או סיסמה לא נכונים";
  if (status === 404) return "הנתיב לא נמצא";
  if (status === 500) return "שגיאת שרת, נסה שוב מאוחר יותר";

  if (
    data &&
    typeof data === "object" &&
    "message" in data &&
    typeof (data as { message: unknown }).message === "string"
  ) {
    return (data as { message: string }).message;
  }

  return `Request failed (${status ?? "?"})`;
}

export default function Login() {
  const nav = useNavigate();

  const [mode, setMode] = useState<Mode>("login");
  const title = useMemo(() => (mode === "login" ? "Login" : "Register"), [mode]);
  const subtitle = useMemo(
    () => (mode === "login" ? "Sign in to your account" : "Create your bank user"),
    [mode]
  );

  // register fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  // shared fields
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function switchMode(next: Mode) {
    setMode(next);
    setErr(null);
    // optional: clear fields on switch
    setName("");
    setEmail("");
    setUsername("");
    setPassword("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);

    try {
      if (mode === "login") {
        if (!username.trim() || !password.trim()) {
          setErr("חסר שם משתמש או סיסמה");
          return;
        }

        const res = await api.post("/auth/login", {
          username: username.trim(),
          password,
        });

        const jwt = res.data.jwt as string;
        localStorage.setItem("jwt", jwt);
        nav("/dashboard");
        return;
      }

      // register
      if (!name.trim() || !username.trim() || !email.trim() || !password.trim()) {
        setErr("חסרים פרטים להרשמה");
        return;
      }

      const res = await api.post("/auth/register", {
        name: name.trim(),
        username: username.trim(),
        email: email.trim(),
        password,
        // ✅ לא חייב role (יש default בשרת)
        // אם אתה רוצה כן לשלוח:
        // role: "user",
      });

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
    <div className="bg">
      <div className="orb orbA" />
      <div className="orb orbB" />
      <div className="orb orbC" />

      <div className="shell">
        <div className="brand" style={{ justifyContent: "center" }}>
          <div className="logo">🏦</div>
          <div>
            <div className="brandTitle">Bank Client</div>
            <div className="brandSub">{subtitle}</div>
          </div>
        </div>

        <div className="cardPro">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
            <h1 className="title" style={{ margin: 0 }}>
              {title}
            </h1>

            <button
              type="button"
              className="btnGhost"
              onClick={() => switchMode(mode === "login" ? "register" : "login")}
              style={{ padding: "8px 10px" }}
              disabled={busy}
            >
              {mode === "login" ? "Create account" : "I have an account"}
            </button>
          </div>

          <form className="form" onSubmit={submit}>
            {mode === "register" && (
              <>
                <div className="label">Full name</div>
                <input
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Itay Leon"
                  autoComplete="name"
                />

                <div className="label">Email</div>
                <input
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. itay@example.com"
                  autoComplete="email"
                  inputMode="email"
                />
              </>
            )}

            <div className="label">Username</div>
            <input
              className="input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. itay1"
              autoComplete="username"
            />

            <div className="label">Password</div>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />

            <button className="btnPrimary" disabled={busy}>
              {busy ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
            </button>

            {err && <div className="alert">{err}</div>}

            <div className="footerNote">© 2026 Bank Client</div>
          </form>
        </div>
      </div>
    </div>
  );
}