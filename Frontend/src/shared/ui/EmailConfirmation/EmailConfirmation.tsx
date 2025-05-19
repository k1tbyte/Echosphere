// emails/ConfirmationEmail.tsx
import {
    Body,
    Button,
    Container,
    Head,
    Html,
    Img,
    Preview,
    Section,
    Text,
    Hr,
} from '@react-email/components';
import * as React from 'react';

export const EmailConfirmation = ({ confirmationUrl}: {confirmationUrl: string}) => (
    <Html>
        <Head />
        <Preview>Confirm your Echosphere account</Preview>
        <Body style={{
            backgroundColor: '#000000',
            fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            margin: '0',
        }}>
            <Container style={{
                margin: '0 auto',
                padding: '20px 0',
                width: '100%',
                maxWidth: '580px',
            }}>
                <Section style={{
                    padding: '25px 0',
                    textAlign: 'center' as const,
                }}>
                    <Img
                        src={`${process.env.NEXT_PUBLIC_APP_URL}/logo.svg`}
                        width="140"
                        height="40"
                        alt="Echosphere"
                        style={{
                            margin: '0 auto',
                        }}
                    />
                </Section>

                <Section style={{
                    backgroundColor: '#111111',
                    borderRadius: '5px',
                    padding: '40px',
                }}>
                    <Text style={{
                        color: '#FFFFFF',
                        fontSize: '24px',
                        fontWeight: '600',
                        lineHeight: '30px',
                        margin: '0 0 20px',
                    }}>
                        Verify your email address
                    </Text>
                    <Text style={{
                        color: '#AAAAAA',
                        fontSize: '16px',
                        lineHeight: '24px',
                        margin: '16px 0',
                    }}>
                        Thank you for creating an Echosphere account. Please verify your email address by clicking the button below.
                    </Text>

                    <Section style={{ textAlign: 'center' as const, padding: '32px 0' }}>
                        <Button
                            href={confirmationUrl}
                            style={{
                                backgroundColor: '#FFFFFF',
                                borderRadius: '5px',
                                color: '#000000',
                                display: 'inline-block',
                                fontSize: '16px',
                                fontWeight: '600',
                                marginLeft: 'auto',
                                marginRight: 'auto',
                                padding: '12px 30px',
                                textDecoration: 'none',
                                textAlign: 'center' as const,
                                maxWidth: '240px',
                            }}
                        >
                            Confirm Email
                        </Button>
                    </Section>

                    <Text style={{
                        color: '#AAAAAA',
                        fontSize: '16px',
                        lineHeight: '24px',
                        margin: '16px 0',
                    }}>
                        If you did not create an Echosphere account, you can safely ignore this email.
                    </Text>
                </Section>

                <Hr style={{
                    borderColor: '#333333',
                    margin: '30px 0',
                }} />

                <Section style={{
                    padding: '20px 0',
                }}>
                    <Text style={{
                        color: '#666666',
                        fontSize: '12px',
                        lineHeight: '16px',
                        margin: '8px 0',
                        textAlign: 'center' as const,
                    }}>
                        © {new Date().getFullYear()} Echosphere. All rights reserved.
                    </Text>
                    <Text style={{
                        color: '#666666',
                        fontSize: '12px',
                        lineHeight: '16px',
                        margin: '8px 0',
                        textAlign: 'center' as const,
                    }}>
                        Your ultimate streaming destination.
                    </Text>
                </Section>
            </Container>
        </Body>
    </Html>
);