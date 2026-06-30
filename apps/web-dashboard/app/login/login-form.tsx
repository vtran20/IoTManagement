"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { demoUser } from "../../lib/api";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    if (
      data.get("email") === demoUser.email &&
      data.get("password") === demoUser.password
    ) {
      window.localStorage.setItem("iot-management-session", demoUser.email);
      router.push("/dashboard");
      return;
    }
    setError("Invalid email or password");
  }

  return (
    <main className="login-screen">
      <form className="login-panel" onSubmit={submit}>
        <div className="brand-block">
          <div className="brand-mark">IU</div>
          <div>
            <strong>IoT Utilities</strong>
            <span>Smart buildings</span>
          </div>
        </div>
        <h1>Sign in</h1>
        {error ? <p className="form-error">{error}</p> : null}
        <label className="field">
          <span>Email</span>
          <input name="email" type="email" defaultValue={demoUser.email} />
        </label>
        <label className="field">
          <span>Password</span>
          <input
            name="password"
            type="password"
            defaultValue={demoUser.password}
          />
        </label>
        <button className="primary-button" type="submit">
          Sign in
        </button>
      </form>
    </main>
  );
}
