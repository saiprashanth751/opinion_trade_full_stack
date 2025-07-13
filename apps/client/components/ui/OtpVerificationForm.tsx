"use-client";
import { verifySMSOTPAction } from "@/actions/OTP/validateOTP";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/router";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormMessage } from "./form"
import { z } from "zod";
import { toast } from "react-hot-toast"
import { signIn } from "next-auth/react"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "./input-otp";
import { Button } from "./button";
import { Loader2 } from "lucide-react";

export interface InputOTPFormProps {
    phoneNumber: string
}

const FormSchema = z.object({
    otp: z.string().min(4, {
        message: "Invalid OTP",
    })
})

export function InputOTPForm({ phoneNumber }: InputOTPFormProps) {
    const form = useForm<z.infer<typeof FormSchema>>({
        resolver: zodResolver(FormSchema),
        defaultValues: {
            otp: "",
        }
    })

    const router = useRouter();
    const { isError, isPending } = useMutation({ mutationFn: onSubmit })

    async function onSubmit(data: z.infer<typeof FormSchema>) {
        try {
            const isVerified = await verifySMSOTPAction(phoneNumber, data.otp);

            if (!isVerified.verified) {
                toast.error("Invalid OTP")
                return;
            }

            const res = await signIn("credentials", {
                redirect: false,
                phoneNumber,
                isVerified: isVerified.verified,
            })

            if (isVerified.verified && res?.ok) {
                toast.success("User Loggedin Successfully!");
                router.push("/");
            } else {
                toast.error("Error while logging in");
            }
        } catch (error) {
            toast.error("Something Went wrong. Kindly Report");
            return;
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

