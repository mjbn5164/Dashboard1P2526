
import { GoogleGenAI } from "@google/genai";
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.VITE_GOOGLE_API_KEY;

if (!apiKey) {
    console.error("No API KEY found in .env");
    process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

async function listModels() {
    try {
        const response = await ai.models.list();
        console.log("Raw Response Structure:");
        const util = await import('util');
        console.log(util.inspect(response, { depth: 1, colors: false }));

        // Try to access models if it's a known property structure
        if (response.models) {
            // response.models might be the array?
            console.log("Found .models property, is array?", Array.isArray(response.models));
            if (Array.isArray(response.models)) {
                response.models.filter(m => m.name.includes('flash') || m.name.includes('pro')).forEach(m => console.log(m.name));
            }
        } else {
            // Fallback stringify just in case
            console.log("Stringified:", JSON.stringify(response, null, 2));
        }
    } catch (e) {
        console.error("Error listing models:", e);
    }
}

listModels();
