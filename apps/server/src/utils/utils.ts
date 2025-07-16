/**
 * @description: misc utils functions are defined here
 */

import { v4 as uuidv4 } from "uuid";

function generateOrderId(): string {
    const uuidNumeric = uuidv4().replace(/\D/g, "");
    const orderId = uuidNumeric.substring(0, 7);
    return orderId;
}

function randomFourDigitNumnber() {
    return Math.random().toString(36).substring(2, 6);
}

function eventCodeGenerator():number {
    return Math.floor(Math.random() * 100000000);
}

function slugify(name: string) {
    return (
        name.toLowerCase().split(" ").join("-") + "-" + randomFourDigitNumnber()
    );
}

export { slugify, eventCodeGenerator, generateOrderId};