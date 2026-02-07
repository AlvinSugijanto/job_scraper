export const exportToCSV = (jobs, filename = "jobs_export.csv") => {
  const headers = [
    "ID",
    "Title",
    "Company",
    "Location",
    "Salary",
    "Date Posted",
    "Job URL",
  ];

  const csvRows = [
    headers.join(","),
    ...jobs.map((job) =>
      [
        job.id,
        `"${(job.title || "").replace(/"/g, '""')}"`,
        `"${(job.company || "").replace(/"/g, '""')}"`,
        `"${(job.location || "").replace(/"/g, '""')}"`,
        `"${(job.salary || "").replace(/"/g, '""')}"`,
        job.date_posted || "",
        job.job_url || "",
      ].join(","),
    ),
  ];

  const csvContent = csvRows.join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
};
