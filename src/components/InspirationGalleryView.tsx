import React, { useState, useMemo } from 'react';
import {
  InspirationGalleryItem,
  UserDesignSelections,
} from '../types/makan';
import {
  INSPIRATION_GALLERY,
  ROOM_TYPES,
  DESIGN_STYLES,
  QUALITY_TIERS,
} from '../data/catalogData';
import { getStylePreviewDataUrl } from '../utils/proceduralRoomRenderer';
import { Sparkles, Eye, X, Check } from 'lucide-react';

interface InspirationGalleryViewProps {
  onApplyPresetToUserPhoto: (preset: Partial<UserDesignSelections>, titleAr: string) => void;
}

export const InspirationGalleryView: React.FC<InspirationGalleryViewProps> = ({
  onApplyPresetToUserPhoto,
}) => {
  const [roomFilter, setRoomFilter] = useState<string>('all');
  const [styleFilter, setStyleFilter] = useState<string>('all');
  const [colorFilter, setColorFilter] = useState<string>('all');
  const [floorFilter, setFloorFilter] = useState<string>('all');
  const [luxuryFilter, setLuxuryFilter] = useState<string>('all');
  const [usageFilter, setUsageFilter] = useState<string>('all');
  const [previewItem, setPreviewItem] = useState<InspirationGalleryItem | null>(null);

  const filteredItems = useMemo(() => {
    return INSPIRATION_GALLERY.filter((item) => {
      if (roomFilter !== 'all' && item.roomType !== roomFilter) return false;
      if (styleFilter !== 'all' && item.styleId !== styleFilter) return false;
      if (colorFilter !== 'all' && item.colorFamilyAr !== colorFilter) return false;
      if (floorFilter !== 'all' && item.floorTypeAr !== floorFilter) return false;
      if (luxuryFilter !== 'all' && item.luxuryLevel !== luxuryFilter) return false;
      if (usageFilter !== 'all' && item.usageTypeAr !== usageFilter) return false;
      return true;
    });
  }, [roomFilter, styleFilter, colorFilter, floorFilter, luxuryFilter, usageFilter]);

  return (
    <div className="space-y-6">
      {/* Header & Multi-Filter Bar */}
      <div className="bg-[#141418] border border-white/10 rounded-xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-bold text-[#F5F2EB]">معرض الإلهام والتصميمات المرجعية</h2>
            <p className="text-xs text-[#A6A29A] mt-1">
              تصفح التصميمات حسب الغرفة والنمط والخامة، وطبّق أي فكرة مرجعية مباشرة على صورتك الأصلية مع الحفاظ على هندسة مكانك.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setRoomFilter('all');
              setStyleFilter('all');
              setColorFilter('all');
              setFloorFilter('all');
              setLuxuryFilter('all');
              setUsageFilter('all');
            }}
            className="px-3 py-1.5 text-xs bg-[#0B0B0E] hover:bg-white/5 text-[#A6A29A] hover:text-white border border-white/10 rounded-lg transition-colors"
          >
            إعادة ضبط الفلاتر
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div>
            <label className="block text-[11px] text-[#A6A29A] mb-1">نوع الغرفة</label>
            <select
              value={roomFilter}
              onChange={(e) => setRoomFilter(e.target.value)}
              className="w-full bg-[#0B0B0E] border border-white/15 rounded-lg px-2.5 py-2 text-xs text-[#F5F2EB] outline-none focus:border-[#C6A355]"
            >
              <option value="all">جميع الغرف</option>
              {ROOM_TYPES.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nameAr}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] text-[#A6A29A] mb-1">نمط التصميم</label>
            <select
              value={styleFilter}
              onChange={(e) => setStyleFilter(e.target.value)}
              className="w-full bg-[#0B0B0E] border border-white/15 rounded-lg px-2.5 py-2 text-xs text-[#F5F2EB] outline-none focus:border-[#C6A355]"
            >
              <option value="all">جميع الأنماط</option>
              {DESIGN_STYLES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nameAr}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] text-[#A6A29A] mb-1">مجموعة الألوان</label>
            <select
              value={colorFilter}
              onChange={(e) => setColorFilter(e.target.value)}
              className="w-full bg-[#0B0B0E] border border-white/15 rounded-lg px-2.5 py-2 text-xs text-[#F5F2EB] outline-none focus:border-[#C6A355]"
            >
              <option value="all">كل الألوان</option>
              <option value="بيج وجريج">بيج وجريج</option>
              <option value="أبيض وأوف وايت">أبيض وأوف وايت</option>
              <option value="رمادي وأسود">رمادي وأسود</option>
              <option value="بني ودافئ">بني ودافئ</option>
              <option value="أزرق وأخضر">أزرق وأخضر</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] text-[#A6A29A] mb-1">نوع الأرضية</label>
            <select
              value={floorFilter}
              onChange={(e) => setFloorFilter(e.target.value)}
              className="w-full bg-[#0B0B0E] border border-white/15 rounded-lg px-2.5 py-2 text-xs text-[#F5F2EB] outline-none focus:border-[#C6A355]"
            >
              <option value="all">كل الأرضيات</option>
              <option value="الرخام">الرخام</option>
              <option value="البورسلين">البورسلين</option>
              <option value="الباركيه">الباركيه</option>
              <option value="الميكروسيمنت">الميكروسيمنت</option>
              <option value="السيراميك">السيراميك</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] text-[#A6A29A] mb-1">مستوى الفخامة</label>
            <select
              value={luxuryFilter}
              onChange={(e) => setLuxuryFilter(e.target.value)}
              className="w-full bg-[#0B0B0E] border border-white/15 rounded-lg px-2.5 py-2 text-xs text-[#F5F2EB] outline-none focus:border-[#C6A355]"
            >
              <option value="all">كل المستويات</option>
              {QUALITY_TIERS.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.nameAr}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] text-[#A6A29A] mb-1">نوع الاستخدام</label>
            <select
              value={usageFilter}
              onChange={(e) => setUsageFilter(e.target.value)}
              className="w-full bg-[#0B0B0E] border border-white/15 rounded-lg px-2.5 py-2 text-xs text-[#F5F2EB] outline-none focus:border-[#C6A355]"
            >
              <option value="all">سكني وتجاري</option>
              <option value="سكني">سكني</option>
              <option value="تجاري وإداري">تجاري وإداري</option>
            </select>
          </div>
        </div>
      </div>

      {/* Gallery Cards Grid */}
      {filteredItems.length === 0 ? (
        <div className="bg-[#141418] border border-white/10 rounded-xl p-10 text-center">
          <p className="text-sm text-[#A6A29A]">لا توجد تصميمات مطابقة لهذه الفلاتر المجتمعة.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {filteredItems.map((item) => {
            const imgUrl = getStylePreviewDataUrl(item.styleId);
            const styleObj = DESIGN_STYLES.find((s) => s.id === item.styleId);
            const roomObj = ROOM_TYPES.find((r) => r.id === item.roomType);

            return (
              <div
                key={item.id}
                className="bg-[#141418] border border-white/10 hover:border-[#C6A355]/50 rounded-xl overflow-hidden flex flex-col justify-between transition-colors"
              >
                <div>
                  <div className="relative h-48 bg-[#0B0B0E] overflow-hidden group">
                    <img
                      src={imgUrl}
                      alt={item.titleAr}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                    <button
                      type="button"
                      onClick={() => setPreviewItem(item)}
                      className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-xs font-bold text-white"
                    >
                      <Eye className="w-4 h-4 text-[#C6A355]" />
                      <span>معاينة التفاصيل</span>
                    </button>
                  </div>

                  <div className="p-4">
                    <div className="text-xs text-[#A6A29A] mb-1">
                      <span>{roomObj?.nameAr}</span>
                      <span aria-hidden="true"> · </span>
                      <span className="text-[#C6A355]">{styleObj?.nameAr}</span>
                      <span aria-hidden="true"> · </span>
                      <span>{item.floorTypeAr}</span>
                    </div>
                    <h3 className="text-sm font-bold text-[#F5F2EB]">{item.titleAr}</h3>
                    <p className="text-xs text-[#A6A29A] mt-1.5 line-clamp-2">{item.descriptionAr}</p>
                  </div>
                </div>

                <div className="p-4 pt-0 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onApplyPresetToUserPhoto(item.presetSelections, item.titleAr)}
                    className="flex-1 py-2 px-3 bg-[#C6A355] hover:bg-[#d4b265] text-[#0B0B0E] font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>طبّق الفكرة على صورتي</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewItem(item)}
                    className="p-2 bg-[#0B0B0E] hover:bg-white/5 text-[#EAE4DA] border border-white/10 rounded-lg"
                    title="معاينة"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Preview */}
      {previewItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#141418] border border-white/15 rounded-2xl max-w-2xl w-full overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h3 className="text-base font-bold text-[#F5F2EB]">{previewItem.titleAr}</h3>
              <button
                type="button"
                onClick={() => setPreviewItem(null)}
                className="p-1.5 text-[#A6A29A] hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <img
                src={getStylePreviewDataUrl(previewItem.styleId)}
                alt={previewItem.titleAr}
                referrerPolicy="no-referrer"
                className="w-full h-72 object-cover rounded-xl border border-white/10"
              />
              <p className="text-xs text-[#EAE4DA] leading-relaxed">{previewItem.descriptionAr}</p>
              <div className="text-xs text-[#A6A29A]">
                ملاحظة هامة: عند الضغط على «تطبيق الفكرة على صورتي الأصلية»، لن يتم استبدال صورة غرفتك بهذه الصورة، بل سيتم نقل الألوان والخامات والنمط المختار وتطبيقه على صورتك الأصلية مباشرة.
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setPreviewItem(null)}
                  className="px-4 py-2 bg-white/5 text-xs text-[#A6A29A] rounded-lg"
                >
                  إغلاق
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onApplyPresetToUserPhoto(previewItem.presetSelections, previewItem.titleAr);
                    setPreviewItem(null);
                  }}
                  className="px-5 py-2 bg-[#C6A355] text-[#0B0B0E] font-bold text-xs rounded-lg flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>تطبيق الفكرة على صورتي الأصلية</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
