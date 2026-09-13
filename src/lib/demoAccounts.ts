/**
 * One-click demo accounts.
 *
 * In API mode every persona here must be a real account in the seeded backend
 * (`backend/scripts/seed_demo.py`). A demo button that signs in as someone the
 * database has never heard of falls back to a forged session, and the first
 * request then fails with "Session is not valid: Not enough segments" on every
 * page. All addresses use the seed's reserved `demo.prangara.example` domain and
 * shared password, so `seed_demo --reset` can always remove them again.
 */
export const DEMO_PASSWORD = "prangara-demo-2026";

export type DemoUser = {
  label: string;
  name: string;
  company: string;
  role: string;
  email: string;
  password: string;
};

export const DEMO_USERS: DemoUser[] = [
  {
    label: "Rajesh Kumar (Plant Manager · Tirupur Textiles)",
    name: "Rajesh Kumar",
    company: "Tirupur Knitwear Dyeing Unit",
    role: "Plant & Energy Operations Manager",
    email: "rajesh@demo.prangara.example",
    password: DEMO_PASSWORD,
  },
  {
    label: "Hitesh Patel (Manufacturer · Rajkot Metal)",
    name: "Hitesh Patel",
    company: "Rajkot Metal Works",
    role: "Factory Owner / Director",
    email: "owner@demo.prangara.example",
    password: DEMO_PASSWORD,
  },
  {
    label: "Anita Shah (Compliance · Shah & Associates)",
    name: "Anita Shah",
    company: "Shah and Associates",
    role: "Auditor / Consultant",
    email: "compliance@demo.prangara.example",
    password: DEMO_PASSWORD,
  },
  {
    label: "Priya Admin (Platform Administrator)",
    name: "Priya Admin",
    company: "PRANGARA Platform",
    role: "Platform Administrator",
    email: "admin@demo.prangara.example",
    password: DEMO_PASSWORD,
  },
];

/**
 * True when the dashboard talks to the backend. Mirrors `dataMode` in
 * `api/client.ts`, read directly here so auth screens do not pull in the
 * fixture bundle that module imports.
 */
export const usesLiveApi = import.meta.env.VITE_DATA_MODE === "api";

export function findDemoUser(email: string | undefined): DemoUser | undefined {
  const needle = (email || "").trim().toLowerCase();
  return DEMO_USERS.find((user) => user.email === needle);
}
