import React from 'react';

interface Tag {
  id: string;
  name: string;
  color?: string;
}

interface TaggingControlsProps {
  allTags: Tag[];
  selectedTagId: string;
  onTagChange: (tagId: string) => void;
  onAddTag: () => void;
  selectedCount: number;
  tagging?: boolean;
  tagError?: string | null;
  tagSuccess?: string | null;
}

const TaggingControls: React.FC<TaggingControlsProps> = ({
  allTags,
  selectedTagId,
  onTagChange,
  onAddTag,
  selectedCount,
  tagging,
  tagError,
  tagSuccess,
}) => (
  <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center mb-2 bg-gray-50 px-3 py-2 rounded shadow">
    <span className="text-sm">{selectedCount} selected</span>
    <select
      className="border px-2 py-1 rounded text-xs w-full sm:w-auto"
      value={selectedTagId}
      onChange={e => onTagChange(e.target.value)}
    >
      <option value="">Add tag...</option>
      {allTags.map(tag => (
        <option key={tag.id} value={tag.id} style={{ background: tag.color, color: '#222' }}>{tag.name}</option>
      ))}
    </select>
    <button
      className="px-3 py-1 bg-green-600 text-white rounded text-xs font-semibold disabled:opacity-50 w-full sm:w-auto"
      onClick={onAddTag}
      disabled={tagging || !selectedTagId}
    >
      Add Tag
    </button>
    {tagError && <span className="text-red-600 text-sm">{tagError}</span>}
    {tagSuccess && <span className="text-green-600 text-sm">{tagSuccess}</span>}
  </div>
);

export default TaggingControls; 