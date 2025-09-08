import { upsertStreamUser } from "../lib/stream.js";
import User from "../models/user.js";
import jwt from "jsonwebtoken" ;

export async function signup(req,res){
    let {fullName, email, password} = req.body ;

    try{
        if(!fullName || !email || !password){
            return res.status(400).json({
                message:"All fields are required"
            })
        }

        if(password.length < 6){
            return res.status(400).json({
                message:"password must be atleast 6 characters"
            })
        }

        let emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/ ;
        if(!emailRegex.test(email)){
            return res.status(400).json({
                message:"Invalid email format"
            })
        }

        const existingUser = await User.findOne({email});

        if(existingUser){
            return res.status(400).json({
                message:"Email already exists, please use a different one"
            })
        }

        const idx = Math.floor(Math.random()*100) + 1 ;
        const randomAvatar = `https://avatar.iran.liara.run/public/${idx}.png` ;

        const newUser = await User.create({
            fullName,
            email,
            password,
            profilePic: randomAvatar 
        });

        try{
            await upsertStreamUser({
                id:newUser._id.toString(),
                name:newUser.fullName,
                image:newUser.profilePic || ""
            });
            console.log(`Stream user created for ${newUser.fullName}`)

        }catch(error){
            console.log("Error creating stream user :",error)
        }

        const token = jwt.sign({userId:newUser._id}, process.env.JWT_SECRET_KEY, {
            expiresIn:"7d"
        })

        res.cookie("jwt",token,{
            maxAge:7 * 24 * 60 * 60 * 1000 ,
            httpOnly:true, //prevent ASS attacks
            sameSite:"strict", //prevent CSRF attacks
            secure:process.env.NODE_ENV === "production" //prevent HTTP requests
        })

        res.status(201).json({success:true, user:newUser})

    }catch(err){
        console.log("Error in signup controller",err);
        res.status(500).json({message:"Internal server error"})
    }
};

export async function login(req,res){
    try{
        let {email, password} = req.body ;

        if(!email || !password){
            res.status(400).json({
                message:"All fields are required"
            })
        }

        const user = await User.findOne({email});

        if(!user){
            res.status(401).json({
                message:"Invalid email or password"
            })
        }

        let isPasswordCorrect = await user.matchPassword(password);

        if(!isPasswordCorrect){
            res.status(401).json({
                message:"password is incorrect please enter correct password"
            })
        };

        const token = jwt.sign({userId:user._id},process.env.JWT_SECRET_KEY,{
            expiresIn:"7d"
        });

        res.cookie("jwt",token,{
            maxAge:7 * 24 * 60 * 60 *1000,
            httpOnly:true,
            sameSite:"strict",
            secure:process.env.NODE_ENV === "production"
        });

        res.status(200).json({success:true, user})

    }catch(err){
        console.log("Error in login user",err.message);
        res.status(500).json({message:"Internal server error"})

    }
};

export async function logout(req,res){
    res.clearCookie("jwt");
    res.status(200).json({success:true})
};


export async function onboard(req,res){

    try{
        const userId = req.user._id ;

        const {fullName, bio, nativeLanguage, learningLanguage, location} = req.body ;

        if(!fullName || !bio || !nativeLanguage || !learningLanguage || !location){
            return res.status(401).json({
                message:"All fields are required",
                missingFields:[
                    !fullName && "fullName",
                    !bio && "bio",
                    !nativeLanguage && "nativeLanguage",
                    !learningLanguage && "learningLanguage",
                    !location && "location"
                ].filter(Boolean),
            })
        }

        const updateUser = await User.findByIdAndUpdate(userId, {
            ...req.body ,
            isOnboarded:true,
        },{new:true});

        if(!updateUser){
            res.status(400).json({
                message:"User not found"
            })
        }

        try{
            await upsertStreamUser({
                id:updateUser._id.toString(),
                name:updateUser.fullName,
                image:updateUser.profilePic || ""
            });
            console.log(`Stream user updated after onboarding for ${updateUser.fullName}`)

        }catch(streamError){
            console.log("Error updating Stream user during onboarding", streamError.message);
        }

        res.status(200).json({success:true, user:updateUser}) ;

    }catch(err){
        console.log("Error to user onboarded",err);
        res.status(500).json({
            message:"Internal server error"
        })

    }
    
}