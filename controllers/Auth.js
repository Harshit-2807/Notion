const User = require('../models/User')
const OTP = require('../models/OTP')
const Profile = require('../models/Profile')
const otpGenerator = require('otp-generator')
const bcrypt = require('bcrypt')


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