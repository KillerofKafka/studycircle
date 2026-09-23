import { useState, useEffect, FormEvent } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

interface Answer {
  id: number;
  question_id: number;
  author_id: number;
  body: string;
  created_at: string;
  author_name: string;
  vote_count: number;
  voted_by_me?: boolean;
}

interface Question {
  id: number;
  title: string;
  body: string;
  subject: string;
  created_at: string;
  author_id: number;
  author_name: string;
  answer_count: number;
}

export default function QuestionDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [question, setQuestion] = useState<Question | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [loading, setLoading] = useState(true);
  const [newAnswer, setNewAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const data = await api.get<{ question: Question; answers: Answer[] }>(`/api/questions/${id}`);
      setQuestion(data.question);
      setAnswers(data.answers);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchDetail();
  }, [id]);

  const submitAnswer = async (e: FormEvent) => {
    e.preventDefault();
    if (!newAnswer.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      await api.post(`/api/questions/${id}/answers`, { body: newAnswer.trim() });
      setNewAnswer('');
      await fetchDetail();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleVote = async (answerId: number) => {
    try {
      const result = await api.post<{ vote_count: number; voted: boolean }>(`/api/answers/${answerId}/vote`, {});
      setAnswers(prev => prev.map(a =>
        a.id === answerId ? { ...a, vote_count: result.vote_count, voted_by_me: result.voted } : a
      ));
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) return <div className="text-center py-12 text-gray-400">Loading…</div>;
  if (!question) return <div className="text-center py-12"><p>{error || 'Question not found'}</p><Link to="/" className="text-indigo-600 text-sm">← Back</Link></div>;

  return (
    <div>
      <Link to="/" className="text-sm text-indigo-600 hover:underline">← Back to feed</Link>

      <div className="mt-4 bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-xl font-bold text-gray-900">{question.title}</h1>
          <span className="flex-shrink-0 text-xs font-medium px-2 py-1 rounded-full bg-indigo-50 text-indigo-700">{question.subject}</span>
        </div>
        <p className="mt-3 text-gray-700 whitespace-pre-wrap">{question.body}</p>
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100 text-sm text-gray-500">
          <Link to={`/users/${question.author_id}`} className="font-medium text-indigo-600 hover:underline">{question.author_name}</Link>
          <span>{new Date(question.created_at).toLocaleString()}</span>
        </div>
      </div>

      <h2 className="mt-8 mb-4 text-lg font-semibold text-gray-900">{answers.length} Answer{answers.length !== 1 ? 's' : ''}</h2>

      {answers.length === 0 && <p className="text-gray-500 text-sm">No answers yet. Be the first to help!</p>}

      <div className="space-y-3">
        {answers.map(a => (
          <div key={a.id} className="bg-white border border-gray-200 rounded-xl p-4 flex gap-4">
            <button
              onClick={() => toggleVote(a.id)}
              disabled={!user}
              className={`flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg border text-sm font-bold transition ${
                a.voted_by_me
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-indigo-50 hover:text-indigo-600'
              } ${!user ? 'opacity-40 cursor-not-allowed' : ''}`}
              title={user ? (a.voted_by_me ? 'Remove vote' : 'Upvote') : 'Login to vote'}
            >
              ▲
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-gray-800 whitespace-pre-wrap">{a.body}</p>
              <div className="flex items-center gap-3 mt-3 text-xs text-gray-400">
                <Link to={`/users/${a.author_id}`} className="font-medium text-gray-600 hover:text-indigo-600">{a.author_name}</Link>
                <span>{new Date(a.created_at).toLocaleString()}</span>
                <span>{a.vote_count} vote{a.vote_count !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {user ? (
        <form onSubmit={submitAnswer} className="mt-6 bg-white border border-gray-200 rounded-xl p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Your answer</label>
          <textarea
            value={newAnswer}
            onChange={(e) => setNewAnswer(e.target.value)}
            rows={4}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
            placeholder="Share what you know…"
          />
          {error && <div className="text-sm text-red-600 mt-2">{error}</div>}
          <button
            type="submit"
            disabled={submitting || !newAnswer.trim()}
            className="mt-3 bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-50"
          >
            {submitting ? 'Posting…' : 'Post answer'}
          </button>
        </form>
      ) : (
        <div className="mt-6 text-center text-sm text-gray-500">
          <Link to="/login" className="text-indigo-600 hover:underline">Sign in</Link> to add an answer.
        </div>
      )}
    </div>
  );
}
