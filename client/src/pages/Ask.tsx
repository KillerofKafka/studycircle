import { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

interface Subject {
  name: string;
  question_count: number;
}

export default function Ask() {
  const nav = useNavigate();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [subject, setSubject] = useState('');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get<{ subjects: Subject[] }>('/api/subjects').then(d => setSubjects(d.subjects)).catch(() => {});
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const data = await api.post<{ question: { id: number } }>('/api/questions', { title, body, subject });
      nav(`/questions/${data.question.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create question');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Ask a question</h1>
      <form onSubmit={submit} className="space-y-4 bg-white p-6 rounded-xl shadow border border-gray-200">
        {error && <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</div>}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
          >
            <option value="">Select a subject…</option>
            {subjects.map(s => (
              <option key={s.name} value={s.name}>{s.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
            minLength={10}
            maxLength={200}
            placeholder="e.g. How do I integrate by parts with trig functions?"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Details</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={6}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
            required
            minLength={20}
            placeholder="Describe your question in detail. Include what you've tried, formulas, context…"
          />
        </div>
        <button
          type="submit"
          disabled={busy}
          className="w-full bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700 transition disabled:opacity-50"
        >
          {busy ? 'Posting…' : 'Post question'}
        </button>
      </form>
    </div>
  );
}
