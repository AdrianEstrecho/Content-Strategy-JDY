import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center">
      <div className="surface p-8 w-full max-w-sm">
        <div className="mb-6">
          <div className="eyebrow mb-1.5">JustDoYou</div>
          <h1 className="editorial-heading text-2xl">Welcome back</h1>
          <p className="text-sm text-ink-400 mt-1.5">
            Enter the passphrase to continue.
          </p>
        </div>
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
