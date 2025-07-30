// apps/client/app/(lobby)/auth/signin/page.tsx
"use client"
import React from "react";
import AuthForms from "@/components/landing/Auth/AuthForms";
import { AuthGuard } from "@/components/landing/Auth/AuthGuard";

const Page = () => {
  return (
    <AuthGuard requireAuth={false}>
      <AuthForms />
    </AuthGuard>
  );
};

export default Page;