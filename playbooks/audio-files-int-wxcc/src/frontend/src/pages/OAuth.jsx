import { useEffect } from 'react';
import { useUserStore } from '../store/user.js';
import { useLoginStore } from '../store/login.js';
import { useNavigate } from 'react-router-dom';

const queryParams = new URLSearchParams(window.location.search);
const code = queryParams.get('code');

const OAuth = () => {
    const { createUser } = useUserStore();
    const { isLoggedIn, login } = useLoginStore();
    const navigate = useNavigate();

    useEffect(() => {
        login();
    },[isLoggedIn]);

    useEffect(() => {
        const handleOAuth = async () => {
            if (!isLoggedIn) {
                try {
                    const { success, message } = await createUser(code);
                    console.log("success : ", success);
                    console.log("message : ", message);

                    if (success) {
                        navigate('/audiofiles');
                    }
                } catch (error) {
                    console.error('Error creating user:', error);
                }
            }
        };

        handleOAuth();
    }, [isLoggedIn, createUser, login, navigate]);

    return null; // Assuming this component doesn't render anything itself
};

export default OAuth;