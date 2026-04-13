import { redirect } from 'next/navigation'

export default function HomePage() {
  // Redirect to login - middleware will handle the actual routing based on auth status
  redirect('/login')
}
