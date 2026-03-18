import express from 'express'

import { createUsers, deleteUsers } from '../controllers/user.controller.js';

const router = express.Router();

router.post("/", createUsers);

router.delete("/:id", deleteUsers);

export default router;