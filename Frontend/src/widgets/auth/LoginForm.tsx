"use client"

import {ComponentPropsWithoutRef, FC, useState} from "react";
import {Button} from "@/shared/ui/Button/Button";
import {Label} from "@/shared/ui/Label/Label";
import {Input} from "@/shared/ui/Input/Input";
import {EIcon, SvgIcon} from "@/shared/ui/Icon";
import Link from "next/link";
import {getSession, signIn} from 'next-auth/react';
import {cn} from "@/shared/lib/utils";
import {useRouter} from 'next/navigation';
import {toast, ToastVariant} from "@/shared/ui/Toast";
import {UsersService} from "@/shared/services/usersService";
import {Checkbox} from "@/shared/ui/Checkbox";
import {useTitle} from "@/widgets/player/hooks/useTitle";

interface ILoginFormProps extends ComponentPropsWithoutRef<'form'> {
    callbackUrl: string;
}

const errorMessages: Record<string, { message: string, popup?: boolean, }> = {
    "server_unavailable":  { message: "The server is unavailable. Please try again later", popup: true },
    "401":  { message: "Invalid email or password." },
    "403": { message: "This account has been blocked" },
};

export const LoginForm: FC<ILoginFormProps> = ({ className, callbackUrl }, ...props) => {
    const [error,setError] = useState("")
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    useTitle("Login")

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        try {
            // @ts-ignore
            const formData = new FormData(e.currentTarget);
            const email = formData.get("email") as string;
            const password = formData.get("password") as string;

            const result = await signIn("credentials", {
                redirect: false,
                email,
                password,
                remember: formData.get("remember") === "on",
                callbackUrl: decodeURIComponent(callbackUrl),
            });

            if (result?.error) {
                const errorMessage = errorMessages[result.error] || errorMessages["default"];
                if(!errorMessage) {
                    // noinspection ExceptionCaughtLocallyJS
                    throw new Error(result.error);
                }
                if(errorMessage.popup) {
                    toast.open({ body: errorMessage.message, variant: ToastVariant.Error });
                    return;
                }
                setError(errorMessage.message);
                return;
            }

            const session = (await getSession())!;
            const user = await UsersService.getUserById(Number(session.user.id))
            UsersService.storeUserAvatarUrl(user);

            if (result?.ok) {
                router.push(result.url || callbackUrl);
                router.refresh();
            }
        } catch (err) {
            toast.open({ body: "An error occurred while logging in. Error: " + error, variant: ToastVariant.Error });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className={cn("flex flex-col gap-6 w-full max-w-[450px]", className)} {...props}>
            <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">Login to your account</h1>
                <p className="text-balance text-sm text-muted-foreground">
                    Enter your email below to login to your account
                </p>
            </div>
            <div className="grid gap-6">
                <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input name="email" id="email" type="email" placeholder="example@example.com" required />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="password">Password</Label>
                    <Input name="password" id="password" type="password" required />
                    <a
                        href="#"
                        className="text-sm underline-offset-4 hover:underline"
                    >
                        Forgot your password?
                    </a>
                </div>
                <div className="flex-y-center gap-2 -mt-3">
                    <Checkbox name="remember" id="remember"/>
                    <Label htmlFor="remember">Remember me</Label>
                </div>

                {error && <Label size={"md"} className="font-normal text-red-500 -mt-3 -mb-3">{error}</Label>}
                <Button className="w-full" loading={isLoading}>
                    Login
                </Button>
                <div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border">
          <span className="relative z-10 bg-background px-2 text-muted-foreground">
            Or continue with
          </span>
                </div>
                <Button variant="outline" className="w-full" disabled={isLoading}>
                    <SvgIcon icon={EIcon.Google} size={15}/>
                    Login with Google
                </Button>
            </div>
            <div className="text-center text-sm" >
                Don&apos;t have an account?{" "}
                <Link href="/auth?mode=signup" className="underline underline-offset-4">
                    Sign up
                </Link>
            </div>
        </form>
    )
}