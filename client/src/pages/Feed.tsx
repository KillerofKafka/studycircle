import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

interface Question {
  id: number;
  title: string;
  body: string;
  subject: string;
  created_at: string;
  author_name: string;
  author_id: number;
  answer_count: number;
}

interface Subject {
  name: string;
  question_count: number;
}

export default function Feed() {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [filterSubject, setFilterSubject] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterSubject) params.set('subject', filterSubject);
      if (search) params.set('q', search);
      params.set('page', String(page));
      params.set('limit', String(limit));
      const data = await api.get<{ questions: Question[]; total: number }>(`/api/questions?${params.toString()}`);
      setQuestions(data.questions);
      setTotal(data.total);
    } catch {
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  }, [filterSubject, search, page, limit]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  useEffect(() => {
    api.get<{ subjects: Subject[] }>('/api/subjects').then(d => setSubjects(d.subjects)).catch(() => {});
  }, []);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Questions</h1>
        <div className="flex gap-2 flex-wrap">
          <select
            value={filterSubject}
            onChange={(e) => { setFilterSubject(e.target.value); setPage(1); }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All subjects</option>
            {subjects.map(s => (
              <option key={s.name} value={s.name}>{s.name}</option>
            ))}
          </select>
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search…"
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button type="submit" className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg text-sm hover:bg-gray-200 transition">Search</button>
          </form>
          {user && (
            <Link to="/ask" className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition">
              + Ask
            </Link>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading…</div>
      ) : questions.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">No questions found.</p>
          {user && <Link to="/ask" className="text-indigo-600 hover:underline text-sm">Ask the first question →</Link>}
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map(q => (
            <Link
              key={q.id}
              to={`/questions/${q.id}`}
              className="block bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md hover:border-indigo-200 transition"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{q.title}</h3>
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">{q.body}</p>
                </div>
                <span className="flex-shrink-0 text-xs font-medium px-2 py-1 rounded-full bg-indigo-50 text-indigo-700">{q.subject}</span>
              </div>
              <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                <span>{q.author_name}</span>
                <span>{new Date(q.created_at).toLocaleDateString()}</span>
                <span className="ml-auto">{q.answer_count} answer{q.answer_count !== 1 ? 's' : ''}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-8">
          {page > 1 && (
            <button onClick={() => setPage(p => p - 1)} className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">← Prev</button>
          )}
          <span className="text-sm text-gray-500">Page {page} / {totalPages}</span>
          {page < totalPages && (
            <button onClick={() => setPage(p => p + 1)} className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Next →</button>
          )}
        </div>
      )}
    </div>
  );
}