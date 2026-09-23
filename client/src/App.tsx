import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-white text-gray-900">
        <Navbar />
        <main className="max-w-3xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-indigo-600 mb-4">StudyCircle</h1>
          <p className="text-gray-600">Your study community. Ask, answer, learn together.</p>
        </main>
      </div>
    </BrowserRouter>
  );
}
