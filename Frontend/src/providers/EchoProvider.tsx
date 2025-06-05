"use client"


import {createContext, FC, ReactNode, useContext, useEffect, useState} from "react";
import {EchoHubService} from "@/shared/services/echoHubService";
import {useSession} from "next-auth/react";

export enum HubState {
    Connecting = "Connecting",
    Connected = "Connected",
    Reconnecting = "Reconnecting"
}

interface IEchoContext {
    state: HubState;
    echoHub?: EchoHubService;
}

const EchoContext = createContext<IEchoContext | undefined>({ state: HubState.Connecting });

export const useEcho = () => useContext(EchoContext);

export const EchoProvider: FC<{children: ReactNode}> = ({ children }) => {
    const [connectState, setConnectState] = useState<HubState>(HubState.Connecting);
    const session = useSession();
    const echoHub = EchoHubService.getInstance();

    useEffect(() => {

        if(session.status !== "authenticated") {
            echoHub.stopConnection();
            return;
        }

        echoHub.startConnection()
            .then(() => {
                setConnectState(HubState.Connected);
                const connection = echoHub.getConnection();
                connection?.onclose(() => {
                    console.log("Connection to the echo hub is closed");
                    setConnectState(HubState.Connecting);
                });
                connection?.onreconnecting(() => {
                    setConnectState(HubState.Reconnecting);
                });
                connection?.onreconnected(() => {
                    console.log("Connection to the echo hub is re-established");
                    setConnectState(HubState.Connected);
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
        <EchoContext.Provider value={{ state: connectState, echoHub }}>
            {children}
        </EchoContext.Provider>
    )
}