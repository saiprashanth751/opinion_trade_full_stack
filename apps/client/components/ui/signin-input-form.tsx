"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle } from "lucide-react";
import { app } from "@/lib/firebase";
import {
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
} from "firebase/auth";
import { Form } from "./form";
import { Input } from "./input";
import { Button } from "./button";

interface SigninFormProps {
  setShowOTP: (value: boolean) => void;
  setphonePhone: (value: string) => void;
  setConfirmationResult: (result: ConfirmationResult | null) => void;
}

const InputFormSchema = z.object({
  phoneNumber: z
    .string()
    .min(10, { message: "Invalid phone number" })
    .max(10, { message: "Invalid phone number" })
    .regex(/^\d+$/, "Phone number must contain only digits"),
});

const SigninInputFormInner = ({
  setShowOTP,
  setphonePhone,
  setConfirmationResult,
}: SigninFormProps) => {
  const phonePrefix = process.env.NEXT_PUBLIC_PHONE_NO_PREFIX ?? "+91";
  const [isRecaptchaReady, setIsRecaptchaReady] = useState(false);

  const form = useForm<z.infer<typeof InputFormSchema>>({
    resolver: zodResolver(InputFormSchema),
    defaultValues: { phoneNumber: "" },
  });

  useEffect(() => {
    const setupRecaptcha = () => {
      const auth = getAuth(app);

      if (
        typeof window !== "undefined" &&
        typeof window.grecaptcha !== "undefined" &&
        !window.recaptchaVerifier
      ) {
        try {
          window.recaptchaVerifier = new RecaptchaVerifier(
            auth,
            "recaptcha-container",
            {
              size: "invisible",
              callback: () => {},
            }
          );

          window.recaptchaVerifier.render().then(() => {
            setIsRecaptchaReady(true);
            console.log("reCAPTCHA initialized");
          });
        } catch (err) {
          console.error("reCAPTCHA init failed:", err);
          toast.error("Failed to initialize security features");
        }
      }
    };

    const loadScript = () => {
      if (!window.grecaptcha) {
        const script = document.createElement("script");
        script.src = "https://www.google.com/recaptcha/api.js";
        script.async = true;
        script.defer = true;
        script.onload = setupRecaptcha;
        document.head.appendChild(script);
      } else {
        setupRecaptcha();
      }
    };

    if (typeof window !== "undefined") {
      loadScript();
    }

    return () => {
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        delete window.recaptchaVerifier;
        setIsRecaptchaReady(false);
      }
    };
  }, []);

  const sendOtpFirebase = async (phoneNumber: string) => {
    const auth = getAuth(app);

    if (!window.recaptchaVerifier || !isRecaptchaReady) {
      toast.error("Security not ready. Please refresh and try again.");
      return { success: false };
    }

    try {
      const fullPhone = phonePrefix + phoneNumber;

      const result = await signInWithPhoneNumber(
        auth,
        fullPhone,
        window.recaptchaVerifier
      );

      setConfirmationResult(result);
      setShowOTP(true);
      setphonePhone(fullPhone);
      toast.success("OTP sent successfully!");
      return { success: true };
    } catch (error: any) {
      console.error("OTP send error:", error);
      toast.error(error?.message || "Failed to send OTP. Try again later.");

      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
          delete window.recaptchaVerifier;
          setIsRecaptchaReady(false);
        } catch (cleanupError) {
          console.error("reCAPTCHA cleanup failed:", cleanupError);
        }
      }

      setShowOTP(false);
      return { success: false };
    }
  };

  const mutation = useMutation({
    mutationFn: sendOtpFirebase,
  });

  const handleFormSubmit = (data: { phoneNumber: string }) => {
    mutation.mutate(data.phoneNumber);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
        <p className="text-sm text-gray-500">
          We will send you an OTP to this number.
        </p>

        <div className="flex">
          <Input className="w-16 mr-2" type="text" value={phonePrefix} disabled />
          <Input
            className="flex-grow"
            type="tel"
            placeholder="Phone Number"
            {...form.register("phoneNumber")}
          />
        </div>

        <Button
          type="submit"
          className="w-full bg-black text-white"
          disabled={!isRecaptchaReady || mutation.isPending}
        >
          {mutation.isPending ? (
            <span className="flex items-center justify-center">
              <LoaderCircle className="animate-spin mr-2" size={18} />
              Sending...
            </span>
          ) : (
            "Get OTP"
          )}
        </Button>

        <div id="recaptcha-container" />
      </form>
    </Form>
  );
};

declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
    grecaptcha?: any;
  }
}

export const SigninInputForm = SigninInputFormInner;
export default SigninInputForm;
