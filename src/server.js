import express from "express" ;
import mongoose from "mongoose" ;
import cors from "cors" ;
import cookieParser from "cookie-parser" ;

const app = express() ;
import "dotenv/config" ;

import authRouter from "./routes/auth.js" ;
import userRouter from "./routes/user.route.js" ;
import chatRouter from "./routes/chat.route.js" ;

const port = process.env.PORT
const MONGODB_URI = process.env.MONGODB_URI 
//middleware 
app.use(cors({
    origin:"http://localhost:5173",
    credentials:true
}));

app.use(express.json()) ;
app.use(cookieParser()) ;

app.use("/api/auth", authRouter) ;
app.use("/api/users", userRouter) ;
app.use("/api/chat", chatRouter) ;

mongoose.connect(MONGODB_URI) 
    .then(()=>{
        console.log("Mongodb is connected");

        app.listen(port, () =>{
            console.log(`Server is running on port ${port}`);
        }) ;
    })
    .catch((error)=>{
        console.log("Error to connected mongodb",error)
    }) 

