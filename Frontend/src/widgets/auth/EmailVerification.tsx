"use client";

import {EchoContainer} from "@/shared/ui/Container";
import {Button} from "@/shared/ui/Button";
import {EIcon, SvgIcon} from "@/shared/ui/Icon";
import {Badge} from "@/shared/ui/Badge";
import {Separator} from "@/shared/ui/Separator";
import {Label} from "@/shared/ui/Label";


export default function EmailVerification({ verifiedEmail }: { verifiedEmail?: string }) {
    if (!verifiedEmail) {

        return (
            <EchoContainer className="text-center max-w-md w-full py-12">
                <div>
                    <SvgIcon size={64} className="mx-auto mb-4 text-red-500" icon={EIcon.CrossFill} />
                    <h2 className="text-2xl font-bold">The confirmation link is invalid!</h2>
                </div>
                <Separator className="my-6"/>

                <Label size={"md"}  className="text-sm/8 text-foreground mb-6">
                    The email confirmation link is expired or invalid. Please check the link in your email or request a new one. Keep in mind that the link is valid for a limited time
                </Label>


                <Button href={"/auth?mode=signup"} className="mt-6 w-full" variant={"outline"}>
                    Go to sign up
                </Button>
            </EchoContainer>
        );
    }


    return (
        <EchoContainer className="text-center max-w-md w-full py-12">
            <div>

                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <SvgIcon icon={EIcon.Check} className="text-foreground" />
                </div>
                <h2 className="text-2xl font-bold">Email verified!</h2>
            </div>
            <Separator className="my-6"/>

            <Label size={"md"}  className="text-sm/8 text-foreground mb-6">
                Your <Badge>{verifiedEmail} </Badge> email address has been successfully verified.
                Now you can use all the features of Echosphere.
            </Label>


            <Button href={"/"} className="mt-6 w-full" variant={"outline"}>
                Go to the main page
            </Button>
        </EchoContainer>
    );


}