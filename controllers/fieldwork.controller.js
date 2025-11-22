const Fieldwork = require("../models/fieldWork.model");

exports.createFieldwork = async (req, res) => {
    try {
        const user = req.user;

        const {
            location,
            notes,
            ccMembers
        } = req.body;

        // Prepare attachment array
        const attachments = [];

        if (req.files) {
            if (req.files.audio) {
                req.files.audio.forEach(f => {
                    attachments.push({
                        type: "audio",
                        url: "/uploads/fieldwork/" + f.filename
                    });
                });
            }

            if (req.files.video) {
                req.files.video.forEach(f => {
                    attachments.push({
                        type: "video",
                        url: "/uploads/fieldwork/" + f.filename
                    });
                });
            }

            if (req.files.image) {
                req.files.image.forEach(f => {
                    attachments.push({
                        type: "image",
                        url: "/uploads/fieldwork/" + f.filename
                    });
                });
            }
        }
        let parsedCC = [];

        try {
            parsedCC = ccMembers ? JSON.parse(ccMembers) : [];
        } catch (err) {
            return res.status(400).json({
                status: 0,
                error: "Invalid ccMembers format. Send as JSON array."
            });
        }
        const fieldwork = await Fieldwork.create({
            employee: user.id,
            date: new Date().toISOString().split("T")[0],
            time: new Date().toISOString().split("T")[1].split(".")[0],
            day: new Date().toLocaleString("en-US", { weekday: "long" }),
            location,
            notes,
            ccMembers: parsedCC,
            attachments
        });

        return res.status(201).json({
            status: 1,
            message: "Fieldwork created successfully",
            data: fieldwork
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({ status: 0, error: error.message });
    }
};


exports.getFieldworks = async (req, res) => {
    try {
        const user = req.user;
        console.log(user);
        
        const fieldworks = await Fieldwork.find({ employee: user.id }).sort({ createdAt: -1 });

        return res.status(200).json({
            status: 1,
            data: fieldworks
        }); 
    } catch (error) {
        console.log(error);
        res.status(500).json({ status: 0, error: error.message });
    }
};