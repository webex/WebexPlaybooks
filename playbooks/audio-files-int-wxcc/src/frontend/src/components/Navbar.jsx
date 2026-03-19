import { Container, Flex, HStack, Button, Text } from '@chakra-ui/react'
import { GrLogout } from "react-icons/gr";
import { useLoginStore } from '../store/login.js';
import React from 'react'

const Navbar = () => {
  const { isLoggedIn, logout } = useLoginStore();
  return (
    <Container minW={"100vw"} px={4}>
      <Flex
        justify={'space-between'}
        align={'center'}
        gap={4}
        paddingRight={4}
      >
        <Text
          textStyle={'2xl'}
          fontWeight={'bold'}
          textTransform={'uppercase'}
          bgClip={'text'}
          bgGradient={'to-r'}
          gradientFrom={'cyan.500'}
          gradientTo={'blue.500'}
        >
          Audio Files
        </Text>
        <HStack padding={4}>
          {isLoggedIn ? (<Button color="blue" variant="outline" onClick={logout}>
            Logout <GrLogout />
          </Button>) : null }
        </HStack>
      </Flex>
    </Container>
  )
}

export default Navbar