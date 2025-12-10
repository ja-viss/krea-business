import { redirect } from 'next/navigation';

export default function Home() {
  // In a real app, you'd check for an active session.
  // If authenticated, redirect to '/dashboard', otherwise to '/login'.
  redirect('/login');
}
