'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Check if we have an OAuth code in the URL
    const code = searchParams.get('code');
    if (code) {
      // Redirect to callback to exchange code for token
      router.push(`/api/mal/callback?code=${code}&state=${searchParams.get('state')}`);
    }
  }, [searchParams, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-zinc-950 dark:via-slate-900 dark:to-zinc-900">
      <div className="w-full max-w-4xl p-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-block p-6 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl shadow-2xl mb-6">
            <span className="text-6xl">🎌</span>
          </div>
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Anime Recommendation AI
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Get personalized anime recommendations powered by AI, MyAnimeList data, and your watch history
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white dark:bg-zinc-800 p-6 rounded-2xl shadow-lg border border-slate-200 dark:border-zinc-700">
            <div className="text-3xl mb-3">🤖</div>
            <h3 className="text-lg font-semibold mb-2 text-slate-900 dark:text-slate-50">AI-Powered</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Smart recommendations based on your preferences and watch history
            </p>
          </div>
          
          <div className="bg-white dark:bg-zinc-800 p-6 rounded-2xl shadow-lg border border-slate-200 dark:border-zinc-700">
            <div className="text-3xl mb-3">📊</div>
            <h3 className="text-lg font-semibold mb-2 text-slate-900 dark:text-slate-50">MAL Integration</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Access your MyAnimeList data and the entire anime database
            </p>
          </div>
          
          <div className="bg-white dark:bg-zinc-800 p-6 rounded-2xl shadow-lg border border-slate-200 dark:border-zinc-700">
            <div className="text-3xl mb-3">🌐</div>
            <h3 className="text-lg font-semibold mb-2 text-slate-900 dark:text-slate-50">Streaming Info</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Find where to watch on Crunchyroll and other platforms
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
          <Link
            href="/chat"
            className="px-8 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl text-center text-lg"
          >
            🚀 Start Chatting
          </Link>
          
          <Link
            href="/test-mal"
            className="px-8 py-4 bg-white dark:bg-zinc-800 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-700 transition-all duration-200 font-semibold shadow-lg border border-slate-200 dark:border-zinc-700 text-center text-lg"
          >
            🔧 Test MAL Setup
          </Link>
        </div>

        {/* Quick Info */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-3 text-blue-900 dark:text-blue-100">
            ✨ Features
          </h3>
          <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
            <li>✅ View your MyAnimeList watch history</li>
            <li>✅ Get personalized recommendations based on your taste</li>
            <li>✅ Search anime database with detailed information</li>
            <li>✅ Discover top-rated and seasonal anime</li>
            <li>✅ Check streaming availability on Crunchyroll</li>
            <li>✅ Session memory - AI remembers your conversation</li>
          </ul>
        </div>

        {/* Setup Notice */}
        <div className="mt-8 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            First time? Check out the{' '}
            <a href="https://github.com/yourusername/yourrepo#quick-start" className="text-blue-600 dark:text-blue-400 hover:underline font-semibold">
              Quick Start Guide
            </a>
            {' '}to set up your API keys
          </p>
        </div>
      </div>
    </div>
  );
}
