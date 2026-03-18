import express from 'express'
import { createAudioFile, deleteAudioFile, listAudioFiles, patchAudioFile } from '../controllers/audiofile.controller.js';
import multer from 'multer';

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.post("/", upload.single('file'), createAudioFile);

router.delete("/:id", deleteAudioFile);

router.get("/", listAudioFiles);

router.patch("/:id", patchAudioFile);

export default router;