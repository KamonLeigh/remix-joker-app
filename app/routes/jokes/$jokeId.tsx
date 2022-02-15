
import type { ActionFunction, LoaderFunction, MetaFunction } from "remix";
import { Link , useLoaderData, useParams, useCatch, redirect, Form } from "remix";
import type { Joke } from "@prisma/client";
import { db } from "~/utils/db.server";
import { requireUserId, getUserId } from "~/utils/session.server";
import { JokeDisplay } from "~/components/joke";

export const meta: MetaFunction = ({ data } : { data : LoaderData | undefined} ) => {
  if (!data) {
    return {
      title: "No Joke",
      description: "No joke found"
    }
  }
  return {
    title: `"${data.joke.name}"`,
    description: "No joke found"
  }
}

type LoaderData = { joke: Joke, isOwner: boolean };

export const action: ActionFunction = async({
  request,
  params
}) => {
  const form = await request.formData();

  if (form.get('_method') === 'delete') {
    const userId = await requireUserId(request);

    const joke = await db.joke.findUnique({
      where: {
        id: params.jokeId
      }
    });

  

    if (!joke) {
      throw new Response("Joke was not found :-(", {
        status: 404
      })
    }

    if (joke.jokesterId !== userId) {
      throw new Response("You are not the author of the joke", {
        status: 401
      })
    }

     await db.joke.delete({ where: { id: params.jokeId}})

     return redirect("/jokes")

  }
}

export const loader: LoaderFunction = async({request, params}) => {
    
  const userId = await getUserId(request);
  const joke = await db.joke.findUnique({
        where: { id: params.jokeId}
    })

    if (!joke) {
      throw new Response("Joke not found", {
        status: 404
      })
    }
    const data: LoaderData = { joke, isOwner: userId === joke.jokesterId };
    return data;
}

export default function JokeRoute() {
    const data = useLoaderData<LoaderData>()
    return (
      <JokeDisplay joke={data.joke} isOwner={data.isOwner}/>
        
    );
  }

  export function CatchBoudary() {
    const caught = useCatch();
    const params = useParams();

    switch(caught.status) {
      case 401: {
        return (
          <div className="error-container">
            You are not the author of joke: {params.jokeId}
          </div>
        )
      }
      case 404: {
        return (
          <div className="error-container">
            I am not sure what you are looking for but {params.jokeId} is not
            a thing!
          </div>
        )
      }

      default: {
        throw new Error(`Unhandled error: ${caught.status}`)
      }
    }
  }

  export function ErrorBoundary() {
    const { jokeId } = useParams();

    return (
     <div className="error-container">
       {`There is an error loading joke with id ${jokeId}`}
     </div>
    )
  }