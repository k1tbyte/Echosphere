import {FC} from "react";
import {useModalActions} from "@/shared/ui/Modal";
import {Button} from "@/shared/ui/Button";
import {Label} from "@/shared/ui/Label";
import {EUploadProgressState, VideoUploadService} from "@/shared/services/videoUploadService";
import {NotificationsStore, useNotificationsStore} from "@/store/notificationsStore";
import {EventEmitter} from "@/shared/lib/observer/eventEmitter";
import {formatFileSize} from "@/shared/lib/formatters";
import {toast, ToastVariant} from "@/shared/ui/Toast";

interface VideoProps {
    id: string;
    title: string;
    uploadedSize: number;
}

interface ResumeVideoUploadModalProps {
    video: any;
    file: File & { fingerprint: string };
}



export const resumeVideoUpload = async (video: VideoProps,
                                  file: File & { fingerprint: string },
                                  notifications:  NotificationsStore) => {
    const emitter = new EventEmitter<any>();
    await VideoUploadService.continueUpload(file, video.id, file.fingerprint, video.uploadedSize, (p) => {
        if(p.state === EUploadProgressState.Started) {
            toast.open({
                variant: ToastVariant.Info,
                body: "The uploading continues in the background. You will receive a notification when the uploading is complete"
            });

            notifications.addNotification({
                type: 'info',
                progressCallback: emitter,
                message: `Uploading «${video.title}»...`,
                nonClosable: true,
                priority: 10,
                title: "Video upload",
            }, "upload-" + p.videoId);
            return;
        }

        if(p.state === EUploadProgressState.Uploading ) {
            const msg = `${formatFileSize(p.bytesUploaded)}/${formatFileSize(p.totalBytes)}  (${formatFileSize(p.speed ?? 0)}/s)`;
            emitter.emit({ percent: p.percent, msg: msg });
            return;
        }

        notifications.removeNotification("upload-" + p.videoId);

        if(p.state === EUploadProgressState.Completed) {
            emitter.emit({ percent: 100, msg: "Upload complete" });
            notifications.addNotification({
                type: 'success',
                title: "Video upload",
                message: `«${video.title}» has been successfully uploaded`,
                priority: 10
            });
        }
    });
}

export const ResumeVideoUploadModal: FC<ResumeVideoUploadModalProps> = ( { video, file } ) => {
    const {closeModal, contentRef } = useModalActions<HTMLDivElement>();
    const notificationsStore = useNotificationsStore();

    return (
        <div ref={contentRef}>
            <Label>Would you like to continue uploading «{video.title}»?</Label>

            <div className="flex justify-end gap-4 w-full mt-5">
                <Button variant="ghost" onClick={closeModal}>Cancel</Button>
                <Button onClick={(e) => {
                    e.currentTarget.disabled = true;
                    closeModal();
                    // noinspection JSIgnoredPromiseFromCall
                    resumeVideoUpload(video, file, notificationsStore);
                }}>Continue</Button>
            </div>
        </div>
    );
}