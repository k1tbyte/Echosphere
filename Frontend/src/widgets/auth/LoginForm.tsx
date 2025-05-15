"use client"

import {ComponentPropsWithoutRef, FC} from "react";
import {cn} from "@/lib/utils";
import {Button} from "@/shared/ui/Button/Button";
import {Label} from "@/shared/ui/Label/Label";
import {Input} from "@/shared/ui/Input/Input";
import {EIcon, SvgIcon} from "@/shared/ui/Icon";
import Link from "next/link";

export const LoginForm: FC<ComponentPropsWithoutRef<'form'>> = ({ className }, ...props) => {
    return (
        <form className={cn("flex flex-col gap-6 w-full max-w-[450px]", className)} {...props}>
            <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">Login to your account</h1>
                <p className="text-balance text-sm text-muted-foreground">
                    Enter your email below to login to your account
                </p>
            </div>
            <div className="grid gap-6">
                <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" placeholder="example@example.com" required />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="password">Password</Label>
                    <Input id="password" type="password" required />
                    <a
                        href="#"
                        className="text-sm underline-offset-4 hover:underline"
                    >
                        Forgot your password?
                    </a>
                </div>
                <Button type="submit" className="w-full">
                    Login
                </Button>
                <div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border">
          <span className="relative z-10 bg-background px-2 text-muted-foreground">
            Or continue with
          </span>
                </div>
                <Button variant="outline" className="w-full">
                    <SvgIcon icon={EIcon.Google}/>
                    Login with Google
                </Button>
            </div>
            <div className="text-center text-sm">
                Don&apos;t have an account?{" "}
                <Link href="/auth?mode=signup" className="underline underline-offset-4">
                    Sign up
                </Link>
            </div>
        </form>
    )
}