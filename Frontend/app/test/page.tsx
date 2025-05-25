"use client";

import Plyr from "plyr-react";
import "plyr-react/plyr.css";

export default function VideoPage() {
    return (
        <Plyr
            source={{
                type: "video",
                // @ts-ignore
                sources: [{ src: "bTqVqk7FSmY", provider: "youtube" }],
            }}/>
    )
}