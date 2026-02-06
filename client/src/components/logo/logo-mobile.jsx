"use client";

import { Activity } from "lucide-react";
import { useRouter } from "next/navigation";
import React from "react";

const LogoMobile = () => {
  const router = useRouter();

  return (
    <div
      className="flex items-center space-x-2 cursor-pointer"
      onClick={() => router.push("/")}
    >
      <div className="w-6 h-6 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
        <Activity className="w-3 h-3 text-white" />
      </div>
    </div>
  );
};

export default LogoMobile;
