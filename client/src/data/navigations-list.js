import { Briefcase, Settings } from "lucide-react";

const NavigationsList = () => {
  return [
    {
      name: "Jobs",
      url: "/dashboard/jobs",
      icon: Briefcase,
    },
    {
      name: "Config",
      url: "/dashboard/config",
      icon: Settings,
    },
  ];
};

export default NavigationsList;
