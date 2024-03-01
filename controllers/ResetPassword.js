const User = require('../models/User');
const mailSender = require('../utils/mailSender');
const bcrypt = require('bcrypt');

// resetPassword Token
exports.resetPasswordToken = async (req, res) => {
    try {
        // get email from req body
        const email = req.body.email;

        // check user for this email
        const user = await User.findOne({email:  email});
        if(!user) {
            return res.json({success: false, message: 'Your email is not registered, please signup'})
        }

        // generate token 
        const token = crypto.randomUUID();

        // update user by adding token and expiration time
        const updatedDetails = await User.findOneAndUpdate({email: email},
                            {
                                token: token,
                                resetPasswordExpires: Date.now() + 5*60*1000
                            },{new: true});

        // create url
        const url = `http://localhost:5173/update-password/${token}`;

        // send mail containing the url
        await mailSender(email, 'Password Reset Link', `Password Reset Link: ${url}`);

        // return response
        return res.json({
            success: true,
            message: 'Email sent successfully, please check email'
        })
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while sending reset password mail'
        })
    }
}

// Resest Password
exports.resetPassword = async (req, res) => {
    try {
        // data fetch
        const {password, confirmPassword, token} = req.body;

        // validation
        if(password !== confirmPassword) {
            return res.json({
                success: false,
                message: 'Password not matching'
            })
        }

        // get user details from db using tken
        const userDetails = await User.findOne({token: token});

        // if no entry - invalid token
        if(!userDetails) {
            return res.json({
                success: false,
                message: 'Token is invalid'
            })
        }

        // token expiry
        if(userDetails.resetPasswordExpires < Date.now() ) {
            return res.jsom({
                success: false,
                message: 'Token expired, please regenerate'
            })
        }

        // hash password
        const hashedPassword = bcrypt.hash(password, 10);

        // update password
        await User.findOneAndUpdate({token: token}, {password: hashedPassword}, {new: true});

        // return response
        return res.status(200).json({
            success: true,
            message: 'Password reset successfull'
        })

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while resetting password'
        })
    }
}

