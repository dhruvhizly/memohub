"use client";

import { useEffect, useState } from "react";
import { CONSTANTS } from "@/lib/constants";
import { useUserId } from "@/lib/store";
import Auth from "@/components/Auth.component";
import Loader from "@/components/Loader.component";
import GalleryGrid from "@/components/GalleryGrid.component";

const Home = () => {
  const userid = useUserId((s) => s.userid);
  const setUserId = useUserId((s) => s.setUserId);
  const [loading, setLoading] = useState(true);

  const checkAuthStatus = async () => {
    setLoading(true);
    try {
      const endpoint = new URL("/auth/status", CONSTANTS.SERVER_URL).toString();

      const res = await fetch(endpoint, {
        credentials: "include",
      });

      if (!res.ok) {
        setUserId("");
        return;
      }

      const userId = await res.json();
      setUserId(userId);
    } catch (err) {
      console.error("auth check failed:", err);
      setUserId("");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  if (loading) {
    return <Loader message="Loading Account..." />;
  }

  return userid ? <GalleryGrid /> : <Auth setUserId={setUserId} />;
};

export default Home;
