"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";

import Hero from "../Hero";
import About from "../About";
import ClientOnly from "@/components/client-only";

export default function LandingView() {
  return (
    // <ClientOnly>
    <div
      className={`min-h-screen text-sm transition-colors duration-300 overflow-hidden`}
    >
      <Hero />
      <About />
    </div>
    // </ClientOnly>
  );
}
