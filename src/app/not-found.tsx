import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="bg-muted/30 flex min-h-screen flex-col items-center justify-center px-6">
      <p className="text-primary text-sm font-medium">404</p>
      <h1 className="mt-2 text-3xl font-bold">Page not found</h1>
      <Button className="mt-6" render={<Link href="/" />}>
        Go home
      </Button>
    </div>
  );
}
