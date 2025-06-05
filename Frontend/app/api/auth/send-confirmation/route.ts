import { render } from '@react-email/render';
import {EmailConfirmation} from "@/shared/ui/EmailConfirmation";
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT!),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USERNAME,
        pass: process.env.SMTP_PASSWORD,
    },
});

// @ts-ignore
export async function POST(request) {
    const { email, token } = await request.json();

    const confirmationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/verifyEmail?token=${token}`;

    try {
        const info = await transporter.sendMail({
            from: `"${process.env.SMTP_NAME}" <${process.env.SMTP_USERNAME}>`,
            to: email,
            subject: "Email address confirmation",
            html: await render(EmailConfirmation({ confirmationUrl: confirmationUrl } ))
        });

        return Response.json({ success: true, messageId: info.messageId });
    } catch (error) {
        console.error('Error sending email:', error);
        // @ts-ignore
        return Response.json({ success: false, error: error?.message }, { status: 500 });
    }
}