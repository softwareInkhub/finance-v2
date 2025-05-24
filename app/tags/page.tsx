'use client'
import { useEffect, useState } from 'react';

interface Tag {
  id: string;
  name: string;
  color: string;
  createdAt: string;
}

export default function TagsPage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newTag, setNewTag] = useState({ name: '', color: '#60a5fa' });
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('#60a5fa');

  const fetchTags = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/tags');
      const data = await res.json();
      if (Array.isArray(data)) {
        setTags(data);
      } else {
        setTags([]);
        setError(data.error || 'Failed to fetch tags');
      }
    } catch {
      setTags([]);
      setError('Failed to fetch tags');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTags(); }, []);

  const handleAddTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTag.name.trim()) return;
    try {
      const res = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTag),
      });
      if (!res.ok) throw new Error('Failed to add tag');
      setNewTag({ name: '', color: '#60a5fa' });
      fetchTags();
    } catch {
      setError('Failed to add tag');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this tag?')) return;
    try {
      await fetch('/api/tags', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      fetchTags();
    } catch {
      setError('Failed to delete tag');
    }
  };

  const startEdit = (tag: Tag) => {
    setEditingTag(tag);
    setEditName(tag.name);
    setEditColor(tag.color);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTag) return;
    try {
      await fetch('/api/tags', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingTag.id, name: editName, color: editColor }),
      });
      setEditingTag(null);
      fetchTags();
    } catch {
      setError('Failed to update tag');
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Tag Management</h1>
      <form onSubmit={handleAddTag} className="flex gap-2 mb-6">
        <input
          type="text"
          placeholder="Tag name"
          className="border px-2 py-1 rounded w-40"
          value={newTag.name}
          onChange={e => setNewTag({ ...newTag, name: e.target.value })}
        />
        <input
          type="color"
          value={newTag.color}
          onChange={e => setNewTag({ ...newTag, color: e.target.value })}
        />
        <button type="submit" className="bg-blue-600 text-white px-4 py-1 rounded">Add Tag</button>
      </form>
      {error && <div className="text-red-600 mb-2">{error}</div>}
      {loading ? (
        <div>Loading...</div>
      ) : (
        <table className="min-w-full border text-sm">
          <thead>
            <tr>
              <th className="border px-2 py-1">Name</th>
              <th className="border px-2 py-1">Color</th>
              <th className="border px-2 py-1">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tags.map(tag => (
              <tr key={tag.id}>
                <td className="border px-2 py-1">{editingTag?.id === tag.id ? (
                  <form onSubmit={handleEdit} className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      className="border px-1 py-0.5 rounded"
                    />
                  </form>
                ) : tag.name}</td>
                <td className="border px-2 py-1">
                  {editingTag?.id === tag.id ? (
                    <input type="color" value={editColor} onChange={e => setEditColor(e.target.value)} />
                  ) : (
                    <span className="inline-block w-6 h-6 rounded" style={{ background: tag.color }}></span>
                  )}
                </td>
                <td className="border px-2 py-1">
                  {editingTag?.id === tag.id ? (
                    <>
                      <button className="text-green-600 mr-2" onClick={handleEdit}>Save</button>
                      <button className="text-gray-500" onClick={() => setEditingTag(null)}>Cancel</button>
                    </>
                  ) : (
                    <>
                      <button className="text-blue-600 mr-2" onClick={() => startEdit(tag)}>Edit</button>
                      <button className="text-red-600" onClick={() => handleDelete(tag.id)}>Delete</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
} 