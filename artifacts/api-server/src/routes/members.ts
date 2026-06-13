import { Router, Request, Response } from "express";

const router = Router();

// TODO: Implement actual bookings query once a bookings/appointments table is created.
// For now returns an empty list so the mobile Track tab can render without error.
router.get("/members/bookings", (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  res.json({ bookings: [] });
});

export default router;
