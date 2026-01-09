import type { Express } from "express";
import { authStorage } from "./storage";
import { isAuthenticated } from "./replitAuth";

// Register auth-specific routes
export function registerAuthRoutes(app: Express): void {
  // Get current authenticated user (includes status for frontend routing)
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await authStorage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Get user's approval status (accessible even when pending)
  // Returns full user data for pending users so frontend can properly handle state
  app.get("/api/auth/status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await authStorage.getUser(userId);
      // Return full user object for consistent frontend handling
      res.json(user || { 
        id: userId,
        status: 'pending',
        email: req.user.claims.email || null,
        firstName: req.user.claims.first_name || null,
        lastName: req.user.claims.last_name || null,
        profileImageUrl: req.user.claims.profile_image_url || null,
        isAdmin: false,
        createdAt: null,
        updatedAt: null,
      });
    } catch (error) {
      console.error("Error fetching user status:", error);
      res.status(500).json({ message: "Failed to fetch status" });
    }
  });

}

// Admin routes - registered separately to go through global middleware
export function registerAdminRoutes(app: Express): void {
  // Admin: Get all users (requires admin + approved status)
  app.get("/api/admin/users", isAuthenticated, async (req: any, res) => {
    try {
      const adminId = req.user.claims.sub;
      const adminUser = await authStorage.getUser(adminId);
      
      if (!adminUser?.isAdmin || adminUser?.status !== 'approved') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const users = await authStorage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Admin: Get pending users (requires admin + approved status)
  app.get("/api/admin/users/pending", isAuthenticated, async (req: any, res) => {
    try {
      const adminId = req.user.claims.sub;
      const adminUser = await authStorage.getUser(adminId);
      
      if (!adminUser?.isAdmin || adminUser?.status !== 'approved') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const users = await authStorage.getPendingUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching pending users:", error);
      res.status(500).json({ message: "Failed to fetch pending users" });
    }
  });

  // Admin: Approve or deny user (requires admin + approved status)
  app.patch("/api/admin/users/:id/status", isAuthenticated, async (req: any, res) => {
    try {
      const adminId = req.user.claims.sub;
      const adminUser = await authStorage.getUser(adminId);
      
      if (!adminUser?.isAdmin || adminUser?.status !== 'approved') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const { status } = req.body;
      if (!['pending', 'approved', 'denied'].includes(status)) {
        return res.status(400).json({ message: "Invalid status. Must be pending, approved, or denied" });
      }
      
      const user = await authStorage.updateUserStatus(req.params.id, status);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      console.log(`[Admin] User ${user.email} status updated to: ${status}`);
      res.json(user);
    } catch (error) {
      console.error("Error updating user status:", error);
      res.status(500).json({ message: "Failed to update user status" });
    }
  });
}
