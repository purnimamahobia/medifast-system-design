"use client";

import { useEffect, useState } from "react";
import { Eye } from "lucide-react";

export const LiveViewersCounter = () => {
  const [viewerCount, setViewerCount] = useState<number>(0);
  const [viewerId, setViewerId] = useState<string>("");

  useEffect(() => {
    // Generate or retrieve viewer ID
    let id = localStorage.getItem("viewer_id");
    if (!id) {
      id = `viewer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem("viewer_id", id);
    }
    setViewerId(id);

    // Function to update viewer presence
    const updatePresence = async () => {
      try {
        const response = await fetch("/api/viewers", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ viewerId: id }),
        });

        if (response.ok) {
          const data = await response.json();
          setViewerCount(data.activeViewers);
        }
      } catch (error) {
        console.error("Error updating viewer presence:", error);
      }
    };

    // Initial update
    updatePresence();

    // Update presence every 10 seconds
    const interval = setInterval(updatePresence, 10000);

    // Cleanup on unmount
    return () => {
      clearInterval(interval);
    };
  }, []);

  if (viewerCount === 0) return null;

  return (
    <div className="flex items-center gap-2 bg-green-light/10 text-primary px-3 py-1.5 rounded-full border border-primary/20">
      <div className="relative">
        <Eye className="w-4 h-4" />
        <span className="absolute -top-1 -right-1 w-2 h-2 bg-success-green rounded-full animate-pulse"></span>
      </div>
      <span className="text-xs font-medium">
        {viewerCount} {viewerCount === 1 ? "viewer" : "viewers"} online
      </span>
    </div>
  );
};
