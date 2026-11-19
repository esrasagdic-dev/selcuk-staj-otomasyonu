import React, { useState, useEffect } from 'react';
import { EmailLog } from '../types';
import { apiRequest } from '../services/api';
import { Mail, X, CheckCircle, ExternalLink, Calendar, Search } from 'lucide-react';

interface EmailHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicationId?: number;
  customTitle?: string;
  customSubtitle?: string;
}

export const EmailHistoryModal: React.FC<EmailHistoryModalProps> = ({ 
  isOpen, 
  onClose, 
  applicationId,
  customTitle,
  customSubtitle
}) => {
  const [emails, setEmails] = useState<EmailLog[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<EmailLog | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadEmails();
    }
  }, [isOpen, applicationId]);

  const loadEmails = async () => {
    setLoading(true);
    try {
      const endpoint = applicationId ? `/notifications/emails?applicationId=${applicationId}` : '/notifications/emails';
      const data = await apiRequest<EmailLog[]>(endpoint);
      setEmails(data || []);
      if (data && data.length > 0) {
        setSelectedEmail(data[0]);
      }
    } catch (err) {
      console.error('E-postalar yüklenemedi:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const filtered = emails.filter(e => 
    e.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.recipientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.toEmail.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const displayTitle = customTitle || (applicationId ? `Başvuru #${applicationId} Resmî E-posta Bildirimleri` : 'Resmî E-posta Bildirim Geçmişi');
  const displaySubtitle = customSubtitle || (applicationId ? 'Bu staj başvurusu kapsamında tarafınıza ve danışmanınıza iletilen resmî e-postalar' : 'Selçuk Üniversitesi Staj Bilgi Sistemi tarafından iletilen resmî bildirim e-postaları');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-[#1c458b] text-white px-6 py-4 flex items-center justify-between border-b-2 border-[#c5a880]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl text-[#c5a880]">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-lg font-['Montserrat',sans-serif]">{displayTitle}</h2>
              <p className="text-xs text-blue-200">{displaySubtitle}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body (Split View) */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Email List */}
          <div className="w-2/5 border-r border-slate-200 flex flex-col bg-slate-50">
            {/* Search */}
            <div className="p-3 border-b border-slate-200 bg-white">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Kişi veya konu ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-100 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#1c458b]"
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {loading ? (
                <div className="p-8 text-center text-xs text-slate-400">Yükleniyor...</div>
              ) : filtered.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">Kayıtlı e-posta bildirimi bulunamadı.</div>
              ) : (
                filtered.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedEmail(item)}
                    className={`p-3.5 cursor-pointer transition text-left ${
                      selectedEmail?.id === item.id 
                        ? 'bg-blue-50/80 border-l-4 border-[#1c458b]' 
                        : 'hover:bg-slate-100/70'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold text-slate-800 truncate max-w-[170px]">{item.recipientName}</span>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(item.sentAt).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="font-medium text-xs text-slate-900 truncate mb-1">{item.subject}</div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span className="truncate max-w-[160px]">{item.toEmail}</span>
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-medium">
                        <CheckCircle className="w-2.5 h-2.5" /> İletildi
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right: Rendered Email Preview */}
          <div className="flex-1 flex flex-col bg-white overflow-hidden">
            {selectedEmail ? (
              <div className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Email Meta Bar */}
                <div className="p-4 bg-slate-50 border-b border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-sm text-slate-900">{selectedEmail.subject}</h3>
                    <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-mono">
                      {selectedEmail.templateType}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 space-y-0.5">
                    <div><strong>Alıcı:</strong> {selectedEmail.recipientName} &lt;{selectedEmail.toEmail}&gt;</div>
                    <div><strong>Tarih:</strong> {new Date(selectedEmail.sentAt).toLocaleString('tr-TR')}</div>
                    {selectedEmail.relatedApplicationId && (
                      <div><strong>İlgili Başvuru No:</strong> #{selectedEmail.relatedApplicationId}</div>
                    )}
                  </div>
                </div>

                {/* Email Preview Frame */}
                <div className="flex-1 p-4 overflow-y-auto bg-slate-100/60">
                  <div className="bg-white rounded-lg shadow-sm border border-slate-200 max-w-2xl mx-auto overflow-hidden">
                    <iframe
                      srcDoc={selectedEmail.bodyHtml}
                      title="E-posta Önizleme"
                      className="w-full min-h-[500px] border-none"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
                Görüntülemek için soldaki listeden bir e-posta seçin.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Toplam {emails.length} resmî e-posta bildirimi kayıtlıdır.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg transition"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};
