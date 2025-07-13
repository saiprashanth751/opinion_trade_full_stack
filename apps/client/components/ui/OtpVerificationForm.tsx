"use-client";
// import { verifySMSOTPAction } from "@/actions/OTP/validateOTP";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormMessage } from "./form"
import { z } from "zod";
import { toast } from "react-hot-toast"
import { signIn } from "next-auth/react"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "./input-otp";
import { Button } from "./button";
import { Loader2 } from "lucide-react";
import { ConfirmationResult } from "firebase/auth";

export interface InputOTPFormProps {
    phoneNumber: string;
    confirmationResult: ConfirmationResult | null;
}

const FormSchema = z.object({
    otp: z.string().min(6, {
        message: "Your one-time password must be 6 characters.",
    }).max(6, {
        message: "Your one-time password must be 6 characters."
    })
})

export function InputOTPForm({ phoneNumber, confirmationResult  }: InputOTPFormProps) {
    const form = useForm<z.infer<typeof FormSchema>>({
        resolver: zodResolver(FormSchema),
        defaultValues: {
            otp: "",
        }
    })

    const router = useRouter();
    const { isError, isPending } = useMutation({ mutationFn: onSubmit })

    async function onSubmit(data: z.infer<typeof FormSchema>) {
        if(!confirmationResult){
            toast.error("OTP not sent. Please go back and try again");
            return;
        }
        
        try { 
            //Verifying OTP here...
            const userCredential = await confirmationResult.confirm(data.otp);
            const idToken = await userCredential.user.getIdToken();

            const res = await signIn("credentials", {
                redirect: false,
                phoneNumber,
                idToken: idToken
            });

            if (res?.ok) {
                toast.success("User Loggedin Successfully!");
                router.push("/");
            } else {
                toast.error("Error while logging in or verifying. Please try again.");
                console.error("NextAuth signIn error:", res?.error);
            }
        } catch (error: any) {
            console.error("Error verifying OTP or signing in: ", error);
            if(error.code === "auth/invalid-verification-code"){
                toast.error("Invalid OTP. Please try again.");
            } else if(error.code == "auth/code-expired"){
                toast.error("OTP expired. Please request a new one.")
            } else {
                toast.error(`Something went wrong: ${error.message} || "An unknown error occurred.`);
            }
        }
    }

    if (isError) {
        toast.error("Something went wrong while verifying otp!!!");
    }

    return (
        <Form {...form}>
            <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="w-full flex flex-col justify-center items-center">
                <FormField
                    control={form.control}
                    name="otp"
                    render={({ field }) => (
                        <FormItem>
                            <FormControl>
                                <InputOTP maxLength={6} {...field}>
                                    <InputOTPGroup>
                                        <InputOTPSlot index={0} className="border ml-1 border-slate-500" />
                                        <InputOTPSlot index={1} className="border ml-1 border-slate-500" />
                                        <InputOTPSlot index={2} className="border ml-1 border-slate-500" />
                                        <InputOTPSlot index={3} className="border ml-1 border-slate-500" />
                                        <InputOTPSlot index={4} className="border ml-1 border-slate-500" />
                                        <InputOTPSlot index={5} className="border ml-1 border-slate-500" />
                                    </InputOTPGroup>
                                </InputOTP>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <Button
                    type="submit"
                    className="w-full mt-3 bg-black text-white" disabled={isPending}>
                    {!isPending ? "Submit" : <Loader2 className="animate-spin" />}
                </Button>
            </form>
        </Form>
    )
}

