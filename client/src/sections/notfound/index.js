import { Home, ArrowLeft, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LIST_NAVIGATIONS } from "@/components/layout/app-sidebar";
import ListPages from "./list-pages";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center space-y-8">
        {/* 404 Number with animation */}
        <div className="relative">
          <h1 className="text-9xl font-bold text-primary select-none">404</h1>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full opacity-20 blur-3xl animate-pulse" />
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-4">
          <h2 className="text-3xl md:text-4xl font-bold">Page Not Found</h2>
          <p className="text-slate-600 dark:text-slate-400 text-lg max-w-md mx-auto">
            Sorry, the page you are looking for does not exist or has been
            moved.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
          <Link href="/" className="w-full sm:w-auto">
            <Button
              size="lg"
              className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 px-8"
            >
              <Home className="mr-2 h-5 w-5" />
              Back to Home
            </Button>
          </Link>
        </div>

        {/* Links */}
        <div className="pt-8 border-t border-slate-200 max-w-md mx-auto">
          <p className="text-sm text-slate-500 mb-4">
            Maybe you are looking for:
          </p>

          <ListPages />
        </div>
      </div>
    </div>
  );
}
