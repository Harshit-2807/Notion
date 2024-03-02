const Course = require('../models/Course')
const Tag = require('../models/Tags')
const User = require('../models/User')
const {uploadImageToCloudinary} = require('../utils/imageUploader')

// create course handler function
exports.createCourse = async (req, res) => {
    try {
        
    } catch (error) {
        console.error(error)
        return res.status(500).json({
            success: false,
            message: 'Somethin went wrong while creating course'
        })
    }
}