"use server"
import prisma from "@repo/db/client"


export const verifySMSOTPAction = async (phoneNumber: string, otp: string) => {
    try {
        const otpData = await prisma.oTP.findUnique({
            where: {
                otpID: phoneNumber,
                otp
            }
        })

        if (otpData?.isVerified) {
            return {
                verified: true,
                message: "OTP already Verified",
            }
        }

        if (!otpData) {
            return {
                verified: false,
                message: "Phone Number is never verified"
            }
        }

        if (otpData.expiresAt <= Date.now()) {
            await prisma.oTP.delete({
                where: {
                    otpID: phoneNumber,
                    otp
                },
                data: {
                    otp
                }
            })
            return {
                verified: false,
                message: "OTP expired"
            }
        }

        await prisma.oTP.update({
            where: {
                otpID: phoneNumber,
                otp
            },
            data: {
                isVerified: true,
                otp: ""
            }
        })
        return {
            verified: true,
            message: "OTP Verified Successfully"
        }
    } catch (error) {
        console.error("Error Verifying OTP: ", error);
        return {
            verified: false,
            message: "An Error Occurred"
        }
    }
}