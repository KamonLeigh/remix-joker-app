
import type { LoaderFunction } from "remix";
import { useLoaderData, Link, useCatch } from "remix";
import type { Joke } from "@prisma/client"
import { db } from "~/utils/db.server";

type LoaderData = { randomJoke: Joke };

export const loader: LoaderFunction = async () => {
    const count = await db.joke.count();
    const randomRowNumber = Math.floor(Math.random() * count);
    const [randomJoke] = await db.joke.findMany({
        take: 1,
        skip: randomRowNumber
    });

    if (!randomJoke) {
        throw new Response("Random joke not found!!",{
            status: 404
        })
    }

    const data: LoaderData = { randomJoke };
    return data;
}

export default function JokesIndexRoute() {
    const data = useLoaderData<LoaderData>();
    return (
        <div>
            <p>Here's a random joke:</p>
            <p>{data.randomJoke.content}</p>
            <Link to={data.randomJoke.id}>
                "{data.randomJoke.name}" Permalink
            </Link>
        </div>
    )
}

export function catchBoundary() {
    const caught = useCatch();

    if (caught.status === 404) {
        return (
            <div className="error-container">
                There are no jokes display
            </div>
        )
    }

    throw new Error(
        `Unexpected error with response: ${caught.status}`
    )
}

export function ErrorBoundary() {
    return (
      <div className="error-container">
        Yikes!!!!
      </div>
    );
  }