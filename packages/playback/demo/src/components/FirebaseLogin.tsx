import React, { useEffect, useRef } from "react";
import firebase from "firebase/compat/app";
import "firebaseui/dist/firebaseui.css";
import * as firebaseui from "firebaseui";
import { auth } from "../services/firebase";

interface LoginDialogProps {
  onSuccessfulLogin: () => void;
}

const FirebaseAuth: React.FC<LoginDialogProps> = ({ onSuccessfulLogin }) => {
  const uiRef = useRef<firebaseui.auth.AuthUI | null>(null);

  useEffect(() => {
    if (!uiRef.current) {
      uiRef.current = firebaseui.auth.AuthUI.getInstance() || new firebaseui.auth.AuthUI(auth);
    }

    uiRef.current.start("#firebaseui-auth-container", {
      signInOptions: [
        firebase.auth.EmailAuthProvider.PROVIDER_ID,
        firebase.auth.GoogleAuthProvider.PROVIDER_ID,
      ],
      signInFlow: 'popup',
      signInSuccessUrl: "/",
      callbacks: {
        signInSuccessWithAuthResult: () => {
          onSuccessfulLogin();

          // Prevents redirect
          return false;
        },
      },
    });

    return () => {
      if (uiRef.current) {
        uiRef.current.reset();
      };
    };
  }, []);

  return <div id="firebaseui-auth-container"></div>;
};

export default FirebaseAuth;
