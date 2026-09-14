export type DocumentCategory =
  | "Education"
  | "Computer Science"
  | "Business"
  | "Books"
  | "Other";

export type MarketplaceDocument = {
  id: string;
  title: string;
  category: DocumentCategory;
  fileType: string;
  description: string;
  price: number; // 0 means free
};

// Mock data only — this will be replaced by real records once Supabase is connected.
export const documents: MarketplaceDocument[] = [
  {
    id: "doc-1",
    title: "Intro to Data Structures — Study Notes",
    category: "Computer Science",
    fileType: "PDF",
    description:
      "Condensed lecture notes covering arrays, linked lists, stacks, and trees with worked examples.",
    price: 0,
  },
  {
    id: "doc-2",
    title: "University Application Personal Statement Guide",
    category: "Education",
    fileType: "DOCX",
    description:
      "A structured guide with prompts and examples for writing a compelling personal statement.",
    price: 4.99,
  },
  {
    id: "doc-3",
    title: "Small Business Financial Plan Template",
    category: "Business",
    fileType: "XLSX",
    description:
      "A ready-to-use spreadsheet template for projecting revenue, costs, and cash flow.",
    price: 9.99,
  },
  {
    id: "doc-4",
    title: "Algorithms Cheat Sheet",
    category: "Computer Science",
    fileType: "PDF",
    description:
      "Time and space complexity reference for common sorting, searching, and graph algorithms.",
    price: 0,
  },
  {
    id: "doc-5",
    title: "Digital Marketing Fundamentals",
    category: "Business",
    fileType: "PDF",
    description:
      "An overview of core digital marketing concepts, channels, and campaign planning basics.",
    price: 6.99,
  },
  {
    id: "doc-6",
    title: "Short Story Collection — East African Voices",
    category: "Books",
    fileType: "EPUB",
    description:
      "A curated collection of short fiction exploring contemporary East African life.",
    price: 3.5,
  },
  {
    id: "doc-7",
    title: "Research Paper Formatting Guide (APA & IEEE)",
    category: "Education",
    fileType: "PDF",
    description:
      "Side-by-side formatting rules and examples for the two most common citation styles.",
    price: 0,
  },
  {
    id: "doc-8",
    title: "Freelance Contract Template",
    category: "Other",
    fileType: "DOCX",
    description:
      "A general-purpose freelance services contract template for independent creative work.",
    price: 5.99,
  },
];
