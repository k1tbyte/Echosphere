import {ComponentProps, type FC, useEffect, useState} from "react";
import {useTheme} from "@heroui/use-theme";

interface AuthProps extends ComponentProps<'div'> {

}

const Auth: FC<AuthProps> = ({ } ) => {
    return (
        <div className="bg-contain h-screen">
            <h1>Auth</h1>
            <p>Login or register</p>
        </div>
    );
}

export default Auth;