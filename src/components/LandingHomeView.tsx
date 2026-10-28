import React, { useMemo } from 'react';
import {
  MakanProject,
  StyleId,
} from '../types/makan';
import {
  DESIGN_STYLES,
  ROOM_TYPES,
} from '../data/catalogData';
import {
  renderProceduralRoomToDataUrl,
  getStylePreviewDataUrl,
} from '../utils/proceduralRoomRenderer';
import { BeforeAfterSlider } from './BeforeAfterSlider';
import {
  Upload,
  Sparkles,
  Sliders,
  Layers,
  Calculator,
  FolderOpen,
  ShieldCheck,
  ArrowLeft,
} from 'lucide-react';

interface LandingHomeViewProps {
  projectsCount: number;
  savedProjects: MakanProject[];
  onStartStudioWithUpload: () => void;
  onStartWithSampleState: (state: 'unfinished_brick' | 'semi_plaster' | 'old_room') => void;
  onStartWithStyle: (styleId: StyleId) => void;
  onOpenGallery: () => void;
  onOpenBOQCalculator: () => void;
  onOpenSavedProject: (projectId: string) => void;
}

export const LandingHomeView: React.FC<LandingHomeViewProps> = ({
  projectsCount,
  savedProjects,
  onStartStudioWithUpload,
  onStartWithSampleState,
  onStartWithStyle,
  onOpenGallery,
  onOpenBOQCalculator,
  onOpenSavedProject,
}) => {
  const heroBeforeUrl = useMemo(
    () =>
      renderProceduralRoomToDataUrl({
        width: 960,
        height: 560,
        state: 'unfinished_brick',
        roomType: 'living_room',
      }),
    []
  );

  const heroAfterUrl = useMemo(
    () =>
      renderProceduralRoomToDataUrl({
        width: 960,
        height: 560,
        state: 'designed',
        roomType: 'living_room',
        wallHex: '#E8DFD1',
        wallFinishPattern: 'neoclassic_molding',
        floorPrimaryHex: '#EFE7DA',
        floorSecondaryHex: '#C6A87D',
        floorPattern: 'marble',
        lightingTemp: '3000K',
        hasGypsumCove: true,
        hasSpotlights: true,
        hasChandelier: true,
      }),
    []
  );

  return (
    <div className="space-y-16 pb-12">
      {/* 1. HERO SECTION (1440px architectural split with Before/After focal anchor) */}
      <section className="pt-4 md:pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Right Column: Brand Proposition & Immediate Upload Action */}
          <div className="lg:col-span-5 flex flex-col justify-between bg-[#141418] border border-white/10 rounded-2xl p-6 md:p-8">
            <div className="space-y-5">
              <div className="text-xs text-[#C6A355] font-semibold">
                منصة التصميم الداخلي وحساب تكاليف التشطيب في مصر
              </div>

              <h1
                className="font-bold text-[#F5F2EB] leading-tight"
                style={{ fontSize: 'clamp(2.1rem, 3.5vw, 3.25rem)' }}
              >
                تخيّل مساحتك قبل ما تغيّرها.
              </h1>

              <p className="text-sm md:text-base text-[#A6A29A] leading-relaxed">
                ارفع صورة لشقتك أو غرفتك — سواء كانت على الطوب الأحمر، نصف تشطيب، أو مفروشة — وجرّب الألوان والرخام والبورسلين والباركيه والإضاءة والأثاث باختيارات مرئية جاهزة، مع الحفاظ التام على الأبواب والشبابيك وهندسة مكانك.
              </p>

              {/* Primary CTA */}
              <div className="pt-2 space-y-3">
                <button
                  type="button"
                  onClick={onStartStudioWithUpload}
                  className="w-full py-3.5 px-6 bg-[#C6A355] hover:bg-[#d4b265] text-[#0B0B0E] font-bold text-sm rounded-xl transition-colors flex items-center justify-center gap-2.5 shadow-lg"
                >
                  <Upload className="w-4 h-4" />
                  <span>ارفع صورة مكانك وابدأ التصميم الآن</span>
                </button>

                <div className="pt-2">
                  <div className="text-xs text-[#A6A29A] mb-2">
                    أو ابدأ فوراً بتجربة حية على حالة مكان مشابهة لمكانك:
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => onStartWithSampleState('unfinished_brick')}
                      className="py-2 px-2.5 bg-[#0B0B0E] hover:bg-white/5 border border-white/10 rounded-lg text-xs text-[#EAE4DA] font-medium transition-colors"
                    >
                      على الطوب الأحمر
                    </button>
                    <button
                      type="button"
                      onClick={() => onStartWithSampleState('semi_plaster')}
                      className="py-2 px-2.5 bg-[#0B0B0E] hover:bg-white/5 border border-white/10 rounded-lg text-xs text-[#EAE4DA] font-medium transition-colors"
                    >
                      شقة على المحارة
                    </button>
                    <button
                      type="button"
                      onClick={() => onStartWithSampleState('old_room')}
                      className="py-2 px-2.5 bg-[#0B0B0E] hover:bg-white/5 border border-white/10 rounded-lg text-xs text-[#EAE4DA] font-medium transition-colors"
                    >
                      غرفة قديمة للتجديد
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-5 border-t border-white/10 text-xs text-[#A6A29A] flex items-center justify-between">
              <span>أنت صاحب القرار · بدون كتابة أوامر معقدة</span>
              <span className="text-[#C6A355] font-semibold">13 نوع مساحة · 14 نمط تصميم</span>
            </div>
          </div>

          {/* Left Column: Interactive Before & After Showcase */}
          <div className="lg:col-span-7 bg-[#141418] border border-white/10 rounded-2xl p-4 md:p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[#F5F2EB]">
                مقارنة تفاعلية حية (قبل وبعد التشطيب مع ثبات الفتحات المعمارية)
              </span>
              <span className="text-xs text-[#C6A355]">اسحب المؤشر للمقارنة ⇄</span>
            </div>

            <BeforeAfterSlider
              beforeUrl={heroBeforeUrl}
              afterUrl={heroAfterUrl}
              beforeLabelAr="قبل: غرفة على الطوب الأحمر والمحارة"
              afterLabelAr="بعد: تشطيب نيو كلاسيك (رخام كريما مارفيل + بانوهات)"
              preservedElementsAr={['ثبات فتحة الباب الجانبي', 'ثبات الشباك ومصدر الإضاءة', 'ثبات أبعاد الغرفة']}
            />
          </div>
        </div>
      </section>

      {/* 2. HOW THE PLATFORM WORKS & ELEMENT CONTROL (Sections 5, 8, 14) */}
      <section className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-[#F5F2EB]">
              كيف تعمل منصة «مكان AI»؟ تحكم كامل في كل عنصر على حدة
            </h2>
            <p className="text-sm text-[#A6A29A] mt-1">
              الذكاء الاصطناعي لا يغير عناصر مكانك من تلقاء نفسه؛ أنت من يختار تغيير عنصر واحد فقط أو الغرفة بالكامل.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-[#141418] border border-white/10 rounded-xl p-5 space-y-2.5">
            <div className="text-xs font-mono text-[#C6A355] font-bold">01. ارفع صورة مكانك</div>
            <h3 className="text-base font-bold text-[#F5F2EB]">أي حالة تشطيب بدون شروط</h3>
            <p className="text-xs text-[#A6A29A] leading-relaxed">
              ارفع صورة واحدة أو عدة زوايا من الموبايل أو الكمبيوتر دون إجبارك على إدخال مقاسات هندسية أو ميزانية مسبقة.
            </p>
          </div>

          <div className="bg-[#141418] border border-white/10 rounded-xl p-5 space-y-2.5">
            <div className="text-xs font-mono text-[#C6A355] font-bold">02. تعديل عنصر محدد (Masking)</div>
            <h3 className="text-base font-bold text-[#F5F2EB]">غيّر الحائط فقط أو الأرضية فقط</h3>
            <p className="text-xs text-[#A6A29A] leading-relaxed">
              حدد الحائط لتجربة دهانات يوتن والبانوهات، أو حدد الأرضية فقط لتجربة البورسلين والرخام والباركيه مع بقاء الأثاث كما هو.
            </p>
          </div>

          <div className="bg-[#141418] border border-white/10 rounded-xl p-5 space-y-2.5">
            <div className="text-xs font-mono text-[#C6A355] font-bold">03. تصميم متكامل و3 بدائل</div>
            <h3 className="text-base font-bold text-[#F5F2EB]">قارن بين 3 أفكار مستقلة</h3>
            <p className="text-xs text-[#A6A29A] leading-relaxed">
              أنشئ 3 بدائل تصميمية مختلفة لنفس الغرفة، وقارن بينها بسحب الفاصل، واحفظ كل نسخة في لوحة مشروعاتك.
            </p>
          </div>

          <div className="bg-[#141418] border border-white/10 rounded-xl p-5 space-y-2.5">
            <div className="text-xs font-mono text-[#C6A355] font-bold">04. حصر كميات وأسعار مصر</div>
            <h3 className="text-base font-bold text-[#F5F2EB]">مقايسة هندسية دقيقة وتقرير PDF</h3>
            <p className="text-xs text-[#A6A29A] leading-relaxed">
              عند رغبتك، أدخل المقاسات الفعلية لتحصل على حصر كميات مبرمج (بلاط، هالك، بستلات دهان، معجون، سبوتات، ومصنعيات).
            </p>
          </div>
        </div>
      </section>

      {/* 3. DIVERSE INTERIOR DESIGN STYLES SHOWCASE (Sections 5 & 9) */}
      <section className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-[#F5F2EB]">
              استكشف مكتبة أنماط التصميم الجاهزة
            </h2>
            <p className="text-sm text-[#A6A29A] mt-1">
              اضغط على أي نمط لتجربته فوراً على صورة مكانك داخل استوديو التصميم.
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenGallery}
            className="px-4 py-2 bg-[#141418] hover:bg-white/5 text-[#C6A355] border border-white/10 rounded-xl text-xs font-bold flex items-center gap-1.5"
          >
            <span>تصفح معرض الإلهام الكامل</span>
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {DESIGN_STYLES.slice(0, 8).map((st) => {
            const imgUrl = getStylePreviewDataUrl(st.id);
            return (
              <div
                key={st.id}
                onClick={() => onStartWithStyle(st.id)}
                className="bg-[#141418] border border-white/10 hover:border-[#C6A355] rounded-xl overflow-hidden cursor-pointer group transition-colors flex flex-col justify-between"
              >
                <div>
                  <div className="relative h-44 bg-black overflow-hidden">
                    <img
                      src={imgUrl}
                      alt={st.nameAr}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-[#F5F2EB]">{st.nameAr}</h3>
                      <span className="text-[11px] font-mono text-[#A6A29A]">{st.nameEn}</span>
                    </div>
                    <p className="text-xs text-[#A6A29A] mt-1.5 line-clamp-2">{st.descriptionAr}</p>
                  </div>
                </div>
                <div className="px-4 pb-4 pt-1 flex items-center justify-between text-xs text-[#C6A355] font-semibold">
                  <span>جرّب هذا النمط على مكانك</span>
                  <ArrowLeft className="w-3.5 h-3.5" />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. SAVED USER PROJECTS ENTRY & EGYPTIAN BOQ CALLOUT */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-[#141418] border border-white/10 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <div className="text-xs text-[#C6A355] font-semibold mb-1">
              مشروعاتك المحفوظة ({projectsCount})
            </div>
            <h3 className="text-xl font-bold text-[#F5F2EB]">
              استكمل العمل على مشروعات الغرف والشقق الكاملة
            </h3>
            <p className="text-xs text-[#A6A29A] mt-1 mb-4">
              افتح أي مشروع محفوظ لاستعراض الصور الأصلية، النسخ المولدة، وتفاصيل التكلفة لكل غرفة.
            </p>

            <div className="space-y-2.5">
              {savedProjects.slice(0, 3).map((proj) => (
                <div
                  key={proj.id}
                  onClick={() => onOpenSavedProject(proj.id)}
                  className="p-3.5 rounded-xl bg-[#0B0B0E] border border-white/10 hover:border-[#C6A355]/50 flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div>
                    <div className="text-xs font-bold text-[#F5F2EB]">{proj.nameAr}</div>
                    <div className="text-[11px] text-[#A6A29A] mt-0.5">
                      {proj.rooms.length} غرف · آخر تحديث:{' '}
                      {new Date(proj.updatedAt).toLocaleDateString('ar-EG')}
                    </div>
                  </div>
                  <span className="text-xs text-[#C6A355] font-semibold flex items-center gap-1">
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>فتح المشروع</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 bg-[#141418] border border-white/10 rounded-2xl p-6 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="text-xs text-[#C6A355] font-semibold">
              وحدة هندسية مستقلة للسوق المصري
            </div>
            <h3 className="text-xl font-bold text-[#F5F2EB]">
              حاسبة كميات التشطيبات وقاعدة الأسعار المصرية
            </h3>
            <p className="text-xs text-[#A6A29A] leading-relaxed">
              احسب مسطح الأرضيات ونسبة الهالك، صافي الحوائط بعد خصم الأبواب والشبابيك، عدد بستلات الدهان وشيكارات المعجون، والسبوتات، مع مقارنة الأسعار المرجعية بعروض المقاولين الفعلية.
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenBOQCalculator}
            className="mt-6 w-full py-3 px-4 bg-[#0B0B0E] hover:bg-white/5 text-[#C6A355] border border-[#C6A355]/50 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <Calculator className="w-4 h-4" />
            <span>فتح حاسبة الكميات وقاعدة الأسعار المصرية</span>
          </button>
        </div>
      </section>
    </div>
  );
};
