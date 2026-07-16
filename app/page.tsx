import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="space-y-3">
        <p className="text-muted-foreground text-sm font-medium uppercase tracking-widest">
          ML Printing
        </p>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          ML Digital Event Platform
        </h1>
        <p className="text-muted-foreground mx-auto max-w-md text-lg">
          Premium event websites and matching printed invitations.
        </p>
      </div>
      <div className="flex gap-3">
        <Button>Get started</Button>
        <Button variant="outline">Browse templates</Button>
      </div>
      <p className="text-muted-foreground mt-8 text-xs">
        Phase 0 — engineering foundation. Business features arrive in later
        phases.
      </p>
    </main>
  );
}
