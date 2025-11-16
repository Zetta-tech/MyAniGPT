import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function ChatPage() {
  const cookieStore = await cookies();
  const authenticated = cookieStore.get('authenticated');

  if (!authenticated || authenticated.value !== 'true') {
    redirect('/');
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-900 p-8">
      <div className="w-full max-w-4xl">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-6">
          Chat Page
        </h1>
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-lg p-6">
          <p className="text-zinc-700 dark:text-zinc-300">
            Welcome! You have successfully logged in.
          </p>
        </div>
      </div>
    </div>
  );
}
