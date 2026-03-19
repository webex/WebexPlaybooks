import AudioFile from "../models/audiofile.model.js";
import User from "../models/user.model.js";
import mongoose from "mongoose";
import {
    createAudioFileApi,
    listAudioFilesApi,
    deleteAudioFileApi,
    partiallyUpdateAudioFiles } from "../utils/audiofile.utils.js";

export const createAudioFile = async (req, res) => {

    if (!req.file) {
        return res.status(400).json({ success: false, message: "No file uploaded." });
    }

    const file = req.file;
    const filename = req.body.filename;
    const email = req.body.email;
    console.log("file in controller : ", file);
    console.log("filename in controller : ", filename);

    let audiofile = await AudioFile.find({ name: filename });
    if (audiofile.length !== 0) {
        res.json({ success: false, data: "File Already Exists." });
    }

    const newFile = {
        name : filename,
        file : file,
    }

    try {
        const data = await createAudioFileApi(newFile, email);
        console.log("data post upload : ", data);
        return res.json({ success: true, data: data });
    } catch (error) {
        return res.json({ success: false, data: "File upload failed." });
    }
    //res.json({ success: true, data: "File received and processed." });
};

export const deleteAudioFile = async (req, res) => {
    const {id} = req.params;
    const { email } = req.query;
    console.log(`email in delete controller : ${email}`);
    console.log("id: ", id);

    try {
        await deleteAudioFileApi(id, email);
        await AudioFile.findByIdAndDelete(id);
        res.status(200).json({ success:true, message: "Audio File Deleted Controller"});
    } catch (error) {
        console.log("Error in Delete User: ", error.message);
        res.status(500).json({ success:false, message: "Server Error"});
    }
};

export const patchAudioFile = async (req, res) => {
    const {id} = req.params;
    console.log("id: ", id);

    const email = req.body.user;
    const description = req.body.description;
    console.log("email in patch : ", email);
    try {
        const data = await partiallyUpdateAudioFiles(id, email, description);
        console.log("data post update : ", data);
        await AudioFile.findOneAndUpdate({ id: id }, { description: description });
        return res.json({ success: true, data: data });
    } catch (error) {
        console.log("Error in PATCH Audio File Controller : ", error.message);
        res.status(500).json({ success:false, message: "Server Error"});
    }
};

export const listReferencesAudioFile = async (req, res) => {
    const {id} = req.params;
    console.log("id: ", id);

    if (!mongoose.Types.ObjectId(id)) {
        return res.status(404).json({ success: false, message: "Invalid Audio File id"});
    };

    try {
        await AudioFile.findById(id);
        res.status(200).json({ success:true, message: "List References Audio File Success Controller"});
    } catch (error) {
        console.log("Error in List References Audio File Controller : ", error.message);
        res.status(500).json({ success:false, message: "Server Error"});
    }
};

export const listAudioFiles = async (req, res) => {
    const { email } = req.query;
    const user = await User.findOne({ email: email });

    try {
        const data = await listAudioFilesApi(email);

        const audiofiles = data.data;

        for (let i = 0; i < audiofiles.length; i++) {
            let audiofile = await AudioFile.find({ name: audiofiles[i].name });
            if (audiofile.length === 0) {
                let newAudioFile = new AudioFile(audiofiles[i]);
                try {
                    if (!newAudioFile.organizationId) {
                        //console.log(`${newAudioFile.name} has no org_id`);
                        newAudioFile.organizationId = user.orgId;
                        //console.log(`assigned org_id : ${newAudioFile.organizationId}`);
                    }
                    await newAudioFile.save();
                } catch (error) {
                    console.error("Error Saving Audio File to db : ", error.message);
                    console.log("Error info : ", error);
                }
            }
        }

        const search = AudioFile.find({ organizationId : user.orgId });
        search.getFilter();

        const files = await search.exec();

        res.status(200).json({ success:true, data: files });
    } catch (error) {
        res.status(500).json({ success:false, message: "Server Error"});
    }
};

