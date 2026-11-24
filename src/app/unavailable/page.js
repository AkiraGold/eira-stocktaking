"use client";
import { useRouter } from "next/navigation";
import Button from "@/components/atoms/Button";

export default function UnavailablePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--surface-2)" }}>
      <div className="text-center max-w-md">
        <div className="text-6xl mb-4">⚠️</div>
        <h1 className="text-2xl font-bold mb-4" style={{ color: "var(--fg)" }}>
          Backend nedostupný
        </h1>
        <p className="mb-6" style={{ color: "var(--muted)" }}>
          Aplikace se momentálně nemůže spojit se serverem nebo databází.
          Zkuste to prosím za chvíli znovu.
        </p>
        <Button onClick={() => router.push("/")}>Zkusit znovu</Button>
      </div>
    </div>
  );
}

