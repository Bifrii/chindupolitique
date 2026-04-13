import { useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";

const STORAGE_KEY = "pim_guest_usage";
const GUEST_LIMIT = 2;

interface GuestUsage {
  count: number;
  timestamp: number;
}

function getUsage(): GuestUsage {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Reset after 24h
      if (Date.now() - parsed.timestamp > 24 * 60 * 60 * 1000) {
        return { count: 0, timestamp: Date.now() };
      }
      return parsed;
    }
  } catch {}
  return { count: 0, timestamp: Date.now() };
}

function setUsage(usage: GuestUsage) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(usage));
}

export function useGuestUsage() {
  const { user } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);

  const checkAndIncrement = useCallback((): boolean => {
    // Authenticated users have unlimited access
    if (user) return true;

    const usage = getUsage();
    if (usage.count >= GUEST_LIMIT) {
      setShowLoginModal(true);
      return false;
    }

    // Increment usage
    setUsage({ count: usage.count + 1, timestamp: usage.timestamp || Date.now() });
    return true;
  }, [user]);

  const remainingUses = user ? Infinity : Math.max(0, GUEST_LIMIT - getUsage().count);
  const isLimitReached = !user && remainingUses <= 0;

  return {
    checkAndIncrement,
    remainingUses,
    isLimitReached,
    showLoginModal,
    setShowLoginModal,
    isAuthenticated: !!user,
  };
}
