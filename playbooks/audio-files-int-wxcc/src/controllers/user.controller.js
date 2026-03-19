import User from "../models/user.model.js";
import AudioFile from "../models/audiofile.model.js";
import { getUserInfo, getTokens } from "../utils/user.utils.js";
import mongoose from "mongoose";
import { listAudioFilesApi } from "../utils/audiofile.utils.js";

function addAudioFiles(audiofiles) {
    return new Promise(async (resolve, reject) => {
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
                }
            }
        }
        resolve();
    });
}

export const createUsers = async (req, res) => {
    const code = req.body.code;

    //use code on access token enpoint to get user data and tokens.

    const response = await getTokens(code);

    if (!response.success) {
        return res.status(500).json({
            success: false,
            message: "Code Exchange Error"
        });
    }

    let [accessToken, ciCluster, org_id] = response.data.access_token.split('_');

    const userInfo = await getUserInfo(response.data.access_token);

    const user = {
        openidProviderId : "https://idbroker-b-us.webex.com/idb",
        givenName : userInfo.given_name,
        familyName : userInfo.family_name,
        email : userInfo.email,
        accessToken : response.data.access_token,
        refreshToken : response.data.refresh_token,
        orgId: org_id,
    };

    //const data = await listAudioFilesApi(userInfo.email);

    //const audiofiles = data.data;

    //await addAudioFiles(audiofiles);


    try {
        // Use `findOneAndUpdate` to update the user if they exist, or create a new one if they don't
        const updatedUser = await User.findOneAndUpdate(
            { email: user.email },  // Query to find the user
            user,                   // Data to update
            {
              new: true,            // Return the updated document
              upsert: true,         // Create a new document if no match is found
              setDefaultsOnInsert: true // Use default values for new documents
            }
        );

        res.status(200).json({ success: true, data: updatedUser.email });
    } catch (error) {
        console.error("Error in updating or creating user: ", error.message);
        res.status(500).json({ success: false, message: "Server Error" });
    }

};

export const deleteUsers = async (req, res) => {
    const {id} = req.params;
    console.log("id: ", id);

    if (!mongoose.Types.ObjectId(id)) {
        return res.status(404).json({ success: false, message: "Invalid User id"});
    };

    try {
        await User.findByIdAndDelete(id);
        res.status(200).json({ success:true, message: "User Deleted"});
    } catch (error) {
        console.log("Error in Delete User: ", error.message);
        res.status(500).json({ success:false, message: "Server Error"});
    }
};