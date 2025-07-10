"use server";  // Learn about this, explore all files related to this "use (bith server and client)"
import twilio from "twilio"
import prisma from "@repo/db/client"

const twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
)

export const sendSMSOTP = async(phoneNumber: string) => {
    if(phoneNumber.length < 10){
        return {
            success: false,
            message: "Failed to send OTP"
        };
    }

    try{
        const OTP = Math.floor(100000 + Math.random() * 9000).toString();
        
        const isOtpDataExists = await prisma.OTP.findUnique({
            where: {
                otpID: phoneNumber,
            }
        })
        if(isOtpDataExists){
            const updateOtp = await prisma.OTP.update({
                where: {
                    otpID: phoneNumber
                },
                data: {
                    otp: OTP,
                    expiresAt: new Date(Date.now() + 10 * 60 * 1000)
                }
            })

            if(!updateOtp){
                return {
                    success: false,
                    message: "Failed to update OTP"
                };
            }else{
                // Send Message Here...
                const res = await sendTwilioMsg(OTP, phoneNumber)
                return res;
            }
        }else{
            // Create new OTP
            const newOTP = await prisma.OTP.create({
                data:{
                    otpID: phoneNumber,
                    otp: OTP,
                    expiresAt: new Date(Date.now() + 10 * 60 * 1000)
                }
            })

            if(!newOTP){
                return {
                    success: false,
                    messgae: "Failed to create OTP"
                }
            }
            // send OTP using function
            const res = await sendTwilioMsg(OTP, phoneNumber);
            return res;
        }

    }catch(error){
        console.error("Error in sendSMSOTP: ", error);
        return {
            success: false,
            message: "An error occurred"
        }
    }
}  

async function sendTwilioMsg(OTP: string, phoneNumber: string){
    try{
        const message = await twilioClient.messages.create({
            body: `Your OTP for OpiniX is ${OTP}, do not share it with anyone!`,
            from: process.env.TWOLIO_NUMBER,
            to: phoneNumber,
        })
        console.log(message); // just to get rid of linting error

        return{
            success: true,
            message: "Sent OTP"
        }
    }catch(error){
        console.error("Error in sendOTP: ", error);
        return{
            success: false,
            message: "Failed to send OTP"
        };
    }
}

