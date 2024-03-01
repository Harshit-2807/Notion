const User = require('../models/User')
const OTP = require('../models/OTP')
const Profile = require('../models/Profile')
require('dotenv').config()
const otpGenerator = require('otp-generator')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')


exports.sendOtp = async (req, res) => {
    try {
        // fetch email from request body
        const {email} = req.body;

        // check if user already present
        const checkUserPresent = await (User.findOne({email}));

        // if user aleady exist, then return response
        if(checkUserPresent){
            return res.status(401).json({
                success: false,
                message: 'User already registered'
            })
        }

        // generate otp
        var otp = otpGenerator.generate(6, {
            upperCaseAlphabets: false,
            lowerCaseAlphabets: false,
            specialChars: false
        })
        console.log('OTP generated: ', otp);

        // check unique otp or not
        const result = await OTP.findOne({email: email, otp: otp});

        while(result) {
            otp = otpGenerator.generate(6, {
                upperCaseAlphabets: false,
                lowerCaseAlphabets: false,
                specialChars: false
            });
            result = await OTP.findOne({email: email, otp: otp});
        }

        const otpPayload = {email, otp};

        // create an entry for OTP in db
        const otpBody = await OTP.create(otpPayload);
        console.log(otpBody);

        // return response successful
        res.status(200).json({
            success: true,
            message: 'OTP sent Successfully',
            otp
        })
    } catch (error) {
        console.log(error);
        return res.satus(500).json({
            success: true,
            message: error.message
        })
    }

}


// signUp
exports.signUp = async (req, res) => {
    try {
        // data fetch from request body
        const {
            firstName,
            lastName,
            email,
            password,
            confirmPassword,
            accountType,
            contactNumber,
            otp
        } = req.body;

        // validate
        if(!firstName || !lastName || !email || !password || !confirmPassword || !otp) {
            return res.status(403).json({
                success: false,
                message: 'All fields are required'
            })
        }

        // match passwords
        if(password !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'Passwords does not match'
            })
        }

        // check if user already exists
        const existingUser = await User.findOne({email});
        if(existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Email already registered'
            })
        }

        // find most recent OTP
        const recentOTP = await OTP.find({email}).sort({createdAt: -1}).limit(1);

        // validate OTP
        if(recentOTP.length == 0) {
            // OTP not found
            return res.status(400).json({
                success: false,
                message: 'OTP not found'
            })
        } else if(otp !== recentOTP) {
            // Invalid OTP
            return res.status(400).json({
                success: false,
                message: 'Invalid OTP'
            })
        }

        // Hash Password
        const hashedPassword = await bcrypt.hash(password, 10);

        // create entry in db
        const profileDetails = await Profile.create({
            gender: null,
            dateOfBirth: null,
            about: null,
            contactNumber: null
        });

        const user = await User.create({
            firstName,
            lastName,
            email,
            contactNumber,
            password: hashedPassword,
            accountType,
            additionalDetails: profileDetails._id,
            image: `https://api.dicebear.com/5.x/initials/svg?seed=${firstName} ${lastName}`
        })

        // return res
        return res.status(200).json({
            success: true,
            message: 'User registered Successfully',
            user
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "User can't be regitered, please try again"
        })
    }
}


// Login
exports.login = async (req, res) => {
    try {
        // get data from body
        const {email, password} = req.body;

        // validation data
        if(!email || !password){
            return res.status(403).json({
                success: false,
                message: 'All fields are required'
            })
        }

        // check if user exists 
        const user = await User.findOne({email}).populate("additionalDetails");
        if(!user) {
            return res.status(401).json({
                success: false,
                message: 'User not registered'
            })
        }

        // validate password
        if(await bcrypt.compare(password, user.password)) {
            const payload = {
                email: user.email,
                id: user._id,
                role: user.role
            }
            const token = jwt.sign(payload, process.env.JWT_SECRET, {
                expiresIn: '2h'
            })
            user.token = token;
            user.password = undefined;

            // create cookie and send response
            const options = {
                expires: new Date(Date.now() + 3*24*60*60*1000),
                httpOnly: true,
            }
            res.cookie('token', token, options).status(200).json({
                success: true,
                token,
                user,
                message: 'Logged In'
            })
        } else {
            return res.status(401).json({
                success: false,
                message: 'Password Incorrect'
            })
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: 'Login failure please try again'
        })
    }
}


// change password
exports.changePassword = async (req, res) => {
    try {
        const token = req.cookies.token || req.body.token || req.header('Authorisation').replace('Bearer ', "");
        // get data from body
        // get oldPassword, newPassword, confirmPassword
        const {oldPassword, newPassword, confirmPassword} = req.body;
        // validation
        if(!oldPassword || !newPassword || !confirmPassword){
            return res.status(403).json({
                success: false,
                message: 'All fields are required'
            })
        }

        if(newPassword !== confirmPassword) {
            return res.status(400).json({
                success: true,
                message: 'Password do not match'
            })
        }

        // find user by id
        const decode = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findById(decode.id);

        if(!user) {
            return res.status(404).json({
                success: true,
                message: 'User not found'
            })
        }

        const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
        if(!isPasswordValid) {
            return res.status(401).json({
                success: true,
                message: 'Incorrect old password'
            })
        }

        // update password in Db
        const hashedPassword = bcrypt.hash(newPassword, 10);

        user.password = hashedPassword;
        await user.save();

        // send mail - Password updated

        // return response
        return res.status(200).json({
            success: true,
            message: 'Password changed successfully'
        })
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: 'Error changing password'
        })
    }
}