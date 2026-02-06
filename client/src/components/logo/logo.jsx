"use client";

import { Activity } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React from "react";

const Logo = ({ width = 200, height = 200, ...props }) => {
  return (
    <Link href={"/"}>
      <Image
        src={"/logo/logo.png"}
        width={width}
        height={height}
        style={{
          cursor: "pointer",
        }}
        alt="Logo"
        priority
        {...props}
      />
    </Link>
  );
};

export default Logo;
