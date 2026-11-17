import { randomInt } from "node:crypto";
const UPPERCASE = "ABCDEFGHIJKLMNPQRSTUVWXYZ";
const LOWERCASE = "abcdefghijklmnopqrstuvwxyz";
const NUMBERS = "0123456789";
const SYMBOLS = "!@#$%&*_-+=";
const ALL_CHARS = UPPERCASE + LOWERCASE + NUMBERS + SYMBOLS;
function pickRandomChar(charset) {
    return charset[randomInt(0, charset.length)];
}
export function generateRandomPassword(length = 8) {
    if (length < 4) {
        throw new Error("O tamanho mínimo da senha deve ser 4 caracteres.");
    }
    const requiredChars = [
        pickRandomChar(UPPERCASE),
        pickRandomChar(LOWERCASE),
        pickRandomChar(NUMBERS),
        pickRandomChar(SYMBOLS),
    ];
    const remainingLength = length - requiredChars.length;
    const randomChars = [];
    for (let i = 0; i < remainingLength; i++) {
        randomChars.push(pickRandomChar(ALL_CHARS));
    }
    const passwordArray = [...requiredChars, ...randomChars];
    for (let i = passwordArray.length - 1; i > 0; i--) {
        const j = randomInt(0, i + 1);
        [passwordArray[i], passwordArray[j]] = [passwordArray[j], passwordArray[i]];
    }
    return passwordArray.join("");
}
