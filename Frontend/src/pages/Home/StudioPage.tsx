"use client";

import React, {type FC} from "react";

import {redirect} from "next/navigation";
import { useNavigationStore } from "@/store/navigationStore";


export const StudioPage: FC = () => {
    const { data: file }: { data: File } = useNavigationStore();

    if(!file) {
        redirect("/home");
    }

    return (
        <div
            className="h-full relative">
            Handling file: {file.name}
        </div>
    )
}