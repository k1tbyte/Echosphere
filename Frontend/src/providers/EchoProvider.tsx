"use client"


import {createContext, FC, ReactNode, useContext, useEffect, useState} from "react";
import {EchoHubService} from "@/shared/services/echoHubService";
import {useSession} from "next-auth/react";

interface IEchoContext {
    isConnected: boolean;
    echoHub?: EchoHubService;
}

const EchoContext = createContext<IEchoContext | undefined>({ isConnected: false });

export const useEcho = () => useContext(EchoContext);

export const EchoProvider: FC<{children: ReactNode}> = ({ children }) => {
    const [isConnected, setIsConnected] = useState(false);
    const session = useSession();
    const echoHub = EchoHubService.getInstance();

    useEffect(() => {

        if(session.status !== "authenticated") {
            echoHub.stopConnection();
            return;
        }

        echoHub.startConnection()
            .then(() => {
                setIsConnected(true);
                const connection = echoHub.getConnection();
                connection?.onclose(() => {
                    console.log("Connection to the echo hub is closed");
                    setIsConnected(false);
                });
            })
            .catch(console.error);

        return () => {
            const connection = echoHub.getConnection();
            if (connection) {

            }
        };
    }, [session]);

    return (
        <EchoContext.Provider value={{ isConnected, echoHub }}>
            {children}
        </EchoContext.Provider>
    )
}