import express from "express";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import {ChatGoogle} from "@langchain/google";
import { ChatGroq } from "@langchain/groq"


dotenv.config();

const app = express();
const port = process.env.PORT || 8000;


app.use(express.json());

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
});

//by default
// const main=async ()=>{
//     const response=await ai.models.generateContent({
//         model:"gemini-2.5-flash",
//         contents:"what is js"
//     })

//     console.log(response.text)
// }


app.get("/generate", async (req, res) => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-3.6-flash",
            contents: "who are you what do you do",
        });

        res.json({
            success: true, text: response.text
        });

    } catch (error) {
        console.error("Gemini Error:", error.status);
        console.error(error.message);

        res.status(error.status || 500).json({
            success: false,
            error: error.message
        });
    }
});


// using langchain
app.post("/chat",async (req,res)=>{
    const {prompt}=req.body
    const ai=new ChatGroq({
        model:"openai/gpt-oss-120b",
        temperature:0.7,
        maxOutputTokens:1024
    })


    const result=await ai.invoke([
        {
            role:"system",
            content:"you are jarvis an ai assistant"

        },
        {
            role:"user",
            content:prompt
        }
    ]
    )
    return res.json({
        success:true,  result:result.content
    })
})


app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});