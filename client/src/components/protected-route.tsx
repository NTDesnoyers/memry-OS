/**
 * ProtectedRoute Component
 * 
 * Wraps routes to enforce feature mode restrictions.
 * In beta mode, redirects users to home if they try to access founder-only routes.
 */

import { useLocation } from "wouter";
import { useEffect } from "react";
import { isBetaMode, isRouteAllowedInBetaMode } from "@/lib/feature-mode";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [location, setLocation] = useLocation();
  
  useEffect(() => {
    // In beta mode, check if this route is allowed
    if (isBetaMode() && !isRouteAllowedInBetaMode(location)) {
      // Redirect to home page
      setLocation('/');
    }
  }, [location, setLocation]);
  
  // In beta mode, don't render founder-only routes
  if (isBetaMode() && !isRouteAllowedInBetaMode(location)) {
    return null;
  }
  
  return <>{children}</>;
}
