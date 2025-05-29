import {AppNotification, useNotificationsStore} from "@/store/notificationsStore";
import React, {FC, useEffect, useState} from "react";
import {Separator} from "@/shared/ui/Separator";
import {EIcon, SvgIcon} from "@/shared/ui/Icon";
import {Label} from "@/shared/ui/Label";
import {IconButton} from "@/shared/ui/Icon/SvgIcon";
import {Progress} from "@/shared/ui/Progress/Progress";
import {Popover, PopoverContent, PopoverTrigger} from "@/shared/ui/Popover";
import {Button} from "@/shared/ui/Button";

const defaultIcons = {
    info: <SvgIcon icon={EIcon.InfoCircleOutline} className="fill-foreground shrink-0" size={30}/>,
    error: <SvgIcon icon={EIcon.CloseCircleOutline} className="fill-destructive shrink-0" size={30}/>,
    success: <SvgIcon icon={EIcon.CheckCircleOutline} className="fill-green-500 shrink-0" size={30}/>
}


const Notification: FC<AppNotification> = ({ title, type, message, id, progressCallback, nonClosable, timestamp }) => {
    const [progress, setProgress] = useState(progressCallback?.state?.percent)
    const [processMsg, setProgressMsg] = useState(progressCallback?.state?.msg)
    const removeNotification = useNotificationsStore((state) => state.removeNotification);

    useEffect(() => {
        if (!progressCallback) return;

        const handleProgressUpdate = (data: { percent: number, msg?: string }) => {
            setProgress(data.percent);
            setProgressMsg(data.msg);
        };

        progressCallback.subscribe(handleProgressUpdate);

        // Cleanup subscription on unmount
        return () => {
            progressCallback.unsubscribe(handleProgressUpdate);
        };
    }, [progressCallback]);

    return (
        <div className="pl-3 pr-5 py-4 flex gap-3 relative w-full">
            {type && defaultIcons[type]}
            <div className="-mt-1 w-full">
                <Label className={"text-[15px] text-wrap"}>
                    {title}
                </Label>
                { message &&
                    <>
                        <Separator className="mt-1 mb-1.5"/>
                        <Label className={"font-normal opacity-70"}>{message}</Label>
                    </>
                }
                { progress &&
                    <div className="mt-1">
                        { processMsg &&
                            <Label className="text-muted-foreground text-[10px]">
                                {processMsg}
                            </Label>
                        }

                        <div className="flex-y-center gap-2">
                            <Progress value={progress}/>
                            <span className="text-muted-foreground text-[10px]">{progress}%</span>
                        </div>
                    </div>
                }
            </div>

            { !nonClosable &&
                <IconButton icon={EIcon.Close} size={15} className={"absolute right-1.5 top-1.5"}
                            onClick={() => removeNotification(id)}
                />
            }

        </div>
    )
}

export const Notifications = () => {
    const notifications = useNotificationsStore((state) => state.notifications);
    const clearNotifications = useNotificationsStore((state) => state.clearNotifications);

    const notificationsCount = notifications.filter(n => !n.nonClosable).length;

    return (
        <Popover>
            <PopoverTrigger asChild>
                <div className="relative">
                    <IconButton icon={EIcon.Bell} size={18} />
                    { notifications.length > 0 &&
                        <div className="absolute -bottom-1 -right-1 pointer-events-none bg-red-500 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center text-[8px]">
                            {notifications.length}
                        </div>
                    }
                </div>
            </PopoverTrigger>
            <PopoverContent className="w-72 mr-2 mt-1">
                <div className="flex flex-col max-h-96 overflow-auto w-full">
                    { notifications.length ?
                        <>
                            {notificationsCount > 1 &&
                                <>
                                    <div className="flex-x-center py-2 hover:bg-secondary/40 transition-colors">
                                        <Button size={"auto"} className="text-xs"
                                                onClick={clearNotifications}
                                                variant={"link"}>
                                            Clear all
                                        </Button>
                                    </div>
                                    <Separator/>
                                </>

                            }
                           {
                               notifications.map((notification, index) => (
                                   <React.Fragment key={notification.id}>
                                       <Notification {...notification}/>
                                       { index < notifications.length - 1 &&
                                           <Separator className="my-0"/>
                                       }
                                   </React.Fragment>
                               ))
                           }
                        </> :
                        <div className="px-4 flex-center py-10">
                            <Label size={"xl"} className={"text-center"}>
                                No notifications
                            </Label>
                        </div>
                    }
                </div>
            </PopoverContent>
        </Popover>
    );
}