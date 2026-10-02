import {
  OverviewIcon,
  ToggleIcon,
  FootprintIcon,
  NotificationIcon,
  SendIcon,
  AbatementPortfolioIcon,
  SuccessIcon,
  LockUnlockIcon,
  MarketplaceIcon,
} from "@/components/ui/animated-state-icons";

export const navigation = [
  {
    group: "CONNECTED",
    items: [
      { path: "/workspace", label: "Workspace", icon: OverviewIcon },
      { path: "/notifications", label: "Notifications", icon: NotificationIcon },
      { path: "/account", label: "Account", icon: LockUnlockIcon },
    ],
  },
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
      { path: "/scenarios", label: "What-If Simulator", icon: ToggleIcon },
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
      { path: "/marketplace", label: "Marketplace & RFQs", icon: MarketplaceIcon },
      { path: "/logistics", label: "Green Logistics", icon: FootprintIcon },
      { path: "/circular-network", label: "Circular Network", icon: OverviewIcon },
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
