import { useState, useEffect, FormEvent } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

interface UserProfile {
  id: number;
  email: string;
  display_name: string;
  bio: string;
  created_at: string;
  subjects: { subject: string; role: string }[];
}

interface RecentQuestion {
  id: number;
  title: string;
  subject: string;
  created_at: string;
  answer_count: number;
}

export default function Profile() {
  const { id: paramId } = useParams<{ id: string }>();
  const { user: me, refresh } = useAuth();
  const isOwn = paramId === String(me?.id);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [recent, setRecent] = useState<RecentQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Edit state
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [allSubjects, setAllSubjects] = useState<{ name: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editError, setEditError] = useState('');

  useEffect(() => {
    const targetId = paramId || me?.id;
    if (!targetId) return;
    setLoading(true);
    api.get<{ user: UserProfile; recent_questions: RecentQuestion[] }>(`/api/users/${targetId}`)
      .then(d => {
        setProfile(d.user);
        setRecent(d.recent_questions || []);
        setDisplayName(d.user.display_name);
        setBio(d.user.bio || '');
        setSelectedSubjects(d.user.subjects?.map(s => s.subject) || []);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));

    api.get<{ subjects: { name: string }[] }>('/api/subjects').then(d => setAllSubjects(d.subjects)).catch(() => {});
  }, [paramId, me?.id]);

  const toggleSubject = (name: string) => {
    setSelectedSubjects(prev =>
      prev.includes(name) ? prev.filter(s => s !== name) : [...prev, name]
    );
  };

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setEditError('');
    setSaved(false);
    try {
      await api.put('/api/users/me', { display_name: displayName, bio });
      await api.put('/api/users/me/subjects', { subjects: selectedSubjects });
      setSaved(true);
      await refresh();
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setEditError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-center py-12 text-gray-400">Loading…</div>;
  if (!profile) return <div className="text-center py-12"><p>{error || 'User not found'}</p><Link to="/" className="text-indigo-600 text-sm">← Back</Link></div>;

  return (
    <div>
      <Link to="/" className="text-sm text-indigo-600 hover:underline">← Back to feed</Link>

      <div className="mt-4 bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center text-xl font-bold text-indigo-700">
            {profile.display_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{profile.display_name}</h1>
            <p className="text-sm text-gray-500">Joined {new Date(profile.created_at).toLocaleDateString()}</p>
          </div>
        </div>
        {profile.bio && <p className="mt-4 text-gray-700">{profile.bio}</p>}

        <div className="mt-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Subjects</h3>
          <div className="flex flex-wrap gap-2">
            {profile.subjects.length === 0 && <span className="text-sm text-gray-400">No subjects listed</span>}
            {profile.subjects.map((s, i) => (
              <span key={i} className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                s.role === 'expert' ? 'bg-emerald-50 text-emerald-700' : 'bg-indigo-50 text-indigo-700'
              }`}>
                {s.subject} {s.role === 'expert' && '★'}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Edit section (own profile only) */}
      {isOwn && (
        <div className="mt-6 bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Edit profile</h2>
          <form onSubmit={saveProfile} className="space-y-4">
            {editError && <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{editError}</div>}
            {saved && <div className="text-sm text-emerald-600 bg-emerald-50 px-3 py-2 rounded">Profile updated!</div>}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Display name</label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
                minLength={2}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
                placeholder="Tell the community about yourself…"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Subjects</label>
              <div className="flex flex-wrap gap-2">
                {allSubjects.map(s => (
                  <button
                    key={s.name}
                    type="button"
                    onClick={() => toggleSubject(s.name)}
                    className={`text-xs font-medium px-3 py-1.5 rounded-full border transition ${
                      selectedSubjects.includes(s.name)
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-300'
                    }`}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </form>
        </div>
      )}

      {/* Recent questions */}
      <div className="mt-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Recent questions</h2>
        {recent.length === 0 ? (
          <p className="text-sm text-gray-500">No questions yet.</p>
        ) : (
          <div className="space-y-2">
            {recent.map(q => (
              <Link
                key={q.id}
                to={`/questions/${q.id}`}
                className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3 hover:shadow-sm transition"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{q.title}</p>
                  <span className="text-xs text-gray-400">{new Date(q.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">{q.subject}</span>
                  <span className="text-xs text-gray-400">{q.answer_count} ans</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
