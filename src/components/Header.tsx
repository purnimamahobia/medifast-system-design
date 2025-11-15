"use client";

import { Search, ShoppingCart, MapPin, ChevronDown, User, LogOut, Package, FileText, Settings } from "lucide-react";
import Link from "next/link";
import { LiveViewersCounter } from "./LiveViewersCounter";
import { useSession, authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useState, useRef, useEffect } from "react";

export const Header = () => {
  const { data: session, isPending, refetch } = useSession();
  const router = useRouter();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showUserMenu]);

  const handleSignOut = async () => {
    const token = localStorage.getItem("bearer_token");

    const { error } = await authClient.signOut({
      fetchOptions: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    if (error?.code) {
      toast.error("Failed to sign out. Please try again.");
    } else {
      localStorage.removeItem("bearer_token");
      refetch();
      setShowUserMenu(false);
      toast.success("Signed out successfully");
      router.push("/");
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 bg-white z-50 border-b border-border-light shadow-sm">
      <div className="container mx-auto">
        <div className="flex items-center justify-between h-20 gap-4">
          {/* Logo */}
          <Link href="/" className="flex-shrink-0">
            <div className="text-2xl font-bold text-primary">
              Medi<span className="text-success-green">Fast</span>
            </div>
          </Link>

          {/* Location Selector */}
          <div className="hidden lg:flex items-center gap-2 px-4 py-2 border border-border-light rounded-lg hover:border-primary transition-colors cursor-pointer flex-shrink-0">
            <MapPin className="w-5 h-5 text-primary" />
            <div className="flex flex-col">
              <span className="text-xs text-text-secondary">Delivery in 10 mins</span>
              <div className="flex items-center gap-1">
                <span className="text-sm font-medium text-text-primary">Mumbai, Maharashtra</span>
                <ChevronDown className="w-4 h-4 text-text-secondary" />
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-xl hidden md:block">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" />
              <input
                type="text"
                placeholder="Search for medicines, health products..."
                className="w-full pl-12 pr-4 py-3 border border-border-light rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>

          {/* Live Viewers Counter */}
          <div className="hidden lg:block">
            <LiveViewersCounter />
          </div>

          {/* Auth Section */}
          {isPending ? (
            <div className="hidden sm:flex items-center gap-2 px-4 py-2 flex-shrink-0">
              <div className="w-5 h-5 rounded-full bg-gray-200 animate-pulse" />
              <div className="w-16 h-4 bg-gray-200 rounded animate-pulse" />
            </div>
          ) : session?.user ? (
            // User Profile Dropdown
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-muted transition-colors flex-shrink-0"
              >
                <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm">
                  {session.user.name?.charAt(0).toUpperCase() || "U"}
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-sm font-medium text-text-primary">{session.user.name}</span>
                  <span className="text-xs text-text-secondary">My Account</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-text-secondary transition-transform ${showUserMenu ? "rotate-180" : ""}`} />
              </button>

              {/* Dropdown Menu */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-border py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="px-4 py-3 border-b border-border">
                    <p className="text-sm font-medium text-text-primary">{session.user.name}</p>
                    <p className="text-xs text-text-secondary">{session.user.email}</p>
                  </div>
                  
                  <Link
                    href="/dashboard"
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted transition-colors"
                    onClick={() => setShowUserMenu(false)}
                  >
                    <Package className="w-4 h-4 text-text-secondary" />
                    <span className="text-sm text-text-primary">My Orders</span>
                  </Link>
                  
                  <Link
                    href="/prescriptions"
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted transition-colors"
                    onClick={() => setShowUserMenu(false)}
                  >
                    <FileText className="w-4 h-4 text-text-secondary" />
                    <span className="text-sm text-text-primary">Prescriptions</span>
                  </Link>
                  
                  <Link
                    href="/account"
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted transition-colors"
                    onClick={() => setShowUserMenu(false)}
                  >
                    <Settings className="w-4 h-4 text-text-secondary" />
                    <span className="text-sm text-text-primary">Account Settings</span>
                  </Link>
                  
                  <div className="border-t border-border my-2" />
                  
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-red-50 transition-colors w-full text-left"
                  >
                    <LogOut className="w-4 h-4 text-red-500" />
                    <span className="text-sm text-red-500 font-medium">Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            // Login/Register Buttons
            <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
              <Link
                href="/login"
                className="flex items-center gap-2 px-4 py-2 text-text-primary hover:text-primary transition-colors"
              >
                <User className="w-5 h-5" />
                <span className="text-sm font-medium">Login</span>
              </Link>
              <Link
                href="/register"
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-green-light transition-colors text-sm font-bold"
              >
                Sign Up
              </Link>
            </div>
          )}

          {/* Cart Button */}
          <Link href="/cart" className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-green-light transition-colors flex-shrink-0">
            <ShoppingCart className="w-5 h-5" />
            <span className="hidden sm:inline text-sm font-bold">Cart</span>
            <span className="bg-white text-primary text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              0
            </span>
          </Link>
        </div>

        {/* Mobile Search */}
        <div className="md:hidden pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
            <input
              type="text"
              placeholder="Search medicines..."
              className="w-full pl-10 pr-4 py-2 text-sm border border-border-light rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          {/* Mobile Live Viewers */}
          <div className="mt-2 flex justify-center">
            <LiveViewersCounter />
          </div>
        </div>
      </div>
    </header>
  );
};