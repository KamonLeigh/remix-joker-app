import bcrypt from "bcryptjs"
import { db } from "./db.server";
import { createCookieSessionStorage, redirect} from "remix"

type LoginForm = {
    username: string
    password: string 
}

export async function login({ 
    username,
    password
}: LoginForm){

    const user = await db.user.findUnique({
        where: {
            username
        }
    })

    if (!user) return null;

    const isPasswordCorrect = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordCorrect) return null

    return user;
}

export async function register({ username, password }: LoginForm){
    const passwordHash = await bcrypt.hash(password, 10);

    return db.user.create({
        data: {
            username,
            passwordHash
        }
    })
}

const sessionSecret = process.env.SESSION_SECRET 

if (!sessionSecret) {
    throw new Error("SESSION_SECRET must be set");
}

const storage = createCookieSessionStorage({
    cookie: {
        name: "__session",
        expires: new Date(Date.now() + 60),
        httpOnly: true,
        maxAge: 60,
        path: "/",
        sameSite: "lax",
        secrets: [sessionSecret],
        secure: process.env.NODE_ENV === "production"
    }
})

export async function createUserSession(userId: string, redirectTo: string) {
    const session = await storage.getSession();
    session.set("userId", userId);

    return redirect(redirectTo, {
        headers: {
            "Set-Cookie": await storage.commitSession(session)
        }
    })
}

export async function getUserSession(request: Request){
    return storage.getSession(request.headers.get("Cookie"))
}

export async function getUserId(request: Request) {
    const session = await getUserSession(request);

    const userId = session.get("userId");

    if (!userId || typeof userId !== 'string') return null;

    return userId
}

export async function requireUserId(request: Request, redirectTo: string = new URL(request.url).pathname) {
    const session = await getUserSession(request);

    const userId = session.get("userId");

    if (!userId || typeof userId !== "string") {
        const searchParams = new URLSearchParams([
            ["redirectTo", redirectTo]
        ])

        throw redirect(`/login?${searchParams}`)
    }

    return userId;
    
}

export async function getUser(request: Request) {
    const userId = await getUserId(request);

    if(typeof userId !== 'string' || !userId) return null;

    try {
        const user = await db.user.findUnique({
            where: {
                id : userId
            }
        })

        return user
    } catch {
        throw logout(request)
    }
 
}

export async function logout(request: Request) {
   const session = await storage.getSession(
       request.headers.get("Cookie")
   )

   return redirect("/login", {
       headers: { "Set-Cookie": await storage.destroySession(session)}
   })
}