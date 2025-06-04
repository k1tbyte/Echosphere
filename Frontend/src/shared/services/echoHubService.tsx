import {HttpTransportType, HubConnection, HubConnectionBuilder, HubConnectionState, LogLevel} from "@microsoft/signalr";
import {getSession} from "next-auth/react";


export class EchoHubService {
    private static instance: EchoHubService;
    private connection: HubConnection | null = null;
    private connectionPromise: Promise<void> | null = null;

    public static getInstance(): EchoHubService {
        if (!EchoHubService.instance) {
            EchoHubService.instance = new EchoHubService();
        }
        return EchoHubService.instance;
    }

    public getConnection(): HubConnection | null {
        return this.connection;
    }

    public async stopConnection(): Promise<void> {
        if (!this.connection) {
            return;
        }
        await this.connection.stop();
        this.connection = null;
        this.connectionPromise = null;
    }

    public async startConnection(): Promise<void> {
        if (this.connectionPromise) {
            return this.connectionPromise;
        }

        const session = await getSession();

        if(session === null || this.connection?.state === HubConnectionState.Connected) {
            return;
        }

        console.log("Starting connection to the echo hub...");
        if (!this.connection) {
            this.connection = new HubConnectionBuilder()
                .withUrl(process.env.EXT_PUBLIC_BACKEND_URL + "/hubs/echo", {
                    accessTokenFactory(): string | Promise<string> {
                        return session.accessToken
                    },
                    skipNegotiation: true,
                    transport: HttpTransportType.WebSockets /*| HttpTransportType.ServerSentEvents | HttpTransportType.LongPolling*/
                })
                .withAutomaticReconnect()
                .configureLogging(LogLevel.Information)
                .build();
        }

        this.connectionPromise = this.connection.start()
            .then(() => {
                console.log("Connection to the echo hub is established");
            })
            .catch(err => {
                console.error(`Error connecting to echo hub: ${err}`);
                this.connectionPromise = null;
                throw err;
            });

        return this.connectionPromise;
    }
}