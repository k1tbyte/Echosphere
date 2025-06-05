import {HttpTransportType, HubConnection, HubConnectionBuilder, HubConnectionState, LogLevel} from "@microsoft/signalr";
import {getSession} from "next-auth/react";
import {useRoomStore} from "@/store/roomStore";
import {IUserSimpleDTO} from "@/shared/services/usersService";
import {EventEmitter} from "@/shared/lib/observer/eventEmitter";
import {IObservable} from "@/shared/lib/observer/IObservable";


export class EchoHubService {
    private static instance: EchoHubService;
    private connection: HubConnection | null = null;
    private connectionPromise: Promise<void> | null = null;

    public readonly OnUserOnline = new EventEmitter<number>();
    public readonly OnUserOffline = new EventEmitter<number>();
    public readonly OnRoomCreated = new EventEmitter<string>();
    public readonly OnRoomInviteReceived = new EventEmitter<{ roomId: string, inviterId: number }>();
    public readonly OnRoomJoined = new EventEmitter<{ roomId: string, masterId: number, participants: any[] }>();
    public readonly OnUserJoinedRoom = new EventEmitter<number>();
    public readonly OnUserLeftRoom = new EventEmitter<{ roomId: string, userId: number }>();
    public readonly OnUserKicked = new EventEmitter<{ roomId: string, userId: number }>();
    public readonly OnYouWereKicked = new EventEmitter<string>();
    public readonly OnNewRoomMaster = new EventEmitter<{ roomId: string, newMasterId: number }>();
    public readonly OnRoomDeleted = new EventEmitter<string>();
    public readonly OnRoomClosed = new EventEmitter<string>();
    public readonly OnRoomMessage = new EventEmitter<{ roomId: string, userId: number, message: string, timestamp: string }>();
    public readonly OnReceivePlayerEvent = new EventEmitter<{ action: string, time: number, userId: number }>();
    public readonly OnReceiveTimeSync = new EventEmitter<{ time: number, userId: number }>();

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
                .withUrl(process.env.NEXT_PUBLIC_BACKEND_URL + "/hubs/echo", {
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

        // События комнат
        this.connection.on("RoomCreated", (roomId) => {
            console.log(`Комната создана: ${roomId}`);
            getSession().then(session => {
                const currentUserId = Number(session?.user?.id);
                useRoomStore.setState({
                    roomId: roomId,
                    isRoomOwner: true,
                    ownerId: currentUserId,
                    users: new Map<number, IUserSimpleDTO>(),
                });
                console.log(`Room created: roomId=${roomId}, isRoomOwner=true, ownerId=${currentUserId}`);
            });
        });

        this.connection.on("RoomInviteReceived", (roomId, inviterId) => {
            console.log(`Получено приглашение в комнату ${roomId} от ${inviterId}`);
            this.OnRoomInviteReceived.emit({ roomId, inviterId });
        });

        this.connection.on("RoomJoined", (roomId, masterId, participants) => {
            console.log(`Вы присоединились к комнате ${roomId}, владелец: ${masterId}`);
            console.log("Room participants:", participants);
            
            // Emit the event for components to react to
            this.OnRoomJoined.emit({ roomId, masterId, participants });
            
            getSession().then(async session => {
                const currentUserId = Number(session?.user?.id);
                const isOwner = currentUserId === masterId;
                
                console.log(`RoomJoined: currentUserId=${currentUserId}, masterId=${masterId}, isOwner=${isOwner}`);
                
                // Set room state when joining via invitation
                useRoomStore.setState({
                    roomId: roomId,
                    isRoomOwner: isOwner,
                    ownerId: masterId,
                    users: new Map<number, IUserSimpleDTO>(),
                });
                
                console.log(`Room state set: roomId=${roomId}, isRoomOwner=${isOwner}, ownerId=${masterId}`);
                
                // We'll fetch full user data in the LobbyPanel component
                // But we can trigger a refresh by emitting the UserJoinedRoom event
                // This will cause the LobbyPanel to fetch all participants
                this.OnUserJoinedRoom.emit(currentUserId);
            });
        });

        this.connection.on("UserJoinedRoom", (userId) => {
            console.log(`Пользователь ${userId} присоединился к комнате`);
            this.OnUserJoinedRoom.emit(userId);
        });

        this.connection.on("UserLeftRoom", (roomId, userId) => {
            console.log(`Пользователь ${userId} покинул комнату ${roomId}`);
            this.OnUserLeftRoom.emit({ roomId, userId });
        });

        this.connection.on("UserKicked", (roomId, userId) => {
            console.log(`Пользователь ${userId} был исключен из комнаты ${roomId}`);
            this.OnUserKicked.emit({ roomId, userId });
        });

        this.connection.on("YouWereKicked", (roomId) => {
            console.log(`Вы были исключены из комнаты ${roomId}`);
            // Reset room state when kicked
            useRoomStore.getState().resetRoom();
            this.OnYouWereKicked.emit(roomId);
        });

        this.connection.on("NewRoomMaster", (roomId, newMasterId) => {
            console.log(`Новый мастер комнаты ${roomId}: ${newMasterId}`);
            this.OnNewRoomMaster.emit({ roomId, newMasterId });
        });

        this.connection.on("RoomDeleted", (roomId) => {
            console.log(`Комната ${roomId} удалена`);
            this.OnRoomDeleted.emit(roomId);
        });

        this.connection.on("RoomClosed", (roomId) => {
            console.log(`Комната ${roomId} закрыта`);
            this.OnRoomClosed.emit(roomId);
        });

        // События плеера
        this.connection.on("ReceivePlayerEvent", (action, time, userId) => {
            console.log(`Получено событие плеера от ${userId}: ${action} в ${time}`);
            this.OnReceivePlayerEvent.emit({ action, time, userId });
        });

        this.connection.on("ReceiveTimeSync", (time, userId) => {
            console.log(`Синхронизация времени от ${userId}: ${time}`);
            this.OnReceiveTimeSync.emit({ time, userId });
        });

        // События чата
        this.connection.on("RoomMessage", (roomId, userId, message, timestamp) => {
            console.log(`Сообщение в комнате ${roomId} от ${userId}: ${message}`);
            this.OnRoomMessage.emit({ roomId, userId, message, timestamp });
        });

        this.connection.on("UserOnline", (userId) => {
            console.log(`Пользователь ${userId} онлайн`);
            this.OnUserOnline.emit(userId);
        });

        this.connection.on("UserOffline", (userId) => {
            console.log(`Пользователь ${userId} офлайн`);
            this.OnUserOffline.emit(userId);
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

    public async declineInvite(roomId: string): Promise<void> {
        await this.ensureConnected();
        await this.connection!.invoke("DeclineInvite", roomId);
    }

    public async leaveRoom(roomId: string): Promise<void> {
        await this.ensureConnected();
        await this.connection!.invoke("LeaveRoom", roomId);
    }

    public async kickUser(roomId: string, userId: number): Promise<void> {
        await this.ensureConnected();
        await this.connection!.invoke("KickUser", roomId, userId);
    }

    public async getRoomParticipants(roomId: string): Promise<any[]> {
        await this.ensureConnected();
        return await this.connection!.invoke("GetRoomParticipants", roomId);
    }

    public async deleteRoom(roomId: string): Promise<void> {
        await this.ensureConnected();
        await this.connection!.invoke("DeleteRoom", roomId);
    }

    // API для синхронизации плеера
    public async syncPlayerEvent(roomId: string, action: string, time: number): Promise<void> {
        await this.ensureConnected();
        await this.connection!.invoke("SyncPlayerEvent", roomId, action, time);
    }

    public async syncPlayerTime(roomId: string, time: number): Promise<void> {
        await this.ensureConnected();
        await this.connection!.invoke("SyncPlayerTime", roomId, time);
    }

    // API для отправки сообщений в чат
    public async sendRoomMessage(roomId: string, message: string): Promise<void> {
        await this.ensureConnected();
        await this.connection!.invoke("SendRoomMessage", roomId, message);
    }

    // Проверка соединения
    private async ensureConnected(): Promise<void> {
        if (!this.connection || this.connection.state !== 'Connected') {
            throw new Error("Not connected to hub. Call startConnection first.");
        }
    }
}