import { Link } from 'react-router-dom';

export default function Navbar() {
  return (
    <nav className="border-b border-gray-200 bg-white shadow-sm">
      <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/" className="text-lg font-bold text-indigo-600">
          StudyCircle
        </Link>
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <Link to="/login" className="hover:text-indigo-600 transition">Login</Link>
          <Link to="/register" className="hover:text-indigo-600 transition">Register</Link>
        </div>
      </div>
    </nav>
  );
}
