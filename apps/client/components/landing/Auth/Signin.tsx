"use client";
import Image from "next/image";

import login from "@/public/login.png";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { InputOTPForm } from "@/components/ui/OtpVerificationForm";
import SigninInputForm from "@/components/ui/signin-input-form";
import { ConfirmationResult } from "firebase/auth";

export function Login() {
    const [showOTP, setShowOTP] = useState<boolean>(false);
    const [phone, setPhone] = useState<string>("");
    // const phonePrefix = process.env.NEXT_PUBLIC_PHONE_NO_PREFIX;
    const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

    return (
        <div className="w-full lg:grid lg:min-h-[600px] h-screen lg:grid-cols-2 xl:min-h-[800px]">
            <div className="flex items-center justify-center h-screen">
                <Card className="w-full max-w-lg bg-white">
                    <CardHeader>
                        <CardTitle className="text-2xl text-center font-bold">
                            {!showOTP ? "Enter your mobile number" : "Enter 6 digit OTP"}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {
                            !showOTP ? <SigninInputForm setShowOTP={setShowOTP} setphonePhone={setPhone}
                            setConfirmationResult={setConfirmationResult} /> : <InputOTPForm phoneNumber={phone} confirmationResult={confirmationResult} />
                        }
                        <p className="text-xs text-gray-500 mt-5">
                            By continuing, you accept that you are 18+ years of age & agree to
                            the{" "}
                            <a href="#" className="text-blue-500 hover:underline">
                                Terms and Conditions
                            </a>
                        </p>
                    </CardContent>
                </Card>
            </div>
            <div className="relative  overflow-hidden flex justify-center items-center">
                <div className="bg-muted">
                    <Image
                    src={login.src}
                    alt="Description"
                    width={500}
                    height={300}
                    priority
                    />
                </div>
            </div>
        </div>
    );
}