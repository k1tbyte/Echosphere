"use client"

import {ComponentPropsWithoutRef, FC} from "react";
import {cn} from "@/lib/utils";
import {Button} from "@/shared/ui/Button/Button";
import {Label} from "@/shared/ui/Label/Label";
import {Input} from "@/shared/ui/Input/Input";
import {EIcon, SvgIcon} from "@/shared/ui/Icon";
import Link from "next/link";

export const RegisterForm: FC<ComponentPropsWithoutRef<'form'>> = ({ className }, ...props) => {
    return (
        <form className={cn("flex flex-col gap-6 w-full max-w-[450px]", className)} {...props}>
            <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">Create an account</h1>
                <p className="text-balance text-sm text-muted-foreground">
                    Enter your details below to create your account
                </p>
            </div>
            <div className="grid gap-6">
                <div className="grid gap-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" type="text" placeholder="John Doe" required />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" placeholder="example@example.com" required />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="password">Password</Label>
                    <Input id="password" type="password" required />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input id="confirmPassword" type="password" required />
                </div>
                <Button type="submit" className="w-full">
                    Create Account
                </Button>
                <div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border">
                    <span className="relative z-10 bg-background px-2 text-muted-foreground">
                        Or continue with
                    </span>
                </div>
                <Button variant="outline" className="w-full">
                    <SvgIcon icon={EIcon.Google}/>
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