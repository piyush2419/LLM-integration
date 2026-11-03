import express from "express"
import dotenv from "dotenv"
dotenv.config()
import { ChatGoogle } from "@langchain/google";
import { TavilySearch } from "@langchain/tavily";
import {context, createAgent, HumanMessage, tool} from "langchain"
import { ToolNode } from "@langchain/langgraph/prebuilt";
import z from "zod";
import { MessagesAnnotation, messagesDeltaReducer, StateGraph } from "@langchain/langgraph";




const app = express();
const port = process.env.PORT || 8000;


app.use(express.json());

//using built in tool
// const tool1= new TavilySearch({
//     maxResults: 3,
//     topic: "general",
// });

// ai agent = llm + tools 

const tool1=tool(
    ({email,content})=>{
          console.log("EMAIL TOOL EXECUTED!");
        console.log(email, content);
       return `email sent successfully to ${email} with content ${content}`
    },
    {
        name:"email_send_tool",
        description:"use this tool to send email",
        schema:z.object({
            email:z.string().describe("sender email"),
            content:z.string().describe("mail content for sending")
        })
    }
)




//custom tool

const tool2= tool(
    ({a,b})=>{
       return `addition of ${a} & ${b} is 7`
    },{
        name:"addition_tool",
        description:"use this tool for addition for two numbers",
        schema:z.object({
            a:z.number(),
            b:z.number()
        })
    }
)



const tools=[tool1,tool2]

const model = new ChatGoogle("gemini-3.5-flash").bindTools(tools)

const toolNode=new ToolNode(tools)

const agent=async (state)=>{

    const result=await model.invoke(
       state.messages
    )

    return {
        messages:[result]
    }
    
}


const shouldContinue=async (state)=>{
    console.log(state)
    if(state.messages[state.messages.length-1].tool_calls.length>0){
        return "tool_node"
    }else{
        return "__end__"
    }
}

// state=[
//     humanMessage:"",
//     AiMessage:"",
//     toolMessage:"",
//     AiMessages:""
// ]

//messagenotation is a built in message notation that can be used to represent the state of the conversation. 
// It is a simple JSON object that contains an array of messages.
// Each message is an object that contains the role of the sender (user or assistant) and the content of the message.
const graph=new StateGraph(MessagesAnnotation)
.addNode("agent",agent)
.addNode("tool_node",toolNode)
.addEdge("__start__","agent")
.addConditionalEdges("agent",shouldContinue)
.addEdge("tool_node","agent")
.compile()




app.post("/chat", async (req, res) => {
    try {
        console.log("1. Request received");

        const result = await graph.invoke({
            messages: [
                {
                    role: "user",
                    content: req.body.prompt
                }
            ]
        }, {
            recursionLimit: 10
        });

        console.log("2. Graph execution completed");

        const lastMessage = result.messages[result.messages.length - 1];

        console.log("3. Final response:", lastMessage.content);

        return res.json({
            response: lastMessage.content
        });

    } catch (error) {
        console.error("GRAPH ERROR:", error);

        return res.status(500).json({
            error: error.message
        });
    }
});

      


app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});