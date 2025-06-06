import React from 'react';

interface Tag {
  id: string;
  name: string;
  color?: string;
}

interface TagFilterPillsProps {
  allTags: Tag[];
  tagFilters: string[];
  onToggleTag: (tagName: string) => void;
  onClear?: () => void;
}

const TagFilterPills: React.FC<TagFilterPillsProps> = ({ allTags, tagFilters, onToggleTag, onClear }) => (
  <div className="flex flex-wrap gap-1 sm:gap-2 items-center mb-4">
    {allTags.map(tag => (
      <button
        key={tag.id}
        className={`px-2 py-1 rounded-full text-xs font-semibold border shadow-sm transition-all ${tagFilters.includes(tag.name) ? 'bg-indigo-700 text-white border-indigo-800 scale-110' : 'bg-indigo-100 text-indigo-800 border-indigo-200 hover:bg-indigo-200'}`}
        onClick={() => onToggleTag(tag.name)}
      >
        {tag.name}
      </button>
    ))}
    {tagFilters.length > 0 && onClear && (
      <button
        className="px-2 py-1 rounded-full text-xs font-semibold border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 ml-1 sm:ml-2"
        onClick={onClear}
      >
        Clear
      </button>
    )}
  </div>
);

export default TagFilterPills; 