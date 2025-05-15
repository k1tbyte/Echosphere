"use client"

import { useSearchParams } from 'next/navigation';
import {CheckeredContainer} from "@/shared/ui/Container/CheckeredContainer";
import Image from 'next/image'
import {Plus} from "lucide-react";
import {EPosition, PositionedElement} from "@/shared/ui/Particles/PositionedElement";
import {LoginForm} from "@/widgets/auth/LoginForm";
import { Label} from "@/shared/ui/Label/Label";
import { motion } from "motion/react";
import {RegisterForm} from "@/widgets/auth/RegisterForm";

export const AuthPage = () => {
    const searchParams = useSearchParams();
    const mode = searchParams?.get('mode');

    return (
        <div className="h-screen overflow-clip">
            <div className="sm:p-10 h-full">
                <div className="border border-dashed w-full h-full bg-background/75 grid lg:grid-cols-2 relative items-center lg:items-stretch">
                    <div className="lg:border-r border-dashed justify-center items-center flex px-5">
                        {mode === 'signup' ? (
                            <RegisterForm className="border border-border p-7 rounded-md"/>
                        ) : (
                            <LoginForm className="border border-border p-10 rounded-md"/>
                        )}
                    </div>

                    <div className="relative hidden lg:flex h-full w-full">
                        <Label variant="filled" size="md" className="bottom-0 mb-10 lg:ml-10 absolute opacity-90 z-10">
                            Echosphere. Streaming bytes over the horizon :)
                        </Label>
                        <div className="relative h-full w-full flex items-center justify-center">
                            <div className="relative w-[80%] h-[80%]">
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="absolute inset-0"
                                >
                                    <Image
                                        draggable={false}
                                        src="/logo.svg"
                                        alt="test"
                                        fill
                                        className="object-contain"
                                    />
                                </motion.div>
                            </div>
                        </div>
                    </div>
                    <PositionedElement position={EPosition.BOTTOM_CENTER} children={<Plus/>}/>
                    <PositionedElement position={EPosition.TOP_CENTER} children={<Plus/>}/>
                    <PositionedElement position={EPosition.TOP_RIGHT} children={<Plus/>}/>
                    <PositionedElement position={EPosition.BOTTOM_RIGHT} children={<Plus/>}/>
                    <PositionedElement position={EPosition.TOP_LEFT} children={<Plus/>}/>
                    <PositionedElement position={EPosition.BOTTOM_LEFT} children={<Plus/>}/>
                </div>
            </div>
        </div>
    )
}

