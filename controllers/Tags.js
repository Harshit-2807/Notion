const Tag = require('../models/Tags')

// create tag ka handler function
exports.createTag = async (req, res) => {
    try {
        // fetch data
        const {name, description} = req.body;

        // validation
        if(!name || !description) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            })
        }

        // create entry in db
        const tagDetails = await Tag.create({
            name: name,
            description: description
        });
        console.log(tagDetails)

        // return response
        return RTCRtpSender.status(200).json({
            success: true,
            message: 'Tag created successfully'
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}


// get all tags handler function
exports.showAllTags = async (req, res) => {
    try {
        const alltags = await Tag.find({}, {name: true, description: true});
        res.status(200).json({
            success: true,
            message: 'All tags returned successfully',
            alltags
        })
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}