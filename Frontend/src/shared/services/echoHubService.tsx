import {HttpTransportType, HubConnection, HubConnectionBuilder, HubConnectionState, LogLevel} from "@microsoft/signalr";
import {getSession} from "next-auth/react";
import {useRoomStore} from "@/store/roomStore";
import {IUserSimpleDTO} from "@/shared/services/usersService";
import {EventEmitter} from "@/shared/lib/observer/eventEmitter";
import {IObservable} from "@/shared/lib/observer/IObservable";
import {BACKEND_URL} from "@/shared/lib/fetcher";

export enum EGlobalEventType {
    FriendsUpdate = "FriendsUpdate",
    VideoStatusChanged = "VideoStatusChanged"
}

export enum ERoomEventType {
    VideoOpen = "VideoOpen",
    VideoClose = "VideoClose",
    VideoStateChange = "VideoStateChange"
}

export const enum ERoomRole {
    Master = 0,
    Member = 1,
}

export interface IParticipant {
    userId: number;
    role: ERoomRole;
}

export type TypeGlobalEventCallback = { action: EGlobalEventType, data: any }
export type TypeRoomEventCallback = { action: ERoomEventType, param: any }

export class EchoHubService {
    private static instance: EchoHubService;
    private connection: HubConnection | null = null;
    private connectionPromise: Promise<void> | null = null;

    public readonly OnUserOnline = new EventEmitter<number>();
    public readonly OnUserOffline = new EventEmitter<number>();
    public readonly OnRoomCreated = new EventEmitter<string>();
    public readonly OnRoomInviteReceived = new EventEmitter<{ roomId: string, inviterId: number }>();
    public readonly OnUserJoinedRoom = new EventEmitter<{ roomId: string, userId: number }>();
    public readonly OnUserLeftRoom = new EventEmitter<{ roomId: string, userId: number }>();
    public readonly OnNewRoomMaster = new EventEmitter<{ roomId: string, newMasterId: number }>();
    public readonly OnRoomDeleted = new EventEmitter<string>();
    public readonly OnRoomClosed = new EventEmitter<string>();
    public static readonly OnReceiveEvent = new EventEmitter<TypeGlobalEventCallback>();
    public readonly OnRoomUserKicked = new EventEmitter<{ roomId: string, userId: number }>();
    public readonly OnRoomEvent = new EventEmitter<TypeRoomEventCallback>();

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
                .withUrl(BACKEND_URL + "/hubs/echo", {
                    accessTokenFactory(): string | Promise<string> {
                        return session.accessToken
                    },
                    skipNegotiation: true,
                    transport: HttpTransportType.WebSockets /*| HttpTransportType.ServerSentEvents | HttpTransportType.LongPolling*/
                })
                .withAutomaticReconnect()
                .configureLogging(LogLevel.Information)
                .build();

            this.setupEventHandlers();
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

    private setupEventHandlers(): void {
        if (!this.connection) return;

        this.connection.on("RoomCreated", (roomId) => {
            console.log(`Room created: ${roomId}`);
            getSession().then(session => {
                useRoomStore.setState({
                    roomId: roomId,
                    isRoomOwner: true,
                    ownerId: Number(session?.user?.id),
                    participants: [],
                })}
            )
        });

        this.connection.on("RoomInviteReceived", (roomId, inviterId) => {
            console.log(`Received new invite ${roomId} from ${inviterId}`);
            this.OnRoomInviteReceived.emit({ roomId, inviterId });
        });

        this.connection.on("UserJoinedRoom", (roomId, userId) => {
            console.log(`User ${userId} joined the room`);
            this.OnUserJoinedRoom.emit({ roomId, userId });
        });

        this.connection.on("UserLeftRoom", (roomId, userId) => {
            console.log(`User ${userId} left the room ${roomId}`);
            this.OnUserLeftRoom.emit({ roomId, userId });
        });

        this.connection.on("RoomUserKicked", (roomId, userId) => {
            console.log(`User ${userId} kicked from room ${roomId}`);
            this.OnRoomUserKicked.emit({ roomId, userId });
        });

        this.connection.on("RoomDeleted", (roomId) => {
            console.log(`Room ${roomId} deleted`);
            this.OnRoomDeleted.emit(roomId);
        });

        this.connection.on("RoomClosed", (roomId) => {
            console.log(`Room ${roomId} closed`);
            this.OnRoomClosed.emit(roomId);
        });

        this.connection.on("RoomEvent", (action, param) => {
            this.OnRoomEvent.emit({ action, param });
        });

        this.connection.on("UserOnline", (userId) => {
            this.OnUserOnline.emit(userId);
        });

        this.connection.on("UserOffline", (userId) => {
            this.OnUserOffline.emit(userId);
        });

        this.connection.on('ReceiveEvent', (action, data) => {
            EchoHubService.OnReceiveEvent.emit({ action, data });
        });
    }

    public async createRoom(): Promise<string> {
        await this.ensureConnected();
        return await this.connection!.invoke("CreateRoom");
    }

    public async inviteToRoom(roomId: string, userId: number): Promise<void> {
        await this.ensureConnected();
        await this.connection!.invoke("InviteToRoom", roomId, userId);
    }

    public async acceptInvite(roomId: string): Promise<void> {
        await this.ensureConnected();
        await this.connection!.invoke("AcceptInvite", roomId);
    }

    public async leaveRoom(roomId: string): Promise<void> {
        await this.ensureConnected();
        await this.connection!.invoke("LeaveRoom", roomId);
    }

    public async kickFromRoom(roomId: string, userId: number): Promise<void> {
        await this.ensureConnected();
        await this.connection!.invoke("KickFromRoom", roomId, userId);
    }

    public async getRoomParticipants(roomId: string): Promise<IParticipant[]> {
        if(!roomId) {
            throw new Error("Room ID is required to get participants.");
        }
        await this.ensureConnected();
        return await this.connection!.invoke("GetRoomParticipants", roomId);
    }

    public async sendEvent(userId: number, action: EGlobalEventType): Promise<void> {
        if(userId === undefined) {
            throw new Error("User ID is required to send an event.");
        }
        await this.ensureConnected();
        await this.connection!.invoke("SendEvent", userId, action.toString());
    }

    public async sendRoomEvent(roomId: string, type: ERoomEventType, param: any): Promise<void> {
        await this.ensureConnected();
        await this.connection!.invoke("SendRoomEvent", roomId, type,  param);
    }

    private async ensureConnected(): Promise<void> {
        if (!this.connection || this.connection.state !== 'Connected') {
            throw new Error("Not connected to hub. Call startConnection first.");
        }
    }
}