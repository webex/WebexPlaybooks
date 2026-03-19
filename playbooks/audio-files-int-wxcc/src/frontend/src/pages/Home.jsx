import React from 'react'
import { Box, Button, Text, VStack } from "@chakra-ui/react"
import { SiWebex } from "react-icons/si";

const oauthApi = 'https://webexapis.com/v1/authorize?client_id=C9c722d01a0abef89b93a4b3dabda8f97dca033dae3e60b65f7455419f36c584b&response_type=code&redirect_uri=http%3A%2F%2Flocalhost%3A5173%2Foauth&scope=spark%3Akms%20cjp%3Aconfig_write%20cjp%3Aconfig_read%20openid%20email%20profile&state=set_state_here';
function redirectOauth () {
  location.href = oauthApi;
}

const Home = () => {
  return (
    <Box>
      <VStack justifyContent={"center"}>
        <Button color={"blueviolet"} variant="outline" onClick={redirectOauth}>
          Login <SiWebex />
        </Button>
        <Text textStyle={"md"}>Login with Webex to access audio files for Webex Contact Center</Text>
      </VStack>
    </Box>
  );
}

export default Home