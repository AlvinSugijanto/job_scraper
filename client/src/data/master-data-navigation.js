import {
  FolderKanban,
  Boxes,
  Activity,
  Workflow,
  Wrench,
  PackageCheck,
  PackagePlus,
  Layers,
  GitBranch,
  CalendarClock,
  Ruler,
  Clock,
  Truck,
} from "lucide-react";

export const MASTER_DATA_NAV =  [
  {
    group: "Core Master",
    items: [
      {
        name: "Project",
        url: "/master-data/project",
        icon: FolderKanban,
      },
      {
        name: "Cluster",
        url: "/master-data/cluster",
        icon: Boxes,
      },
      {
        name: "Event",
        url: "/master-data/event",
        icon: CalendarClock,
      },
      {
        name: "UoM",
        url: "/master-data/uom",
        icon: Ruler,
      },
    ],
  },

  {
    group: "Activity",
    items: [
      {
        name: "Activity",
        url: "/master-data/activity",
        icon: Activity,
      },
      {
        name: "Activity Method",
        url: "/master-data/activity-method",
        icon: Workflow,
      },
    ],
  },

  {
    group: "Equipment & Material",
    items: [
      {
        name: "Equipment Model",
        url: "/master-data/equipment-model",
        icon: Wrench,
      },
      {
        name: "Material Received",
        url: "/master-data/material-received",
        icon: PackageCheck,
      },
      {
        name: "Material Count",
        url: "/master-data/material-count",
        icon: PackagePlus,
      },
    ],
  },

  {
    group: "Process",
    items: [
      {
        name: "Process Loading",
        url: "/master-data/process-loading",
        icon: Truck,
      },
      {
        name: "Process Material",
        url: "/master-data/process-material",
        icon: Layers,
      },
      {
        name: "Process Activity",
        url: "/master-data/process-activity",
        icon: GitBranch,
      },
    ],
  },

  {
    group: "Time & Schedule",
    items: [
      {
        name: "Shiftly",
        url: "/master-data/shiftly",
        icon: Clock,
      },
    ],
  },
];
