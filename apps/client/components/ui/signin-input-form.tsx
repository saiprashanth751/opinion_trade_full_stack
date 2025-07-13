// "use client"
// import { useEffect, useState } from "react"
// import toast from "react-hot-toast"
// import { Form } from "./form"
// import { Input } from "./input";
// import { Button } from "./button";
// import { useMutation } from '@tanstack/react-query';
// import { useForm } from "react-hook-form"
// import { z } from "zod"
// import { zodResolver } from "@hookform/resolvers/zod"
// import { LoaderCircle } from "lucide-react";
// import { auth } from "@/lib/firebase"
// import { RecaptchaVerifier, ConfirmationResult, signInWithPhoneNumber } from "firebase/auth"

// interface SigninFormProps {
//     setShowOTP: (value: boolean) => void
//     setphonePhone: (value: string) => void
//     setConfirmationResult: (result: ConfirmationResult | null) => void;
// }

// const InputFormSchema = z.object({
//     phoneNumber: z.string().min(10, {
//         message: "Invalid phone number"
//     })
// })

// // Note that setConfirmationResult is not passed as the parameter. If error occurs, need to check with that...
// const SigninInputFormInner = ({ setShowOTP, setphonePhone, setConfirmationResult }: SigninFormProps) => {
//     const [phone, setPhone] = useState<string>("");
//     const phonePrefix = process.env.NEXT_PUBLIC_PHONE_NO_PREFIX ?? "+91";

//     const form = useForm<z.infer<typeof InputFormSchema>>({
//         resolver: zodResolver(InputFormSchema),
//         defaultValues: {
//             phoneNumber: "",
//         }
//     })

//         useEffect(() => {
//         if (typeof window !== "undefined" && !window.recaptchaVerifier) {
//             window.recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
//                 "size": "invisible",
//                 "callback": (response: any) => {
//                     // reCAPTCHA solved, allow signInWithPhoneNumber.
//                     // You can add logic here if you want to do something after reCAPTCHA is solved
//                 },
//                 "expired-callback": () => {
//                     toast.error("reCAPTCHA expired. Please try again,");
//                     window.recaptchaVerifier.render().then((widgetId: any) => {
//                         window.grecaptcha.reset(widgetId);
//                     });
//                 }
//             });
//         }
//     }, [])


//     const mutation = useMutation({ mutationFn: onSubmit });

//     async function onSubmit() {
//         if (phone.length != 10) {
//             toast.error("Incorrect Phone Number. Please enter a 10-digit number.");
//             setPhone("");
//             return;
//         }
//         const fullPhoneNumber = phonePrefix + phone;

//         try {
//             // Sending OTP using Firebase
//             const appVerifier = window.recaptchaVerifier;
//             const result = await signInWithPhoneNumber(auth, fullPhoneNumber, appVerifier);
//             setConfirmationResult(result);
//             setShowOTP(true);
//             toast.success("OTP sent successfully");
//             return { success: true };
//         } catch (error: any) {
//             console.error("Error sending OTP: ", error);
//             toast.error(`Failed to sendOTP: ${error.message || "An unknown error occurred."}`);
//             setShowOTP(false);
//             return { success: false };
//         }
//     }

//     // Error handling is now done directly in onSubmit catch block
//     // useEffect(() => {
//     //     if (mutation.isError) {
//     //         toast.error("Could not sent OTP, Please try again");
//     //         setShowOTP(false);
//     //     }
//     //     if (mutation.data?.success) {
//     //         setShowOTP(true);
//     //     }
//     // }, [mutation.isError, mutation.data?.success, setShowOTP]);

//     return (
//         <Form {...form}>
//             <form>
//                 <p className="text-sm text-gray-500 mb-4">
//                     We will send you an OTP to this number.
//                 </p>
//                 <div className="flex mb-4">
//                     <Input className="w-16 mr-2" type="text" value="+91" disabled />

//                     <Input
//                         className="flex-grow"
//                         type="tel"
//                         placeholder="Phone Number"
//                         value={phone}
//                         onChange={(e) => {
//                             const typedPhone = e.target.value;
//                             setPhone(typedPhone);
//                             setphonePhone(typedPhone);
//                         }} />
//                 </div>
//                 <Button
//                     // type="submit"
//                     className="w-full mb-4 bg-black text-white"
//                     onClick={() => {
//                         mutation.mutate();
//                     }}
//                     disabled={mutation.isPending || phone.length !== 10}>
//                     {!mutation.isPending ? (
//                         "Get OTP"
//                     ) : (<LoaderCircle className="animate-spin" />)}
//                 </Button>
//                 {/* //recaptcha-renders-here if exists */}
//                 <div id="recaptcha-container"></div>
//             </form>
//         </Form>
//     )

