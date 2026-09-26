"use client";

import DocumentManager from "@/components/admin/DocumentManager";
import ProjectsManager from "@/components/admin/ProjectsManager";
import PortfolioContentManager from "@/components/admin/PortfolioContentManager";
import ExperienceManager from "@/components/admin/ExperienceManager";
import BlogManager from "@/components/admin/BlogManager";
import LearningManager from "@/components/admin/LearningManager";
import TestimonialsManager from "@/components/admin/TestimonialsManager";
import SocialLinksManager from "@/components/admin/SocialLinksManager";
import Link from "next/link";

export default function AdminDashboard() {
  return (
    <main className="mx-auto min-h-screen max-w-content px-6 py-12">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">Control Center</p>
        <h1 className="mt-1 font-display text-3xl text-ink">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-muted">Manage your portfolio and marketplace from one place.</p>
      </div>

      <div className="mb-6 flex justify-end"><Link href="/admin/advertising" className="focus-ring rounded-full bg-ink px-5 py-3 text-sm font-medium text-paper">📢 Advertising</Link></div>
      <DocumentManager />
      <ProjectsManager />
      <PortfolioContentManager />
      <ExperienceManager />
      <LearningManager />
      <BlogManager />
      <TestimonialsManager />
      <SocialLinksManager />
    </main>
  );
}
