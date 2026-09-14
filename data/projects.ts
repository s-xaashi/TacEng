export type Project = {
  id: string;
  title: string;
  description: string;
  tags: string[];
  status: "Coming Soon" | "In Progress" | "Live";
  href?: string;
};

// Placeholder project data — replace with real projects as they're finished.
export const projects: Project[] = [
  {
    id: "document-marketplace",
    title: "Document Marketplace",
    description:
      "A searchable digital marketplace where users can discover, access, and download useful documents.",
    tags: ["Next.js", "TypeScript", "Marketplace"],
    status: "Coming Soon",
    href: "/marketplace",
  },
  {
    id: "placeholder-two",
    title: "Project Title",
    description:
      "A short description of this project will go here once it's ready to share.",
    tags: ["Placeholder"],
    status: "In Progress",
  },
  {
    id: "placeholder-three",
    title: "Project Title",
    description:
      "A short description of this project will go here once it's ready to share.",
    tags: ["Placeholder"],
    status: "In Progress",
  },
];
