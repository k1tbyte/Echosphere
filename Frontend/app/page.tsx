import {HomePage} from "@/pages/HomePage/HomePage";
import {redirect} from "next/navigation";

/*

export default function Home() {
/!*    const { data: session, status } = useSession();
    if (status === "loading") {
        return <div>Loading...</div>;
    }

    if (status === "unauthenticated") {
        return <div>You are not authorized</div>;
    }

    return (
        <div>
            <h1>Profile</h1>
            <p>Hello, {session?.user?.name || 'user'}!</p>
            {session?.user?.avatar && (
                <img
                    src={session.user.avatar}
                    alt={`${session.user.name || 'User'}'s avatar`}
                    width={50}
                    height={50}
                    style={{ borderRadius: '50%' }}
                />
            )}
            <p>ID: {session?.user?.id}</p>
            <LogoutButton/>
        </div>
    );*!/
}
*/

export default function Root() {
    redirect("/home")
};