import React from 'react';
import {
  Search,
  X,
  FileText,
  Presentation,
  Globe,
  RotateCcw
} from 'lucide-react';
import { LibraryFilterState } from '@/types/library';

export const SUBJECT_OPTIONS = [
  'All Subjects',
  'English & Grammar',
  'Science & Nature',
  'Mathematics',
  'ICT & Technology',
  'Artificial Intelligence',
  'Reading & Literature',
  'Social Studies & History',
  'General Knowledge',
  'Other'
];

export const CATEGORY_OPTIONS = [
  'All Categories',
  'Presentation',
  'Study Guide',
  'Worksheet',
  'Reference Material',
  'Lesson Notes',
  'Exam Preparation',
  'Web / Blogs',
  'Other'
];

export const GRADE_OPTIONS = [
  'All Grades',
  'Primary (Grades 1-5)',
  'Middle School (Grades 6-8)',
  'High School (Grades 9-10)',
  'Senior Secondary (Grades 11-12)',
  'College & Higher Ed'
];

interface LibraryFiltersProps {
  filters: LibraryFilterState;
  onChange: (updated: LibraryFilterState) => void;
  totalCount: number;
}

export const LibraryFilters: React.FC<LibraryFiltersProps> = ({
  filters,
  onChange,
  totalCount
}) => {
  const isFiltered =
    Boolean(filters.search.trim()) ||
    (filters.subject !== 'all' && filters.subject !== 'All Subjects') ||
    (filters.category !== 'all' && filters.category !== 'All Categories') ||
    (filters.grade_level !== 'all' && filters.grade_level !== 'All Grades') ||
    filters.file_type !== 'all';

  const handleClearFilters = () => {
    onChange({
      search: '',
      subject: 'all',
      category: 'all',
      grade_level: 'all',
      file_type: 'all'
    });
  };

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-xs space-y-4">
      {/* Top Row: Search Input + File Type Toggle */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search Bar */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={filters.search}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
            placeholder="Search by title, description, subject, or author..."
            className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#026fc3] focus:bg-white transition-all"
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => onChange({ ...filters, search: '' })}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* File Type Pill Toggle */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200/80 shrink-0 self-start md:self-auto">
          <button
            type="button"
            onClick={() => onChange({ ...filters, file_type: 'all' })}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
              filters.file_type === 'all'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Files
          </button>

          <button
            type="button"
            onClick={() => onChange({ ...filters, file_type: 'pdf' })}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
              filters.file_type === 'pdf'
                ? 'bg-rose-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-rose-700'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>PDFs</span>
          </button>

          <button
            type="button"
            onClick={() => onChange({ ...filters, file_type: 'pptx' })}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
              filters.file_type === 'pptx'
                ? 'bg-amber-500 text-white shadow-2xs'
                : 'text-slate-600 hover:text-amber-700'
            }`}
          >
            <Presentation className="w-3.5 h-3.5" />
            <span>PowerPoint</span>
          </button>

          <button
            type="button"
            onClick={() => onChange({ ...filters, file_type: 'web_blog' })}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
              filters.file_type === 'web_blog'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-emerald-700'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Web / Blogs</span>
          </button>
        </div>
      </div>

      {/* Bottom Row: Selectors (Subject, Category, Grade) + Clear Button */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-100">
        <div className="flex flex-wrap items-center gap-2">
          {/* Subject Filter */}
          <div className="relative">
            <select
              value={filters.subject}
              onChange={(e) => onChange({ ...filters, subject: e.target.value })}
              className="pl-3 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#026fc3] cursor-pointer"
            >
              {SUBJECT_OPTIONS.map((sub) => (
                <option key={sub} value={sub === 'All Subjects' ? 'all' : sub}>
                  {sub}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div className="relative">
            <select
              value={filters.category}
              onChange={(e) => onChange({ ...filters, category: e.target.value })}
              className="pl-3 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#026fc3] cursor-pointer"
            >
              {CATEGORY_OPTIONS.map((cat) => (
                <option key={cat} value={cat === 'All Categories' ? 'all' : cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Grade Level Filter */}
          <div className="relative">
            <select
              value={filters.grade_level}
              onChange={(e) => onChange({ ...filters, grade_level: e.target.value })}
              className="pl-3 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#026fc3] cursor-pointer"
            >
              {GRADE_OPTIONS.map((grade) => (
                <option key={grade} value={grade === 'All Grades' ? 'all' : grade}>
                  {grade}
                </option>
              ))}
            </select>
          </div>

          {/* Clear Filters Button */}
          {isFiltered && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Clear Filters</span>
            </button>
          )}
        </div>

        {/* Results Counter */}
        <div className="text-xs font-bold text-slate-400">
          Showing <span className="font-black text-slate-800">{totalCount}</span> {totalCount === 1 ? 'resource' : 'resources'}
        </div>
      </div>
    </div>
  );
};
