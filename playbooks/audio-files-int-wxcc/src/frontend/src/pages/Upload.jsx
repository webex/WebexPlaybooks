import React, { useCallback, useEffect } from 'react'
import { Box, FileUpload, Icon } from "@chakra-ui/react"
import { HiUpload } from "react-icons/hi";
import { useAudioFileStore } from '../store/audiofile.js';
import { useUserStore } from '../store/user.js';
import { useLoginStore } from '../store/login.js';
import { useNavigate } from 'react-router-dom';

const Upload = () => {

    const { isLoggedIn } = useLoginStore();

    useEffect(() => {
        //console.log("isLoggedIn : ", isLoggedIn);
        if (!isLoggedIn) {
        navigate('/');
        }
    }, [isLoggedIn])

    const { uploadAudioFile } = useAudioFileStore();
    const { user } = useUserStore();
    const navigate = useNavigate();

    const handleAcceptedFiles = useCallback(async (event) => {
        const acceptedFiles = event.target.files;
        Array.from(acceptedFiles).forEach(async (file) => {
            console.log("uploading file...");
            const { success, message } = await uploadAudioFile(file, user);
            console.log("file upload success : ", success);
            console.log("file upload message : ", message);
            if (success) {
                navigate('/audiofiles');
            }
        });
    }, [uploadAudioFile, user]);

    return (
        <>
            <FileUpload.Root
                maxW="xl"
                alignItems="stretch"
                maxFiles={10}
                accept={["audio/wav"]}
            >
                <FileUpload.HiddenInput onChange={handleAcceptedFiles}/>
                <FileUpload.Dropzone>
                    <Icon size="md" color="fg.muted">
                    <HiUpload />
                    </Icon>
                    <FileUpload.DropzoneContent>
                    <Box>Drag and drop files here</Box>
                    <Box color="fg.muted">.wav</Box>
                    </FileUpload.DropzoneContent>
                </FileUpload.Dropzone>
            </FileUpload.Root>
        </>
    )
}

export default Upload