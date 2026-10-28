import React, { useState } from 'react';
import { MakanProject, RoomTypeId } from '../types/makan';
import { ROOM_TYPES, EGYPTIAN_REGIONS } from '../data/catalogData';
import { calculateFullApartmentSummary } from '../utils/boqCalculator';
import { PriceRecord } from '../types/makan';
import {
  FolderOpen,
  Plus,
  Trash2,
  Building2,
  Home,
  Star,
  ArrowLeft,
} from 'lucide-react';

interface ProjectsDashboardViewProps {
  projects: MakanProject[];
  activeProjectId: string;
  priceCatalog: PriceRecord[];
  onSelectProject: (projectId: string) => void;
  onCreateNewProject: (nameAr: string, isFullApartment: boolean, initialRoomType: RoomTypeId) => void;
  onDeleteProject: (projectId: string) => void;
}

export const ProjectsDashboardView: React.FC<ProjectsDashboardViewProps> = ({
  projects,
  activeProjectId,
  priceCatalog,
  onSelectProject,
  onCreateNewProject,
  onDeleteProject,
}) => {
  const [newProjectName, setNewProjectName] = useState<string>('');
  const [isApartmentMode, setIsApartmentMode] = useState<boolean>(false);
  const [initialRoomType, setInitialRoomType] = useState<RoomTypeId>('living_room');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const title =
      newProjectName.trim() ||
      (isApartmentMode ? 'مشروع تشطيب شقة سكنية متكاملة' : 'مشروع تصميم غرفة جديدة');
    onCreateNewProject(title, isApartmentMode, initialRoomType);
    setNewProjectName('');
  };

  // Collect all favorite design versions across projects
  const favoriteVersions = projects.flatMap((proj) =>
    proj.rooms.flatMap((rm) =>
      rm.versions
        .filter((v) => v.isFavorite)
        .map((v) => ({
          projectId: proj.id,
          projectNameAr: proj.nameAr,
          roomNameAr: rm.nameAr,
          version: v,
        }))
    )
  );

  return (
    <div className="space-y-8">
      {/* Create New Project Card */}
      <div className="bg-[#141418] border border-white/10 rounded-xl p-6">
        <h2 className="text-lg font-bold text-[#F5F2EB] mb-1">
          إنشاء مشروع جديد (غرفة مستقلة أو شقة كاملة متعددة الغرف)
        </h2>
        <p className="text-xs text-[#A6A29A] mb-4">
          تُحفظ جميع مشروعاتك وصورك الأصلية والنسخ المولدة وتقارير التكلفة بشكل دائم لتستكمل العمل عليها في أي وقت.
        </p>

        <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs text-[#A6A29A] mb-1">اسم المشروع</label>
            <input
              type="text"
              placeholder="مثال: تجديد غرفة المعيشة / تصميم شقتي..."
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              className="w-full bg-[#0B0B0E] border border-white/15 rounded-lg px-3 py-2 text-xs text-[#F5F2EB] focus:border-[#C6A355] outline-none"
            />
          </div>

          <div>
            <label className="block text-xs text-[#A6A29A] mb-1">نطاق المشروع</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsApartmentMode(false)}
                className={`py-2 px-3 rounded-lg text-xs font-medium border flex items-center justify-center gap-1.5 ${
                  !isApartmentMode
                    ? 'bg-[#C6A355]/20 border-[#C6A355] text-[#C6A355]'
                    : 'bg-[#0B0B0E] border-white/10 text-[#A6A29A]'
                }`}
              >
                <Home className="w-3.5 h-3.5" />
                <span>غرفة / مكان واحد</span>
              </button>
              <button
                type="button"
                onClick={() => setIsApartmentMode(true)}
                className={`py-2 px-3 rounded-lg text-xs font-medium border flex items-center justify-center gap-1.5 ${
                  isApartmentMode
                    ? 'bg-[#C6A355]/20 border-[#C6A355] text-[#C6A355]'
                    : 'bg-[#0B0B0E] border-white/10 text-[#A6A29A]'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>شقة كاملة</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs text-[#A6A29A] mb-1">نوع المساحة الأساسية</label>
            <select
              value={initialRoomType}
              onChange={(e) => setInitialRoomType(e.target.value as RoomTypeId)}
              className="w-full bg-[#0B0B0E] border border-white/15 rounded-lg px-3 py-2 text-xs text-[#F5F2EB] focus:border-[#C6A355] outline-none"
            >
              {ROOM_TYPES.filter((r) => r.id !== 'full_apartment').map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nameAr}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="py-2.5 px-4 bg-[#C6A355] hover:bg-[#d4b265] text-[#0B0B0E] font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>بدء المشروع وفتحه في الاستوديو</span>
          </button>
        </form>
      </div>

      {/* Saved Projects List */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-[#F5F2EB]">
          المشروعات المحفوظة ({projects.length})
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((proj) => {
            const summary = calculateFullApartmentSummary(proj, priceCatalog);
            const firstRoom = proj.rooms[0];
            const latestVer = firstRoom?.versions[0];
            const thumbUrl = latestVer?.resultDataUrl || firstRoom?.photos[0]?.dataUrl || '';
            const regName = EGYPTIAN_REGIONS.find((r) => r.id === proj.region)?.nameAr || 'القاهرة الكبرى';
            const totalVersions = proj.rooms.reduce((acc, r) => acc + r.versions.length, 0);

            return (
              <div
                key={proj.id}
                className={`bg-[#141418] rounded-xl overflow-hidden border transition-colors flex flex-col justify-between ${
                  proj.id === activeProjectId ? 'border-[#C6A355]' : 'border-white/10 hover:border-white/25'
                }`}
              >
                <div>
                  <div className="relative h-44 bg-[#0B0B0E] overflow-hidden">
                    {thumbUrl ? (
                      <img
                        src={thumbUrl}
                        alt={proj.nameAr}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-[#A6A29A]">
                        معاينة المشروع
                      </div>
                    )}
                    <div className="absolute bottom-2 right-2 bg-black/75 backdrop-blur-sm px-2.5 py-1 rounded text-[11px] text-[#F5F2EB]">
                      {proj.isFullApartment || proj.rooms.length > 1
                        ? `مشروع شقة (${proj.rooms.length} غرف)`
                        : firstRoom?.nameAr}
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="text-xs text-[#A6A29A]">
                      <span>{regName}</span>
                      <span aria-hidden="true"> · </span>
                      <span>{totalVersions} نسخة تصميم</span>
                    </div>
                    <h4 className="text-base font-bold text-[#F5F2EB] mt-1">{proj.nameAr}</h4>

                    <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                      <span className="text-[#A6A29A]">التكلفة التقديرية:</span>
                      <span className="font-mono tabular-nums font-bold text-[#C6A355]">
                        {summary.apartmentGrandTotalEgp.toLocaleString('en-US')} ج.م
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-4 pt-0 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectProject(proj.id)}
                    className="flex-1 py-2 px-3 bg-[#C6A355] hover:bg-[#d4b265] text-[#0B0B0E] font-bold text-xs rounded-lg flex items-center justify-center gap-1.5"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>فتح واستكمال العمل</span>
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </button>

                  {projects.length > 1 && (
                    <button
                      type="button"
                      onClick={() => onDeleteProject(proj.id)}
                      className="p-2 bg-[#0B0B0E] hover:bg-red-950/40 text-red-400 border border-white/10 rounded-lg"
                      title="حذف المشروع"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Favorite Designs Section */}
      {favoriteVersions.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-base font-bold text-[#F5F2EB] flex items-center gap-2">
            <Star className="w-4 h-4 text-[#C6A355]" />
            <span>التصميمات المفضلة المحفوظة ({favoriteVersions.length})</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {favoriteVersions.map(({ projectId, projectNameAr, roomNameAr, version }) => (
              <div
                key={version.id}
                className="bg-[#141418] border border-white/10 rounded-xl overflow-hidden p-3 space-y-2"
              >
                <img
                  src={version.resultDataUrl}
                  alt={version.labelAr}
                  referrerPolicy="no-referrer"
                  className="w-full h-36 object-cover rounded-lg"
                />
                <div className="text-xs font-bold text-[#F5F2EB]">{version.labelAr}</div>
                <div className="text-[11px] text-[#A6A29A]">
                  {projectNameAr} · {roomNameAr}
                </div>
                <button
                  type="button"
                  onClick={() => onSelectProject(projectId)}
                  className="w-full py-1.5 bg-white/5 hover:bg-white/10 text-[#C6A355] text-xs rounded-lg"
                >
                  الانتقال للمشروع
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
