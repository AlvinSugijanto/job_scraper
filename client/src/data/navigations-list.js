import {
  LayoutDashboard,
  Users,
  Settings,
  FileText,
  BarChart3,
  ShoppingCart,
} from "lucide-react";

const NavigationsList = () => {
  return [
    {
      name: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      name: "Analytics",
      url: "/dashboard/analytics",
      icon: BarChart3,
    },
    {
      name: "Users",
      url: "/dashboard/users",
      icon: Users,
    },
    {
      name: "Orders",
      url: "/dashboard/orders",
      icon: ShoppingCart,
    },
    {
      name: "Reports",
      url: "/dashboard/reports",
      icon: FileText,
    },
    {
      name: "Settings",
      url: "/dashboard/settings",
      icon: Settings,
    },
  ];
};

export default NavigationsList;
