"use client";

import { useEffect } from "react";
import { cart } from "./cart";

/** Empties the shop cart once a shop order is confirmed (mounted on the checkout success page). */
export function ClearCart() {
  useEffect(() => cart.clear(), []);
  return null;
}
