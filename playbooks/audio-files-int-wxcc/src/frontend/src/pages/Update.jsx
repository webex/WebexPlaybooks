import React, { useEffect, useCallback} from 'react'
import { Field, HStack, Textarea, Button } from "@chakra-ui/react"
import { useAudioFileStore } from '../store/audiofile.js';
import { useLoginStore } from '../store/login';
import { useUserStore } from '../store/user';
import { useNavigate } from 'react-router-dom';

const Update = () => {
  const { isLoggedIn } = useLoginStore();
  const { user } = useUserStore();
  const navigate = useNavigate();
  const { updateAudioFile } = useAudioFileStore();
  const queryParams = new URLSearchParams(window.location.search);
  const id = queryParams.get('id');
  console.log("id in update : ", id);
  console.log("user in update : ", user);

  useEffect(() => {
        //console.log("isLoggedIn : ", isLoggedIn);
        if (!isLoggedIn) {
        navigate('/');
        }
    }, [isLoggedIn]);

  const handleUpdate = useCallback(() => {
    console.log("updating file...");
    const description = document.querySelector('textarea').value;
    console.log("description : ", description);
    updateAudioFile(id, user[0], description);
    navigate('/audiofiles');
  }, [updateAudioFile, user]);

  return (
    <HStack gap="10" width="full">
      <Field.Root required>
        <Field.Label>
          Add Description <Field.RequiredIndicator />
        </Field.Label>
        <Textarea
            placeholder="Start typing..."
            variant="subtle"
        />
        <Field.HelperText>Max 500 characters.</Field.HelperText>
      </Field.Root>
      <Button
        color="blue"
        variant="outline"
        borderColor="blue.300"
        onClick={handleUpdate}
      >
        Submit
    </Button>
    </HStack>
  )
}

export default Update