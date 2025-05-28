"use client";

import { X } from "lucide-react";
import * as React from "react";
import { Command as CommandPrimitive } from "cmdk";
import {useCallback, useMemo, useState, useEffect, useRef, useImperativeHandle} from "react";
import { Command, CommandGroup, CommandItem, CommandList } from "@/shared/ui/Command";
import { Badge } from "@/shared/ui/Badge";
import {cn} from "@/shared/lib/utils";

export type MultiSelectOption = {
    value: string;
    label: string;
};

export interface MultiSelectProps<T extends MultiSelectOption> {
    options: T[];
    value?: T[];
    defaultValue?: T[];
    onChange?: (value: T[]) => void;
    minSelected?: number;
    maxSelected?: number;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    ref?: React.ForwardedRef<HTMLDivElement>;
}

export function MultiSelect<T extends MultiSelectOption>({
                                                             options,
                                                             value,
                                                             defaultValue,
                                                             onChange,
                                                             minSelected = 0,
                                                             maxSelected = 0,
                                                             placeholder = "Select items...",
                                                             disabled = false,
                                                             ref,
                                                             className
                                                         }: MultiSelectProps<T>) {
    const [selectedInternal, setSelectedInternal] = useState<T[]>(defaultValue ?? []);
    const containerRef = useRef<HTMLDivElement>(null);
    const [open, setOpen] = useState(false);
    const [inputValue, setInputValue] = useState("");

    useImperativeHandle(ref, () => containerRef.current as HTMLDivElement);

    const selected = value !== undefined ? value : selectedInternal;

    const handleChange = useCallback((newSelected: T[]) => {
        setSelectedInternal(newSelected);
        onChange?.(newSelected);
    }, [onChange]);

    const handleUnselect = useCallback((item: T) => {
        if (selected.length <= minSelected) {
            return;
        }

        const newSelected = selected.filter((s) => s.value !== item.value);
        handleChange(newSelected);
    }, [selected, handleChange, minSelected]);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLInputElement>) => {
            const isBackspace = e.key === "Backspace";
            if (isBackspace && !inputValue && selected.length > 0 && selected.length > minSelected) {
                const newSelected = [...selected];
                newSelected.pop();
                handleChange(newSelected);
            }
        },
        [inputValue, selected, handleChange, minSelected]
    );

    const filteredOptions = useMemo(
        () => options.filter((option) =>
            !selected.some(item => item.value === option.value) &&
            option.label.toLowerCase().includes(inputValue.toLowerCase())
        ),
        [options, selected, inputValue]
    );

    const handleSelect = useCallback((item: T) => {
        if (maxSelected > 0 && selected.length >= maxSelected) {
            return;
        }
        setInputValue("");
        handleChange([...selected, item]);
    }, [selected, handleChange, maxSelected]);

    useEffect(() => {
        if (!open) return;

        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };

        const handler = () => {
            document.addEventListener("pointerdown", handleClickOutside);
        };
        const timerId = requestAnimationFrame(handler);

        return () => {
            cancelAnimationFrame(timerId);
            document.removeEventListener("pointerdown", handleClickOutside);
        };
    }, [open]);

    useEffect(() => {
        if (value === undefined && defaultValue !== undefined) {
            setSelectedInternal(defaultValue);
        }
    }, [defaultValue, value]);

    const canRemoveItems = selected.length > minSelected;

    return (
        <div ref={containerRef} className={cn("w-full", className)}>
            <Command className="overflow-visible">
                <div
                    className={cn(
                        "rounded-md border border-input px-3 py-2 text-sm ring-offset-background",
                        "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
                        disabled && "opacity-50 cursor-not-allowed bg-muted"
                    )}
                >
                    <div className="flex flex-wrap gap-1">
                        {selected.map((item) => {
                            return (
                                <Badge
                                    key={item.value}
                                    variant="secondary"
                                    className="select-none"
                                >
                                    {item.label}
                                    {canRemoveItems && !disabled && (
                                        <X
                                            className="size-3 text-muted-foreground hover:text-foreground ml-2 cursor-pointer"
                                            onMouseDown={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                            }}
                                            onClick={() => handleUnselect(item)}
                                        />
                                    )}
                                </Badge>
                            );
                        })}
                        <CommandPrimitive.Input
                            onKeyDown={handleKeyDown}
                            onValueChange={setInputValue}
                            value={inputValue}
                            onBlur={() => setOpen(false)}
                            onFocus={() => !disabled && setOpen(true)}
                            onClick={(e) => {
                                e.stopPropagation();
                                !disabled && setOpen(true);
                            }}
                            placeholder={selected.length === 0 ? placeholder : ""}
                            className="ml-2 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
                            disabled={disabled || (maxSelected > 0 && selected.length >= maxSelected)}
                        />
                    </div>
                </div>
                <div className="relative mt-2">
                    <CommandList>
                        {open && !disabled && filteredOptions.length > 0 && (
                            <div
                                className="absolute top-0 z-10 w-full rounded-md border bg-popover text-popover-foreground shadow-md outline-none"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <CommandGroup className="h-full overflow-auto max-h-64">
                                    {filteredOptions.map((option) => {
                                        return (
                                            <CommandItem
                                                key={option.value}
                                                onMouseDown={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                }}
                                                onSelect={() => handleSelect(option)}
                                                className="cursor-pointer"
                                            >
                                                {option.label}
                                            </CommandItem>
                                        );
                                    })}
                                </CommandGroup>
                            </div>
                        )}
                    </CommandList>
                </div>
            </Command>
        </div>
    );
}