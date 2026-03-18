import React, { useCallback } from 'react'
import { FaPlus } from "react-icons/fa";
import { Button } from "@chakra-ui/react"
import { useNavigate } from 'react-router-dom';


const AddAudioFile = () => {
    const redirectUpload = useCallback(() => {
        navigate('/upload')
    }, []);
    const navigate = useNavigate();
    return (
        <Button
            color="blue"
            variant="outline"
            borderColor="blue.300"
            padding={4}
            onClick={redirectUpload}
        >
            <FaPlus />
        </Button>
    )
}

export default AddAudioFile