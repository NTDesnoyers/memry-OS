/**
 * ProtectedRoute Component
 * 
 * Wraps routes to enforce feature mode restrictions.
 * In beta mode, redirects users to home if they try to access founder-only routes.
 * Founder can access all routes regardless of mode.
 * 
 * Note: User email is passed as a prop to avoid calling useAuth() here,
 * which prevents React hook ordering issues during navigation (React Error #310).
 */

import { useLocation } from "wouter";
import { useEffect } from "react";
import { isBetaMode, isRouteAllowedInBetaMode } from "@/lib/feature-mode";

interface ProtectedRouteProps {
  children: React.ReactNode;
  userEmail?: string | null;
}

export function ProtectedRoute({ children, userEmail }: ProtectedRouteProps) {
  const [location, setLocation] = useLocation();
  
  useEffect(() => {
    // In beta mode, check if this route is allowed (founder can access all)
    if (isBetaMode(userEmail) && !isRouteAllowedInBetaMode(location, userEmail)) {
      // Redirect to home page
      setLocation('/');
    }
  }, [location, setLocation, userEmail]);
  
  // In beta mode, don't render founder-only routes (founder can access all)
  if (isBetaMode(userEmail) && !isRouteAllowedInBetaMode(location, userEmail)) {
    return null;
  }
  
  return <>{children}</>;
}
