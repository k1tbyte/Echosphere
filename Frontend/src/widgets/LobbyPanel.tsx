import {useRoomStore} from "@/store/roomStore";
import {Popover, PopoverContent, PopoverTrigger} from "@/shared/ui/Popover";
import {EIcon, IconButton} from "@/shared/ui/Icon/SvgIcon";
import React, {useEffect} from "react";
import {useEcho} from "@/providers/EchoProvider";
import {toast, ToastVariant} from "@/shared/ui/Toast";

export const LobbyPanel = () => {
    const store = useRoomStore();
    const echoContext = useEcho();

    useEffect(() => {
        if(!echoContext?.echoHub) {
            return;
        }

        const handleRoomClosed = (roomId: string) => {
            if(store.roomId === roomId) {
                store.resetRoom();
                toast.open({
                    body: "The room you were in has been closed",
                    variant: ToastVariant.Warning
                });
            }
        }

        echoContext.echoHub.OnRoomClosed.subscribe(handleRoomClosed);
        echoContext.echoHub.OnRoomDeleted.subscribe(handleRoomClosed);

        return () => {
            if (echoContext?.echoHub) {
                echoContext.echoHub.OnRoomClosed.unsubscribe(handleRoomClosed);
                echoContext.echoHub.OnRoomDeleted.unsubscribe(handleRoomClosed);
            }
        }
    }, [echoContext]);

    if(!store.roomId) {
        return;
    }

    return (
        <Popover>
            <PopoverTrigger asChild>
                <div>
                    <IconButton icon={EIcon.CircleFilled} size={30}/>
                </div>
            </PopoverTrigger>
            <PopoverContent className="w-72 mr-2 mt-1">
                {store.roomId}
            </PopoverContent>
        </Popover>
    )
}