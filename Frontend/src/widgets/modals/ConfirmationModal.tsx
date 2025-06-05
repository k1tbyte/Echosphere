import {FC, ReactNode} from "react";
import {modal, useModalActions} from "@/shared/ui/Modal";
import {Button} from "@/shared/ui/Button";

export interface IConfirmationModalProps {
    onYes?: () => void;
    onNo?: () => void;
    destructiveYes?: boolean;
    destructiveNo?: boolean;
    body: ReactNode | string;
}

export const ConfirmationModal: FC<IConfirmationModalProps> = ({ body, onYes, onNo, destructiveYes, destructiveNo }) => {
    const { contentRef, closeModal } = useModalActions<HTMLDivElement>();

    return (
        <div ref={contentRef} className="flex flex-col text-sm">
            {body}
            <div className="w-full flex justify-end gap-4 mt-3">
                <Button className="min-w-20 py-1" size={"auto"} variant={destructiveNo ? "destructive" : "outline"} onClick={() => {
                    closeModal()
                    onNo?.()
                }}>
                    No
                </Button>
                <Button className="min-w-20 py-1" size={"auto"} variant={destructiveYes ? "destructive" : "default"} onClick={() => {
                    closeModal();
                    onYes?.()
                }}>
                    Yes
                </Button>
            </div>
        </div>
    )
}

export const openConfirmationModal = (props: IConfirmationModalProps, title: string = "Please confirm action") => {
    modal.open({
        body: <ConfirmationModal {...props}/>,
        title: title,
        className: "max-w-[400px]"
    })
}