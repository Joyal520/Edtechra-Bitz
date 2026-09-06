// ============================================================================
// EDTECHRA ASSESSMENT BUILDER 2.0: BRAND KIT EDITOR
// Institution branding, logos, watermark, and institutional headers
// ============================================================================

import React from 'react';
import { Image as ImageIcon, Building2 } from 'lucide-react';
import { BrandKitConfig } from '../../shared/ExamSchema';

interface BrandKitEditorProps {
  brandKit: BrandKitConfig;
  onChangeBrandKit: (updated: BrandKitConfig) => void;
}

export const BrandKitEditor: React.FC<BrandKitEditorProps> = ({
  brandKit,
  onChangeBrandKit
}) => {
  const handleToggleEnabled = (enabled: boolean) => {
    onChangeBrandKit({ ...brandKit, enabled });
  };

  const handleUpdate = (updates: Partial<BrandKitConfig>) => {
    onChangeBrandKit({ ...brandKit, ...updates });
  };

  return (
    <div className="space-y-6 text-white p-1">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-black text-white flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-400" />
            Institution Brand Kit
          </h3>
          <p className="text-xs text-slate-400">Apply institutional logo, watermark, and footer to this assessment.</p>
        </div>

        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={brandKit.enabled}
            onChange={(e) => handleToggleEnabled(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-slate-800 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
        </label>
      </div>

      {brandKit.enabled ? (
        <div className="space-y-4 pt-2 border-t border-blue-900/60 animate-fadeIn">
          {/* Institution Name */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-300">Institution / School Name</label>
            <input
              type="text"
              value={brandKit.institutionName || ''}
              onChange={(e) => handleUpdate({ institutionName: e.target.value })}
              placeholder="e.g. Cambridge International Academy"
              className="w-full px-3 py-2 bg-[#070e1f] border border-blue-800/70 rounded-xl text-xs font-semibold text-white focus:outline-hidden focus:border-indigo-400"
            />
          </div>

          {/* Logo URL */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
              Logo URL (or Asset)
            </label>
            <input
              type="url"
              value={brandKit.logoUrl || ''}
              onChange={(e) => handleUpdate({ logoUrl: e.target.value })}
              placeholder="https://example.com/school-logo.png"
              className="w-full px-3 py-2 bg-[#070e1f] border border-blue-800/70 rounded-xl text-xs font-semibold text-white focus:outline-hidden focus:border-indigo-400"
            />
            {brandKit.logoUrl && (
              <div className="p-2 bg-[#070e1f] rounded-xl border border-blue-900 flex items-center gap-3">
                <img src={brandKit.logoUrl} alt="Logo preview" className="w-8 h-8 object-contain rounded-md" />
                <span className="text-[11px] text-slate-400 truncate">{brandKit.logoUrl}</span>
              </div>
            )}
          </div>

          {/* Custom Footer */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-300">Assessment Footer Text</label>
            <input
              type="text"
              value={brandKit.footerText || ''}
              onChange={(e) => handleUpdate({ footerText: e.target.value })}
              placeholder="e.g. Confidential © 2026 EdTechra Partner School"
              className="w-full px-3 py-2 bg-[#070e1f] border border-blue-800/70 rounded-xl text-xs font-semibold text-white focus:outline-hidden focus:border-indigo-400"
            />
          </div>

          {/* Watermark Toggle */}
          <div className="p-3 rounded-2xl bg-[#070e1f] border border-blue-900/60 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-200">Subtle Paper Watermark</span>
              <p className="text-[10px] text-slate-400">Renders translucent institution watermark across student papers.</p>
            </div>
            <input
              type="checkbox"
              checked={brandKit.watermark !== false}
              onChange={(e) => handleUpdate({ watermark: e.target.checked })}
              className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
            />
          </div>
        </div>
      ) : (
        <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-blue-900/80 rounded-2xl">
          Enable Brand Kit above to apply institutional crest, official header, and watermark to this assessment.
        </div>
      )}
    </div>
  );
};
