import { getCsrfToken, getProviders, signIn } from "next-auth/react";
import { useState } from "react";

interface SignInProps {
  csrfToken: string;
  providers: any;
  callbackUrl: string;
}

export default function SignIn({ csrfToken, providers, callbackUrl }: SignInProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const autofillDemo = () => {
    setUsername("admin");
    setPassword("admin123");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
      <div className="bg-gray-800 p-8 rounded-xl shadow-lg w-full max-w-md">
        {providers?.google && (
          <button
            onClick={() => signIn("google", { callbackUrl })}
            className="w-full bg-white text-black py-2 px-4 rounded mb-6 flex items-center justify-center space-x-2"
          >
            <img
              src="https://www.svgrepo.com/show/475656/google-color.svg"
              className="w-5 h-5"
              alt="Google"
            />
            <span>Sign in with Google</span>
          </button>
        )}

        <div className="text-center text-gray-400 mb-4">or</div>

        <form method="post" action="/api/auth/callback/credentials" className="space-y-4">
          <input name="csrfToken" type="hidden" defaultValue={csrfToken} />
          <input name="callbackUrl" type="hidden" value={callbackUrl} />

          <div>
            <label className="block text-sm mb-1">Username</label>
            <input
              name="username"
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 rounded bg-gray-700 border border-gray-600"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Password</label>
            <input
              name="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded bg-gray-700 border border-gray-600"
            />
          </div>

          <div className="text-sm text-gray-400 text-center">
            Demo: <code className="text-white">admin</code> / <code className="text-white">admin123</code>
          </div>

          <button
            type="button"
            onClick={autofillDemo}
            className="w-full bg-yellow-600 hover:bg-yellow-700 py-2 rounded mt-2 text-sm"
          >
            Autofill Demo Credentials
          </button>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 py-2 rounded mt-2"
          >
            Sign in with Admin Login
          </button>
        </form>
      </div>
    </div>
  );
}

export async function getServerSideProps(context: any) {
  const csrfToken = await getCsrfToken(context);
  const providers = await getProviders();
  const callbackUrl = context.query.callbackUrl || "/";
  return {
    props: { csrfToken, providers, callbackUrl },
  };
}
