"use client"
import { useState } from "react"
import toast from "react-hot-toast"
import { Form } from "./form"
import { Input } from "./input";
import { Button } from "./button";
import { useMutation } from '@tanstack/react-query';
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { sendSMSOTP } from "@/actions/OTP/sendOtp";
import { LoaderCircle } from "lucide-react";

interface SigninFormProps {
    setShowOTP: (value: boolean) => void
    setphonePhone: (value: string) => void
}

const InputFormSchema = z.object({
    phoneNumber: z.string().min(10, {
        message: "Invalid phone number"
    })
})

const SigninInputForm = ({ setShowOTP, setphonePhone }: SigninFormProps) => {
    const [phone, setPhone] = useState<string>("");
    const phonePrefix = process.env.NEXT_PUBLIC_PHONE_NO_PREFIX;

    const form = useForm<z.infer<typeof InputFormSchema>>({
        resolver: zodResolver(InputFormSchema),
        defaultValues: {
            phoneNumber: "",
        }
    })

    const mutation = useMutation({ mutationFn: onSubmit });

    async function onSubmit() {
        if (phone.length != 10) {
            toast.error("Incorrect Phone!");
            setPhone("");
            return;
        }
        const phoneNo = phonePrefix + phone;
        const sendSmsActionResult = await sendSMSOTP(phoneNo);
        return sendSmsActionResult;
    }

    if (mutation.isError) {
        toast.error("Could not sent OTP, Please try again");
        setShowOTP(false);
    }
    if (mutation.data?.success) {
        setShowOTP(true);
    }

    return (
        <Form {...form}>
            <form
                onSubmit={form.handleSubmit(onSubmit)}>
                <p className="text-sm text-gray-500 mb-4">
                    {!mutation.data?.success ? "We will send you an OTP" : "Please enter otp to proceed"}
                </p>
                <div className="flex mb-4">
                    <Input className="w-16 mr-2" type="text" value="+91" disabled />

                    <Input
                        className="flex-grow"
                        type="tel"
                        placeholder="Phone Number"
                        value={phone}
                        onChange={(e) => {
                            const typedPhone = e.target.value;
                            setPhone(typedPhone);
                            setphonePhone(typedPhone);
                        }} />
                </div>
                <Button
                    className="w-full mb-4 bg-black text-white"
                    onClick={() => mutation.mutate()}
                    disabled={mutation.isPending ? true : false}>
                    {!mutation.isPending ? (
                        "Get OTP"
                    ) : (<LoaderCircle className="animate-spin" />)}
                </Button>
            </form>
        </Form>
    )

}

export default SigninInputForm