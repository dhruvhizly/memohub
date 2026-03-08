"use client";

import { useEffect, useState } from "react";
import { CONSTANTS } from "@/lib/constants";
import { useUserId, useUserName } from "@/lib/store";
import Auth from "@/components/Auth.component";
import Loader from "@/components/Loader.component";
import GalleryBin from "@/components/GalleryBin.component";

const BinPage = () => {
  const userid = useUserId((s) => s.userid);
  const setUserId = useUserId((s) => s.setUserId);
  const setUsername = useUserName((s) => s.setUsername);
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

      const { id, name } = await res.json();
      setUserId(id);
      setUsername(name);
    } catch (err) {
      console.error("auth check failed:", err);
      setUserId("");
      setUsername("");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  if (loading) {
    return <Loader message="Loading..." />;
  }

  return userid ? (
    <GalleryBin />
  ) : (
    <Auth setUserId={setUserId} setUsername={setUsername} />
  );
};

export default BinPage;