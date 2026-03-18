import { Route, Routes } from 'react-router-dom'
import { Provider } from "./components/ui/provider"
import Home from './pages/Home'
import Navbar from './components/Navbar.jsx'
import { Container } from '@chakra-ui/react'
import Audiofiles from './pages/Audiofiles.jsx'
import OAuth from './pages/OAuth.jsx'
import Upload from './pages/Upload.jsx'
import Update from './pages/Update.jsx'

function App() {

  return (
    <>
      <Provider>
        <Container minH={"100vh"} minW={"100hw"}>
          <Navbar />
          <Routes>
            <Route path='/' element={<Home/>} />
            <Route path='/audiofiles' element={<Audiofiles/>} />
            <Route path='/oauth' element={<OAuth/>} />
            <Route path='/upload' element={<Upload />} />
            <Route path='/update' element={<Update />} />
          </Routes>
        </Container>
      </Provider>
    </>
  )
}

export default App
