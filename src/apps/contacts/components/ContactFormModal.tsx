import React, { useState } from 'react';
import {
  X,
  User,
  Mail,
  Phone,
  Building2,
  Briefcase,
  MapPin,
  Globe,
  Calendar,
  FileText,
  Star,
  Tag,
  Camera,
  Layers,
  Users as UsersIcon,
  Building,
  Check
} from 'lucide-react';
import { Contact } from '../../../platform/types';
import { DEFAULT_GROUPS } from '../types';

interface ContactFormModalProps {
  initialContact?: Contact | null;
  onSave: (contactData: Omit<Contact, 'id'>) => void;
  onClose: () => void;
  isLight: boolean;
  availableLabels?: string[];
}

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop&q=80',
];

const PRESET_GRADIENTS = [
  'bg-gradient-to-br from-indigo-500 to-purple-600',
  'bg-gradient-to-br from-pink-500 to-rose-600',
  'bg-gradient-to-br from-blue-500 to-cyan-600',
  'bg-gradient-to-br from-amber-500 to-orange-600',
  'bg-gradient-to-br from-emerald-500 to-teal-600',
  'bg-gradient-to-br from-violet-500 to-fuchsia-600',
];

export default function ContactFormModal({
  initialContact,
  onSave,
  onClose,
  isLight,
  availableLabels = ['Work', 'Personal', 'Family', 'VIP', 'Tech Team', 'Marketing'],
}: ContactFormModalProps) {
  const [firstName, setFirstName] = useState(initialContact?.firstName || '');
  const [lastName, setLastName] = useState(initialContact?.lastName || '');
  const [photo, setPhoto] = useState(initialContact?.photo || '');
  const [email, setEmail] = useState(initialContact?.email || '');
  const [phone, setPhone] = useState(initialContact?.phone || '');
  const [company, setCompany] = useState(initialContact?.company || '');
  const [jobTitle, setJobTitle] = useState(initialContact?.jobTitle || '');
  const [department, setDepartment] = useState(initialContact?.department || '');
  const [team, setTeam] = useState(initialContact?.team || '');
  const [address, setAddress] = useState(initialContact?.address || '');
  const [website, setWebsite] = useState(initialContact?.website || '');
  const [birthday, setBirthday] = useState(initialContact?.birthday || '');
  const [notes, setNotes] = useState(initialContact?.notes || '');
  const [organization, setOrganization] = useState(initialContact?.organization || '');
  const [isFavorite, setIsFavorite] = useState(initialContact?.isFavorite || false);
  const [selectedLabels, setSelectedLabels] = useState<string[]>(initialContact?.labels || ['Work']);
  const [avatarBg, setAvatarBg] = useState(initialContact?.avatarBg || PRESET_GRADIENTS[0]);

  const [newCustomLabel, setNewCustomLabel] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const toggleLabel = (lbl: string) => {
    if (selectedLabels.includes(lbl)) {
      setSelectedLabels(selectedLabels.filter((l) => l !== lbl));
    } else {
      setSelectedLabels([...selectedLabels, lbl]);
    }
  };

  const handleAddCustomLabel = () => {
    if (newCustomLabel.trim() && !selectedLabels.includes(newCustomLabel.trim())) {
      setSelectedLabels([...selectedLabels, newCustomLabel.trim()]);
      setNewCustomLabel('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() && !lastName.trim()) {
      setErrorMsg('Please enter at least a First Name or Last Name.');
      return;
    }

    onSave({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      photo: photo.trim(),
      email: email.trim(),
      phone: phone.trim(),
      company: company.trim(),
      jobTitle: jobTitle.trim(),
      department: department.trim(),
      team: team.trim(),
      address: address.trim(),
      website: website.trim(),
      birthday: birthday.trim(),
      notes: notes.trim(),
      organization: organization.trim(),
      isFavorite,
      labels: selectedLabels,
      avatarBg,
    });
  };

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div
        className={`w-full max-w-2xl rounded-3xl shadow-2xl border flex flex-col max-h-[90vh] overflow-hidden transition-all ${
          isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-zinc-900 border-zinc-700/80 text-white'
        }`}
      >
        {/* Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between ${isLight ? 'border-slate-100' : 'border-zinc-800'}`}>
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-indigo-500" />
            <h3 className="font-bold text-lg tracking-tight">
              {initialContact ? 'Edit Contact' : 'Create New Contact'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-full transition-colors cursor-pointer ${
              isLight
                ? 'hover:bg-slate-100 text-slate-400 hover:text-slate-700'
                : 'hover:bg-white/10 text-zinc-400 hover:text-white'
            }`}
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {errorMsg && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-500 rounded-xl text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          {/* Photo & Basic Name Header */}
          <div className="flex flex-col sm:flex-row items-center gap-6 pb-4 border-b border-dashed border-zinc-300 dark:border-zinc-800">
            <div className="flex flex-col items-center gap-2">
              {photo ? (
                <img
                  src={photo}
                  alt="Avatar Preview"
                  className="w-20 h-20 rounded-full object-cover border-2 border-indigo-500 shadow-md"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className={`w-20 h-20 rounded-full ${avatarBg} shadow-md flex items-center justify-center font-bold text-2xl text-white`}>
                  {firstName[0] || '?'}{lastName[0] || ''}
                </div>
              )}

              {/* Preset Avatars Selector */}
              <div className="flex gap-1 mt-1">
                {PRESET_AVATARS.map((pUrl, idx) => (
                  <button
                    type="button"
                    key={idx}
                    onClick={() => setPhoto(pUrl)}
                    className="w-5 h-5 rounded-full overflow-hidden border hover:scale-110 transition-transform cursor-pointer"
                  >
                    <img src={pUrl} alt="preset" className="w-full h-full object-cover" />
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setPhoto('')}
                  className="w-5 h-5 rounded-full bg-zinc-700 text-[10px] text-white flex items-center justify-center hover:scale-110 transition-transform cursor-pointer"
                  title="Clear photo"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="flex-1 w-full space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1 ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="e.g. Alex"
                    className={`w-full px-3 py-2 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-800 border-zinc-700 text-white'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1 ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="e.g. Johnson"
                    className={`w-full px-3 py-2 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-800 border-zinc-700 text-white'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1 ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                  Photo URL
                </label>
                <div className="relative">
                  <Camera className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-400" />
                  <input
                    type="url"
                    value={photo}
                    onChange={(e) => setPhoto(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className={`w-full pl-8 pr-3 py-2 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-800 border-zinc-700 text-white'
                    }`}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Contact Methods */}
          <div className="space-y-3">
            <h4 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${isLight ? 'text-slate-400' : 'text-zinc-400'}`}>
              <Mail size={14} /> Contact Information
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={`block text-[11px] font-medium mb-1 ${isLight ? 'text-slate-600' : 'text-zinc-300'}`}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex@company.com"
                  className={`w-full px-3 py-2 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-800 border-zinc-700 text-white'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-[11px] font-medium mb-1 ${isLight ? 'text-slate-600' : 'text-zinc-300'}`}>
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className={`w-full px-3 py-2 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-800 border-zinc-700 text-white'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Work & Organization */}
          <div className="space-y-3">
            <h4 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${isLight ? 'text-slate-400' : 'text-zinc-400'}`}>
              <Building2 size={14} /> Organization & Work Details
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={`block text-[11px] font-medium mb-1 ${isLight ? 'text-slate-600' : 'text-zinc-300'}`}>
                  Company Name
                </label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="e.g. DriveOSX Corp"
                  className={`w-full px-3 py-2 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-800 border-zinc-700 text-white'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-[11px] font-medium mb-1 ${isLight ? 'text-slate-600' : 'text-zinc-300'}`}>
                  Job Title
                </label>
                <input
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="e.g. Systems Engineer"
                  className={`w-full px-3 py-2 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-800 border-zinc-700 text-white'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-[11px] font-medium mb-1 ${isLight ? 'text-slate-600' : 'text-zinc-300'}`}>
                  Department
                </label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g. Engineering"
                  className={`w-full px-3 py-2 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-800 border-zinc-700 text-white'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-[11px] font-medium mb-1 ${isLight ? 'text-slate-600' : 'text-zinc-300'}`}>
                  Team
                </label>
                <input
                  type="text"
                  value={team}
                  onChange={(e) => setTeam(e.target.value)}
                  placeholder="e.g. Core Kernel"
                  className={`w-full px-3 py-2 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-800 border-zinc-700 text-white'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Address & Web */}
          <div className="space-y-3">
            <h4 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${isLight ? 'text-slate-400' : 'text-zinc-400'}`}>
              <MapPin size={14} /> Address & Web
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={`block text-[11px] font-medium mb-1 ${isLight ? 'text-slate-600' : 'text-zinc-300'}`}>
                  Address
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="100 Tech Way, San Francisco, CA"
                  className={`w-full px-3 py-2 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-800 border-zinc-700 text-white'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-[11px] font-medium mb-1 ${isLight ? 'text-slate-600' : 'text-zinc-300'}`}>
                  Website URL
                </label>
                <input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://example.com"
                  className={`w-full px-3 py-2 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-800 border-zinc-700 text-white'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-[11px] font-medium mb-1 ${isLight ? 'text-slate-600' : 'text-zinc-300'}`}>
                  Birthday
                </label>
                <input
                  type="date"
                  value={birthday}
                  onChange={(e) => setBirthday(e.target.value)}
                  className={`w-full px-3 py-2 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-800 border-zinc-700 text-white'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-[11px] font-medium mb-1 ${isLight ? 'text-slate-600' : 'text-zinc-300'}`}>
                  Favorite Contact
                </label>
                <button
                  type="button"
                  onClick={() => setIsFavorite(!isFavorite)}
                  className={`w-full py-2 px-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-semibold transition-all cursor-pointer ${
                    isFavorite
                      ? 'bg-amber-500/10 border-amber-500/40 text-amber-500'
                      : isLight
                      ? 'bg-slate-50 border-slate-200 text-slate-600'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-300'
                  }`}
                >
                  <Star size={14} className={isFavorite ? 'fill-amber-400 text-amber-400' : ''} />
                  {isFavorite ? 'Favorited Contact ★' : 'Add to Favorites'}
                </button>
              </div>
            </div>
          </div>

          {/* Groups & Labels */}
          <div className="space-y-3">
            <h4 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${isLight ? 'text-slate-400' : 'text-zinc-400'}`}>
              <Tag size={14} /> Labels & Groups
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {availableLabels.map((lbl) => {
                const isSelected = selectedLabels.includes(lbl);
                return (
                  <button
                    key={lbl}
                    type="button"
                    onClick={() => toggleLabel(lbl)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1 ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                        : isLight
                        ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                        : 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-300'
                    }`}
                  >
                    {isSelected && <Check size={12} />}
                    {lbl}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newCustomLabel}
                onChange={(e) => setNewCustomLabel(e.target.value)}
                placeholder="Add custom label..."
                className={`flex-1 px-3 py-1.5 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-800 border-zinc-700 text-white'
                }`}
              />
              <button
                type="button"
                onClick={handleAddCustomLabel}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold rounded-xl border border-zinc-700 cursor-pointer"
              >
                + Add Label
              </button>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1 ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
              Notes & Remarks
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add key notes, background info, or reminders..."
              className={`w-full px-3 py-2 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-800 border-zinc-700 text-white'
              }`}
            />
          </div>

          {/* Form Actions */}
          <div className={`pt-4 border-t flex items-center justify-end gap-3 ${isLight ? 'border-slate-100' : 'border-zinc-800'}`}>
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 text-xs font-semibold rounded-xl transition-colors cursor-pointer ${
                isLight ? 'hover:bg-slate-100 text-slate-600' : 'hover:bg-zinc-800 text-zinc-300'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer"
            >
              {initialContact ? 'Save Changes' : 'Create Contact'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
