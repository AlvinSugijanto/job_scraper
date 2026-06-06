"use client";

import React from "react";
import { Building2, KeyRound } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BannedCompaniesSection from "./sections/banned-company-sections";
import BannedKeywordsSection from "./sections/banned-keyword-sections";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ConfigView() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configuration</h1>
          <p className="text-muted-foreground mt-1">
            Manage your filter rules to ignore specific recruiters or job
            posting content.
          </p>
        </div>
      </div>

      {/* Tabs Container */}
      <Tabs defaultValue="companies" className="w-full">
        <TabsList className="flex" variant="line">
          <TabsTrigger
            value="companies"
            className="flex items-center gap-2 py-2"
          >
            <Building2 className="h-4 w-4" />
            Banned Companies
          </TabsTrigger>
          <TabsTrigger
            value="keywords"
            className="flex items-center gap-2 py-2"
          >
            <KeyRound className="h-4 w-4" />
            Banned Keywords
          </TabsTrigger>
        </TabsList>
        {/* Banned Companies Tab Content */}
        <TabsContent value="companies" className="space-y-4">
          <BannedCompaniesSection />
        </TabsContent>

        {/* Banned Keywords Tab Content */}
        <TabsContent value="keywords" className="space-y-4">
          <BannedKeywordsSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
