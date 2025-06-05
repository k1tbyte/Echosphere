"use client";

import {modal, useModalActions} from "@/shared/ui/Modal";
import {Label} from "@/shared/ui/Label";

export const SettingsModal = () => {
    const { contentRef, closeModal } = useModalActions<HTMLDivElement>();

    return (
        <div ref={contentRef} className="flex flex-col">
        <Label>
            Settings
        </Label>
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