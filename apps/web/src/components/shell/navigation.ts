import {
  OverviewIcon,
  ToggleIcon,
  FootprintIcon,
  NotificationIcon,
  SendIcon,
  AbatementPortfolioIcon,
  SuccessIcon,
  LockUnlockIcon,
} from "@/components/ui/animated-state-icons";

export const navigation = [
  {
    group: "",
    items: [{ path: "/overview", label: "Overview", icon: OverviewIcon }],
  },
  {
    group: "ASSESS",
    items: [
      { path: "/assessment", label: "Plant Data", icon: ToggleIcon },
    ],
  },
  {
    group: "ANALYZE",
    items: [
      { path: "/footprint", label: "Footprint", icon: FootprintIcon },
      { path: "/leaks", label: "Leak Points", icon: NotificationIcon },
    ],
  },
  {
    group: "ACT",
    items: [
      { path: "/actions", label: "Circular Actions", icon: SendIcon },
      {
        path: "/portfolio",
        label: "Abatement Portfolio",
        icon: AbatementPortfolioIcon,
      },
    ],
  },
  {
    group: "REPORT",
    items: [
      { path: "/compliance", label: "Compliance", icon: SuccessIcon },
      { path: "/methodology", label: "Methodology", icon: LockUnlockIcon },
    ],
  },
];
