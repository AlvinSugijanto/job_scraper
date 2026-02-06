"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download } from "lucide-react";

const reports = [
  { name: "Sales Report Q4", type: "PDF", date: "2024-01-10", size: "2.4 MB" },
  { name: "User Analytics", type: "CSV", date: "2024-01-08", size: "1.1 MB" },
  { name: "Revenue Summary", type: "PDF", date: "2024-01-05", size: "890 KB" },
  { name: "Traffic Report", type: "PDF", date: "2024-01-01", size: "3.2 MB" },
];

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground">
          Download and view generated reports.
        </p>
      </div>

      <div className="grid gap-4">
        {reports.map((report, index) => (
          <Card key={index}>
            <CardContent className="flex items-center justify-between p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-muted">
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-medium">{report.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {report.type} • {report.size} • {report.date}
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