// }

// declare global {
//     interface Window {
//         recaptchaVerifier: RecaptchaVerifier;
//         grecaptcha: any;
//     }
// }

// const SigninInputForm = (props: SigninFormProps) => {

//     return (
//             <SigninInputFormInner {...props} />
//     );
// };

// export default SigninInputForm


"use client"
import { useEffect, useState } from "react"
import toast from "react-hot-toast"
import { Form } from "./form"
import { Input } from "./input";
import { Button } from "./button";
import { useMutation } from '@tanstack/react-query';
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { LoaderCircle } from "lucide-react";
import { auth } from "@/lib/firebase"
import { RecaptchaVerifier, ConfirmationResult, signInWithPhoneNumber } from "firebase/auth"

interface SigninFormProps {
    setShowOTP: (value: boolean) => void
    setphonePhone: (value: string) => void
    setConfirmationResult: (result: ConfirmationResult | null) => void;
}

const InputFormSchema = z.object({
    phoneNumber: z.string().min(10, {
        message: "Invalid phone number"
    }).max(10, {
        message: "Invalid phone number"
    }).regex(/^\d+$/, "Phone number must contain only digits")
})

const SigninInputFormInner = ({ setShowOTP, setphonePhone, setConfirmationResult }: SigninFormProps) => {
    const phonePrefix = process.env.NEXT_PUBLIC_PHONE_NO_PREFIX ?? "+91";
    const [recaptchaWidgetId, setRecaptchaWidgetId] = useState<number | null>(null);

    const form = useForm<z.infer<typeof InputFormSchema>>({
        resolver: zodResolver(InputFormSchema),
        defaultValues: {
            phoneNumber: "",
        }
    })

    useEffect(() => {
        if (typeof window !== "undefined" && !window.recaptchaVerifier) {
            window.recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
                "size": "invisible",
                "callback": (response: any) => {
                    // reCAPTCHA solved, allow signInWithPhoneNumber.
                    // You can add logic here if you want to do something after reCAPTCHA is solved
                },
                "expired-callback": () => {
                    toast.error("reCAPTCHA expired. Please try again,");
                    if (window.grecaptcha && recaptchaWidgetId !== null) {
                        window.grecaptcha.reset(recaptchaWidgetId);
                    }
                }
            });
            window.recaptchaVerifier.render().then((widgetId: number) => {
                setRecaptchaWidgetId(widgetId);
            });
        }
    }, [recaptchaWidgetId])

    async function sendOtpFirebase(phoneNumber: string) {
        const fullPhoneNumber = phonePrefix + phoneNumber;

        try {
            if (window.grecaptcha && recaptchaWidgetId !== null) {
                window.grecaptcha.reset(recaptchaWidgetId);
            }

            const appVerifier = window.recaptchaVerifier;
            const result = await signInWithPhoneNumber(auth, fullPhoneNumber, appVerifier);
            setConfirmationResult(result);
            setShowOTP(true);
            setphonePhone(phoneNumber);
            toast.success("OTP sent successfully");
            return { success: true };
        } catch (error: any) {
            console.error("Error sending OTP: ", error);
            toast.error(`Failed to send OTP: ${error.message || "An unknown error occurred."}`);
            setShowOTP(false);
            return { success: false };
        }
    }

    const mutation = useMutation({ mutationFn: sendOtpFirebase });

    const handleFormSubmission = async (values: z.infer<typeof InputFormSchema>) => {
        mutation.mutate(values.phoneNumber);
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmission)}>
                <p className="text-sm text-gray-500 mb-4">
                    We will send you an OTP to this number.
                </p>
                <div className="flex mb-4">
                    <Input className="w-16 mr-2" type="text" value="+91" disabled />

                    <Input
                        className="flex-grow"
                        type="tel"
                        placeholder="Phone Number"
                        {...form.register("phoneNumber")}
                    />
                </div>
                <Button
                    type="submit"
                    className="w-full mb-4 bg-black text-white"
                    disabled={mutation.isPending || !form.formState.isValid}>
                    {!mutation.isPending ? (
                        "Get OTP"
                    ) : (<LoaderCircle className="animate-spin" />)}
                </Button>
                <div id="recaptcha-container"></div>
            </form>
        </Form>
    )

}

declare global {
    interface Window {
        recaptchaVerifier: RecaptchaVerifier;
        grecaptcha: any;
    }
}

const SigninInputForm = (props: SigninFormProps) => {
    return (
        <SigninInputFormInner {...props} />
    );
};

export default SigninInputForm
