import { Form, json, LinksFunction, useActionData } from "remix"
import type { MetaFunction } from "remix";
import { Link, useSearchParams} from "remix";
import stylesUrl from '../styles/login.css';
import { db } from "~/utils/db.server";
import { login, createUserSession, register} from "~/utils/session.server";

export const links: LinksFunction = () => {
    return [{ rel: "stylesheet", href: stylesUrl}]
}

export const meta: MetaFunction = () => {
  return {
    title: "Remix Jokes | Login",
    description: "Login to submit your own jokes to Remix Jokes!"
  }
}


function validateUsername(content: unknown) {
    if (typeof content !== 'string' || content.length < 3) {
        return 'Username needs to be at least 3 characters'
    }
}

function validatePassword(content: unknown) {
    if (typeof content !== 'string' || content.length < 6) {
        return 'Password needs to be at least 6 characters'
    }
}

type ActionData = {
    formError?: string;
    fieldErrors?: {
        username: string | undefined 
        password: string | undefined
    };
    fields?: {
        loginType: string  ;
        username: string;
        password: string;
    }
}

const badRequest = (data: ActionData) => json(data, { status: 400});

export const action: ActionData = async({ request }) => {
    const form = await request.formData();
    const loginType = form.get('loginType');
    const username = form.get('username');
    const password = form.get('password');
    const redirectTo = form.get("rediectTo") || "/jokes";

    if (typeof loginType !== "string" || 
        typeof username !== "string" ||
        typeof password !== "string" ||
        typeof redirectTo !== 'string'
    ) {
        badRequest({formError: 'Form nor submittes correctly'})
    }

    const fieldErrors = {
        username: validateUsername(username),
        password: validatePassword(password)
    }

    const fields = { loginType, username, password }

    if (Object.values(fieldErrors).some(Boolean)) {
        return badRequest({ fieldErrors, fields})
    }

    switch(loginType) {

        case 'login': {
            const user = await login({ username, password});
            console.log({ user })
            if (!user) {
                return badRequest({fields, formError: "Error with username\password combination"})
            }
            return createUserSession(user.id, redirectTo);

          }
        case 'register': {

        const userExist = await db.user.findFirst({
            where: {
                username
            }
        })

        if (userExist) {
            return badRequest({ fields, formError: `The username: ${username} already exists`})
        }

        const user = await register({ username, password});
        if (!user) {
          return badRequest({fields, formError: "Error with username\password combination"})
      }
      return createUserSession(user.id, redirectTo);

         }
        default: 

        return badRequest({fields, formError: 'Form nor submittes correctly'})


    }


}

export default function Login() {
    const [searchParams] = useSearchParams();
    const actionData = useActionData<ActionData>()

      return (
        <div className="container">
          <div className="content" data-light="">
            <h1>Login</h1>
            <Form method="post">
              <input
                type="hidden"
                name="redirectTo"
                value={
                  searchParams.get("redirectTo") ?? undefined
                }
              />
              <fieldset>
                <legend className="sr-only">
                  Login or Register?
                </legend>
                <label>
                  <input
                    type="radio"
                    name="loginType"
                    value="login"
                    defaultChecked={
                        !actionData?.fields?.loginType ||
                        actionData?.fields?.loginType === 'login'
                    }

                  />{" "}
                  Login
                </label>
                <label>
                  <input
                    type="radio"
                    name="loginType"
                    value="register"
                    defaultChecked={actionData?.fields?.loginType === 'register'}
                  />{" "}
                  Register
                </label>
              </fieldset>
              <div>
                <label htmlFor="username-input">Username</label>
                <input
                  defaultValue={actionData?.fields?.username}
                  type="text"
                  id="username-input"
                  name="username"
                  aria-invalid={
                      Boolean(actionData?.fields?.username) || undefined
                      
                  }
                  aria-describedby={
                      actionData?.fieldErrors?.username 
                      ? "username-error"
                      : undefined 
                  }
                />
                {actionData?.fieldErrors?.username ? (
                    <p 
                    className="form-validation-error"
                    role="alert"
                    id="username-error"
                    >
                    {actionData.fieldErrors.username}
                    </p>
                ): null}
              </div>
              <div>
                <label htmlFor="password-input">Password</label>
                <input
                  id="password-input"
                  name="password"
                  type="password"
                  defaultValue={actionData?.fields?.password}
                  aria-invalid={
                      Boolean(actionData?.fieldErrors?.password) || 
                      undefined
                  }
                  aria-describedby={
                      actionData?.fieldErrors?.password
                      ? "password-error"
                      : undefined 
                  }
                />
                {actionData?.fieldErrors?.password ? (
                    <p
                        className="form-validation-error"
                        role="alert"
                        id="password-error"
                    >
                        {actionData.fieldErrors.password}
                    </p>

                ) : null 
                }
              </div>
              <button type="submit" className="button">
                Submit
              </button>
            </Form>
          </div>
          <div className="links">
            <ul>
              <li>
                <Link to="/">Home</Link>
              </li>
              <li>
                <Link to="/jokes">Jokes</Link>
              </li>
            </ul>
          </div>
        </div>
      );
}