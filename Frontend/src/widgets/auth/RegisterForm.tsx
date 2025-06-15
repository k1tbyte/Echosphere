"use client"

import {ComponentPropsWithoutRef, FC, useState} from "react";
import {Button} from "@/shared/ui/Button/Button";
import {Label} from "@/shared/ui/Label/Label";
import {Input} from "@/shared/ui/Input/Input";
import {EIcon, SvgIcon} from "@/shared/ui/Icon";
import Link from "next/link";
import {auth} from "@/shared/services/authService";
import {cn} from "@/shared/lib/utils";
import {useTitle} from "@/shared/hooks/useTitle";
import {toast, ToastVariant} from "@/shared/ui/Toast";

export const RegisterForm: FC<ComponentPropsWithoutRef<'form'>> = ({ className }, ...props) => {
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isConfirmationSent, setIsConfirmationSent] = useState(false);
    const [emailDomain, setEmailDomain] = useState<string | null>(null);
    useTitle("Sign up")

    if(isConfirmationSent) {
        return (
            <div className="flex flex-col items-center gap-2 text-center max-w-[450px]">
                <h1 className="text-2xl font-bold">Almost done! Check your email</h1>
                <p className="text-balance text-sm text-muted-foreground">
                    A confirmation email has been sent to your email address. Please check your inbox and follow the instructions to confirm your account.
                    You will be automatically logged into your account once you confirm your registration
                </p>
                <div className="flex gap-2">
                    <Button variant="outline" className="px-10 mt-3" onClick={() => {
                        if(emailDomain) {
                            window.open(`https://${emailDomain}`, "_blank");
                        }
                    }}>
                        Go to {emailDomain}
                    </Button>
                </div>

            </div>
        )
    }

    return (
        <form className={cn("flex flex-col gap-6 w-full max-w-[450px]", className)} {...props} onSubmit={async (e) => {
            setError(null);
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const username = formData.get("username")?.toString()!;
            const email = formData.get("email")?.toString()!;
            const password = formData.get("password")?.toString()!;
            const confirmPassword = formData.get("confirmPassword")?.toString()!;

            if (confirmPassword !== password) {
                setError("Passwords do not match");
                return;
            }

            if (password.length < 8) {
                setError("Password must be at least 8 characters long");
                return;
            }

            if (!/^[a-zA-Z0-9]+$/.test(username)) {
                setError("Name can only contain letters and numbers");
                return;
            }

            setIsLoading(true);

            await auth.signup(username, email, password)
                .then((e) => {
                    setIsLoading(false);
                    setIsConfirmationSent(true);
                    setEmailDomain(email.split("@")[1]);
                })
                .catch((err) => {
                    setIsLoading(false);
                    switch(err.message) {
                        case "500":
                            setError("Server error, please try again later");
                            return;
                        case "409":
                            setError("User with this email already exists");
                            return;
                        case "400":
                            setError("Invalid email or password");
                            return;
                    }
                    setError(err.message);
                });

        }}>
            <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">Create an account</h1>
                <p className="text-balance text-sm text-muted-foreground">
                    Enter your details below to create your account
                </p>
            </div>
            <div className="grid gap-6">
                <div className="grid gap-2">
                    <Label htmlFor="name">Name</Label>
                    <Input name="username" type="text" placeholder="John Doe" required />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input name="email" type="email" placeholder="example@example.com" required />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="password">Password</Label>
                    <Input name="password" type="password" required />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input name="confirmPassword" type="password" required />
                </div>
                {error && <Label size={"md"} className="font-normal text-red-500 -mt-3 -mb-3">{error}</Label>}
                <Button loading={isLoading} type="submit" className="w-full">
                    Create Account
                </Button>
                <div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border">
                    <span className="relative z-10 bg-background px-2 text-muted-foreground">
                        Or continue with
                    </span>
                </div>
                <Button type={"button"} onClick={() => {
                    toast.open({
                        body: "Not implemented yet :)",
                        variant: ToastVariant.Warning
                    })
                }} variant="outline" className="w-full">
                    <SvgIcon icon={EIcon.Google} size={15}/>
                    Continue with Google
                </Button>
            </div>
            <div className="text-center text-sm">
                Already have an account?{" "}
                <Link href="/auth?mode=login" className="underline underline-offset-4">
                    Login
                </Link>
            </div>
            <div className="text-xs text-center text-muted-foreground">
                By clicking Create Account, you agree to our{" "}
                <Link href="/terms" className="underline underline-offset-4">
                    Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="underline underline-offset-4">
                    Privacy Policy
                </Link>
                .
            </div>
        </form>
    )
}