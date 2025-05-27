"use client";

import React from 'react';
import { PlyrPlayer } from "@/widgets/player/PlyrPlayer";
import Link from "next/link";

export const HomePage = () => {
    return (
        <div className="flex flex-col gap-4">
            <Link href={"/home/studio"}>
                Studio
            </Link>
        </div>
    );
};