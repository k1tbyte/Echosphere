"use client";

import { useRef, useState, useCallback, useEffect } from 'react';
import { Upload, AlertCircle } from "lucide-react";
import { cn } from "@/shared/lib/utils";

export type DropzoneState = 'idle' | 'dragging' | 'error';

export interface DropZoneProps extends React.HTMLAttributes<HTMLDivElement> {
    accept?: string;
    onFileDrop?: (file: File) => string | null | undefined | void;

    promptText?: string;
    description?: string;
    icon?: React.ReactNode;

    overlay?: boolean;
}

export const DropZone = ({
                             accept,
                             promptText = "Drop file here or click to select",
                             description,
                             icon,
                             overlay = false,
                             onFileDrop,
                             className,
                             ...props
                         }: DropZoneProps) => {
    const [state, setState] = useState<DropzoneState>('idle');
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [isVisible, setIsVisible] = useState(!overlay);

    const dropzoneRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const dragCounterRef = useRef<number>(0);
    const errorTimerRef = useRef<NodeJS.Timeout | null>(null);

    const handleFile = useCallback((file: File) => {
        if (errorTimerRef.current) {
            clearTimeout(errorTimerRef.current);
            errorTimerRef.current = null;
        }

        if (!onFileDrop) return;

        const error = onFileDrop(file);

        if (error) {
            setState('error');
            setErrorMessage(error);

            // Leave the error visible for 3 seconds
            errorTimerRef.current = setTimeout(() => {
                setState('idle');
                setErrorMessage('');

                // If in overlay mode, hide after the error is displayed
                if (overlay) {
                    setIsVisible(false);
                }
            }, 3000);
        } else {
            if (overlay) {
                setIsVisible(false);
            }
            setState('idle');
        }
    }, [onFileDrop, overlay]);

    const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();

        dragCounterRef.current += 1;

        if (dragCounterRef.current === 1) {
            setState('dragging');
        }
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();

        dragCounterRef.current -= 1;

        if (dragCounterRef.current === 0) {
            setState(prevState => prevState === 'error' ? 'error' : 'idle');
        }
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer) {
            e.dataTransfer.dropEffect = 'copy';
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();

        dragCounterRef.current = 0;

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            handleFile(file);
        } else {
            setState('idle');

            // If it's an overlay, hide it after the drop.
            if (overlay && state !== 'error') {
                setIsVisible(false);
            }
        }
    }, [handleFile, overlay, state]);

    const handleClick = useCallback(() => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    }, []);

    const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            handleFile(file);
        }
    }, [handleFile]);

    // Global handlers for overlay mode
    useEffect(() => {
        if (!overlay) return;

        const handleDocumentDragEnter = (e: DragEvent) => {
            e.preventDefault();

            if (e.dataTransfer?.items?.length) {
                setIsVisible(true);
            }
        };

        const handleDocumentDragLeave = (e: DragEvent) => {
            e.preventDefault();

            if ((e as any).fromElement === null && e.relatedTarget === null && state !== 'error') {
                setIsVisible(false);
                dragCounterRef.current = 0;
            }
        };

        const handleDocumentDrop = (e: DragEvent) => {
            if (state !== 'error') {
                setIsVisible(false);
                dragCounterRef.current = 0;
            }
        };

        document.addEventListener('dragenter', handleDocumentDragEnter);
        document.addEventListener('dragleave', handleDocumentDragLeave);
        document.addEventListener('drop', handleDocumentDrop);

        return () => {
            document.removeEventListener('dragenter', handleDocumentDragEnter);
            document.removeEventListener('dragleave', handleDocumentDragLeave);
            document.removeEventListener('drop', handleDocumentDrop);
        };
    }, [overlay, state]);

    useEffect(() => {
        return () => {
            if (errorTimerRef.current) {
                clearTimeout(errorTimerRef.current);
            }
        };
    }, []);

    if (overlay && !isVisible) {
        return null;
    }

    return (
        <div
            ref={dropzoneRef}
            onClick={handleClick}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
                "flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 transition-all",
                "cursor-pointer select-none",
                {
                    "border-border bg-background/50": state === 'idle',
                    "border-primary bg-primary/10": state === 'dragging',
                    "border-destructive bg-destructive/10": state === 'error',
                    "absolute inset-0 z-50 backdrop-blur-sm": overlay,
                },
                className
            )}
            {...props}
        >
            {/* Hidden input for file selection */}
            <input
                ref={fileInputRef}
                type="file"
                accept={accept}
                className="hidden"
                onChange={handleFileChange}
            />

            <div className="flex flex-col items-center justify-center gap-2 text-center pointer-events-none">
                {state === 'error' ? (
                    <AlertCircle className="h-10 w-10 text-destructive" />
                ) : (
                    icon || <Upload className={cn(
                        "h-10 w-10",
                        {
                            "text-muted-foreground": state === 'idle',
                            "text-primary": state === 'dragging'
                        }
                    )} />
                )}

                <div className="space-y-1">
                    {state === 'error' ? (
                        <p className="text-destructive font-medium">{errorMessage}</p>
                    ) : (
                        <p className="text-muted-foreground">{promptText}</p>
                    )}

                    {state !== 'error' && description && (
                        <p className="text-muted-foreground text-xs">{description}</p>
                    )}
                </div>
            </div>
        </div>
    );
};