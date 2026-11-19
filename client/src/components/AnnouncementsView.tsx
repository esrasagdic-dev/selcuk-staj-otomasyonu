import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Calendar, 
  Clock,
  Bookmark,
  RefreshCw
} from 'lucide-react';
import { apiRequest } from '../services/api';

interface AnnouncementItem {
  id: number;
  title: string;
  summary: string;
  content: string;
  category: 'period' | 'guide' | 'insurance' | 'general' | string;
  createdAt: string;
  author: string;
  relatedPeriodId?: number | null;
}

export const AnnouncementsView: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<'all' | 'period' | 'insurance' | 'guide'>('all');
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const loadAnnouncements = async () => {
    setLoading(true);
    try {
      const data: any = await apiRequest('/announcements');
      if (Array.isArray(data) && data.length > 0) {
        setAnnouncements(data);
        if (!selectedAnnouncement) {
          setSelectedAnnouncement(data[0].id);
        }
      }
    } catch (err) {
      console.error('Duyurular yüklenirken hata:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const getCategoryMeta = (cat: string) => {
    switch (cat) {
      case 'period':
        return { name: 'Başvuru Takvimi', badgeColor: 'bg-blue-100 text-[#1c458b]' };
      case 'guide':
        return { name: 'Evrak Rehberi', badgeColor: 'bg-amber-100 text-amber-800' };
      case 'insurance':
        return { name: 'SGK Sigorta', badgeColor: 'bg-emerald-100 text-emerald-800' };
      default:
        return { name: 'Genel Duyuru', badgeColor: 'bg-purple-100 text-purple-800' };
    }
  };

  const filtered = activeCategory === 'all' 
    ? announcements 
    : announcements.filter(a => a.category === activeCategory);

  const selected = filtered.find(a => a.id === selectedAnnouncement) || filtered[0] || announcements[0];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-['Montserrat',sans-serif]">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-[#1c458b] text-xs font-bold">
              <Bell className="w-3.5 h-3.5" />
              <span>Resmî Bilgilendirme Merkezi</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#002b49] font-serif">
              Staj Duyuruları ve Kılavuzlar
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm">
              Staj Komisyonu tarafından ilan edilen güncel başvuru tarihleri, staj takvimleri ve uygulama esasları.
            </p>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-3.5 py-1.5 rounded-xl font-semibold transition cursor-pointer ${
                activeCategory === 'all'
                  ? 'bg-[#1c458b] text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tümü ({announcements.length})
            </button>
            <button
              onClick={() => setActiveCategory('period')}
              className={`px-3.5 py-1.5 rounded-xl font-semibold transition cursor-pointer ${
                activeCategory === 'period'
                  ? 'bg-[#1c458b] text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Başvuru Takvimi
            </button>
            <button
              onClick={() => setActiveCategory('guide')}
              className={`px-3.5 py-1.5 rounded-xl font-semibold transition cursor-pointer ${
                activeCategory === 'guide'
                  ? 'bg-[#1c458b] text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Evrak Rehberi
            </button>
            <button
              onClick={() => setActiveCategory('insurance')}
              className={`px-3.5 py-1.5 rounded-xl font-semibold transition cursor-pointer ${
                activeCategory === 'insurance'
                  ? 'bg-[#1c458b] text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              SGK Sigorta
            </button>
            <button
              onClick={loadAnnouncements}
              title="Duyuruları Yenile"
              className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Content Split: List & Detail View */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-6">
          {/* Left Column: Announcement List */}
          <div className="lg:col-span-5 space-y-3 max-h-[600px] overflow-y-auto pr-1">
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
                Bu kategoride henüz yayınlanmış bir duyuru bulunmamaktadır.
              </div>
            ) : (
              filtered.map((item) => {
                const meta = getCategoryMeta(item.category);
                const formattedDate = new Date(item.createdAt).toLocaleDateString('tr-TR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                });
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedAnnouncement(item.id)}
                    className={`p-4 rounded-xl border text-left cursor-pointer transition ${
                      selected?.id === item.id
                        ? 'bg-blue-50/70 border-blue-400 ring-2 ring-blue-500/20 shadow-sm'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${meta.badgeColor}`}>
                        {meta.name}
                      </span>
                      <span className="text-slate-400 text-[11px] flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formattedDate}
                      </span>
                    </div>
                    <h3 className="font-bold text-slate-900 text-xs sm:text-sm line-clamp-2 leading-snug">
                      {item.title}
                    </h3>
                    <p className="text-slate-500 text-xs line-clamp-2 mt-1.5">
                      {item.summary}
                    </p>
                  </div>
                );
              })
            )}
          </div>

          {/* Right Column: Announcement Detail */}
          <div className="lg:col-span-7 bg-slate-50/70 p-6 sm:p-8 rounded-2xl border border-slate-200 space-y-5">
            {selected ? (
              <>
                <div className="space-y-2 border-b border-slate-200 pb-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${getCategoryMeta(selected.category).badgeColor}`}>
                      {getCategoryMeta(selected.category).name}
                    </span>
                    <span className="text-slate-500 text-xs flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(selected.createdAt).toLocaleDateString('tr-TR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug">
                    {selected.title}
                  </h2>
                </div>

                <div className="prose prose-sm text-slate-700 max-w-none text-xs sm:text-sm whitespace-pre-line leading-relaxed">
                  {selected.content}
                </div>

                <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 shadow-sm">
                    <Bookmark className="w-4 h-4 text-[#1c458b]" />
                    <span>{selected.author || 'Staj Komisyonu Başkanlığı'}</span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Selçuk Üniversitesi Resmî Staj Duyuru Sistemi
                  </span>
                </div>
              </>
            ) : (
              <div className="py-12 text-center text-slate-400 text-xs">
                Görüntülemek için soldaki listeden bir duyuru seçiniz.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
