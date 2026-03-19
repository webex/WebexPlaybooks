import dotenv from 'dotenv'
import axios from 'axios'
import User from "../models/user.model.js";
import AudioFile from '../models/audiofile.model.js';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const WXCC_API_BASE = process.env.WXCC_API_BASE || 'https://api.wxcc-us1.cisco.com';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function writeFileLocally(file) {
  return new Promise((resolve, reject) => {
    const tempFilePath = path.join(__dirname, file.file.originalname);
    fs.writeFile(tempFilePath, file.file.buffer, (err) => {
      if (err) {
        reject(err);
      } else {
          resolve(tempFilePath);
      }
    });
  });
}

function deleteFileLocally(filePath) {
  return new Promise((resolve, reject) => {
    fs.unlink(filePath, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

export const listAudioFilesApi = async function (email) {
    const query = User.findOne({ email: email });
    query.getFilter();
    const user = await query.exec();

    const response = await axios.get(`${WXCC_API_BASE}/organization/${user.orgId}/v2/audio-file`, {
        headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${user.accessToken}`
        }
    }).catch(error => {
        if (error.response) {
          console.error('Request failed with status:', error.response.status);
          if (error.response.status === 404) {
            console.warn('Resource not found.');
          }
        } else if (error.request) {
          console.error('No response received:', error.request);
        } else {
          console.error('Error during request setup:', error.message);
        }

        return {
            success: false,
            message: error.message || 'An error occurred when accessing audio files.',
            code: error.code || 'AUDIO_FILES_ERROR'
        };
      });

    return response.data;
}

export const deleteAudioFileApi = async function (id, email) {

  const file = await AudioFile.findById(id).exec();

  const query = User.findOne({ email: email });
  query.getFilter();
  const user = await query.exec();

  console.log("file : ", file.name);
  console.log("webex id : ", file.id);
  console.log("mongo id : ", id);

  const response = axios.delete(`${WXCC_API_BASE}/organization/${user.orgId}/audio-file/${file.id}`, {
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${user.accessToken}`,
    }
  })
  .then(function (response) {
    console.log(response.data);
  })
  .catch(function (error) {
    console.error(error);
  });
  return response.data;
}

export const createAudioFileApi = async function (file, email) {
  const query = User.findOne({ email: email });
  query.getFilter();
  const user = await query.exec();
  const formData = new FormData();

  const fileInfo = {
    name: file.name,
    contentType: 'AUDIO_WAV',
    systemDefault: false
  }

  console.log('fileInfo in util : ', fileInfo);

  const writeFile = await writeFileLocally(file);
  console.log(writeFile);

  formData.append('audioFile', fs.createReadStream(writeFile), {
    contentType: 'audio/wav'
  });

  formData.append('audioFileInfo', JSON.stringify(fileInfo), {
    contentType: 'application/json'
  });


  const response = await axios.post(`${WXCC_API_BASE}/organization/${user.orgId}/audio-file`, formData, {
    headers: {
        'Accept': '*/*',
        'Authorization': `Bearer ${user.accessToken}`
    }
}).catch(error => {
    if (error.response) {
      console.error('Request failed with status:', error.status);
      if (error.response.status === 404) {
        console.warn('Resource not found.');
      }
    } else if (error.request) {
      console.error('No response received:', error.request);
    } else {
      console.error('Error during request setup:', error.message);
    }

    return {
        success: false,
        message: error.message || 'An error occurred when accessing audio files.',
        code: error.code || 'AUDIO_FILES_ERROR'
    };
  });
  await deleteFileLocally(writeFile);
  return response.data;
}

export const partiallyUpdateAudioFiles = async function (id, email, description) {
  const query = User.findOne({ email: email });
  query.getFilter();
  const user = await query.exec();

  const data = {
    description: description
  }

  console.log("id in partially updated : ", id);
  console.log("access token : ", user.accessToken);

  const response = await axios.patch(`${WXCC_API_BASE}/organization/${user.orgId}/audio-file/${id}`, data, {
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${user.accessToken}`
    }
  }).catch(error => {
    if (error.response) {
      console.error('Request failed with status:', error.status);
      if (error.response.status === 404) {
        console.warn('Resource not found.');
      }
    } else if (error.request) {
      console.error('No response received:', error.request);
    } else {
      console.error('Error during request setup:', error.message);
    }

    return {
        success: false,
        message: error.message || 'An error occurred when accessing audio files.',
        code: error.code || 'AUDIO_FILES_ERROR'
    };
  });
  console.log('status in partially updated : ', response.status);
  return response.data;
}

export const getReferences = async function (accessToken) {

}

