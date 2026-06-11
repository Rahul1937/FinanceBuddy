import Link from "next/link";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 px-6 py-16 text-slate-100">
      <Card className="w-full max-w-md space-y-8 bg-slate-900 text-slate-100">
        <div>
          <h1 className="text-3xl font-semibold">Sign in</h1>
          <p className="mt-2 text-sm text-slate-400">Access your Finance Buddy workspace.</p>
        </div>
        <form className="space-y-6">
          <label className="block text-sm font-medium text-slate-300">
            Email
            <Input type="email" placeholder="you@example.com" className="mt-2 bg-slate-950 text-slate-100" />
          </label>
          <label className="block text-sm font-medium text-slate-300">
            Password
            <Input type="password" placeholder="Password" className="mt-2 bg-slate-950 text-slate-100" />
          </label>
          <Button type="submit" className="w-full">Continue</Button>
        </form>
        <p className="text-center text-sm text-slate-400">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="font-semibold text-slate-100 hover:underline">
            Sign up
          </Link>
        </p>
      </Card>
    </main>
  );
}
