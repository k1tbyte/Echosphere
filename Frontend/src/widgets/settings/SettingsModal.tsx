"use client";

import {modal, useModalActions} from "@/shared/ui/Modal";
import {Label} from "@/shared/ui/Label";
import {Switch} from "@/shared/ui/Switch";
import {useSettingsStore} from "@/store/settingsStore";

export const SettingsModal = () => {
    const { contentRef, closeModal } = useModalActions<HTMLDivElement>();
    const settings = useSettingsStore();

    return (
        <div ref={contentRef} className="flex flex-col">
            <div className="flex-y-center justify-between">
                <Label>
                    Auto redirect if owner starts a video
                </Label>
                <Switch defaultChecked={settings.autoVideoRedirect}
                        onCheckedChange={(e) => settings.autoVideoRedirect = e}
                />
            </div>
    </div>
    )
}

export const openSettingsModal = () => {
    modal.open({
        body: <SettingsModal/>,
        title: "Settings",
        className: "max-w-[450px]"
    })
}