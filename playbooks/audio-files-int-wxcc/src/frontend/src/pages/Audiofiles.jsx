import React, { useEffect, useCallback } from 'react'
import { useLoginStore } from '../store/login.js';
import { useUserStore } from '../store/user.js';
import { useNavigate } from 'react-router-dom';
import { Container, Flex, HStack, Button, Text, Stack } from '@chakra-ui/react';
import AccordianList from '../components/AccordianList.jsx';
import AddAudioFile from '../components/AddAudioFile.jsx';

const Audiofiles = () => {
  const { isLoggedIn } = useLoginStore();
  const { user } = useUserStore();
  const navigate = useNavigate();

  useEffect(() => {
    console.log("isLoggedIn : ", isLoggedIn);
    if (!isLoggedIn) {
      navigate('/');
    }
  }, [isLoggedIn]);

  return (
    <Container minW={"100vw"} px={4}>
          <Flex
            justify={'space-between'}
            align={'center'}
            gap={4}
            paddingRight={4}
          >
            <Text
              textStyle={'xl'}
              fontWeight={'bold'}
              bgClip={'text'}
              bgGradient={'to-r'}
              gradientFrom={'cyan.500'}
              gradientTo={'blue.500'}
            >
              Files
            </Text>
            <HStack padding={4}>
              <AddAudioFile />
            </HStack>
          </Flex>
          <Stack gap="2" paddingRight={4}>
            <Text fontWeight="semibold">Audio Files in Webex Organization</Text>
            {console.log("AccordianList from AudioFiles")}
            <AccordianList/>
          </Stack>
        </Container>
  )
}

export default Audiofiles