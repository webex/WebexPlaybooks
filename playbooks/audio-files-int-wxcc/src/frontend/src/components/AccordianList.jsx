import React, { useEffect, useCallback } from 'react'
import { useAudioFileStore } from '../store/audiofile.js';
import { useUserStore } from '../store/user.js';
import { AbsoluteCenter } from "@chakra-ui/react"
import { MdModeEdit, MdDeleteOutline } from "react-icons/md";
import { Box, Button } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import {
    AccordionItem,
    AccordionItemContent,
    AccordionItemTrigger,
    AccordionRoot,
  } from "../components/ui/accordion.jsx";


const AccordianList = () => {
  const { user } = useUserStore();
  const { audiofiles, listAudiofiles, deleteAudioFile } = useAudioFileStore();
  const navigate = useNavigate();
  console.log("Accordian List Hello!");

  const redirectUpdate = useCallback((id) => {
    console.log("id in redirectUpdate : ", id);
    const queryParams = new URLSearchParams();
    queryParams.append('id', id);
    navigate( '/update?' + queryParams.toString());
  }, []);

  useEffect(() => {
    console.log("listing audio files...");
    listAudiofiles(user);
  }, [listAudiofiles]);


  return (
    <AccordionRoot
        variant="enclosed"
        collapsible
        paddingRight={4}
    >
        {audiofiles.map((item, index) => (
        <AccordionItem key={index} value={item.name}>
            <Box position="relative">
            <AccordionItemTrigger indicatorPlacement="start">{item.name}</AccordionItemTrigger>
            <AbsoluteCenter axis="vertical" insetEnd="0" padding={2}>
                <Button
                  color="blue"
                  variant="outline"
                  borderColor="blue.300"
                  onClick={() => redirectUpdate(item.id) }
                >
                <MdModeEdit />
                </Button>
                <Button
                  color="red"
                  variant="outline"
                  borderColor="red.300"
                  onClick={() => deleteAudioFile(item._id, user[0]) }
                >
                <MdDeleteOutline />
                </Button>
            </AbsoluteCenter>
            </Box>
            <AccordionItemContent>Webex ID : {item.id}</AccordionItemContent>
            <AccordionItemContent>Content Type : {item.contentType}</AccordionItemContent>
            <AccordionItemContent>Description : {item.description}</AccordionItemContent>
        </AccordionItem>
        ))}
    </AccordionRoot>
  )
}

export default AccordianList;