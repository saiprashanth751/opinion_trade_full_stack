"use client"
import React, { useState } from "react";
import { Login } from "@/components/landing/Auth/Signin";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const Page = () => {
    const [queryClient] = useState(() => new QueryClient());

    return (
        <QueryClientProvider client={queryClient}>
            <Login />
        </QueryClientProvider>
    );
};

export default Page;
