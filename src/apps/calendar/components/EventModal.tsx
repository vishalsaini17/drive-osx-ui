import React, { useState } from 'react';
import {
  X,
  Clock,
  MapPin,
  Users,
  Video,
  Mail,
  Repeat,
  Bell,
  Globe,
  Tag,
  AlignLeft,
  CalendarDays,
  Sparkles,
  Check,
  Plus,
  Trash2,
} from 'lucide-react';
import { CalendarEvent } from '../../../platform/types';
import { TIMEZONES } from '../types';
import { AvailabilityModal } from './AvailabilityModal';
import { useSystemStore } from '../../../shell/state/systemStore';

interface EventModalProps {
  isLight: boolean;
  eventToEdit?: CalendarEvent;
  initialDate: Date;
  initialTime?: string;
  onSave: (eventData: Omit<CalendarEvent, 'id'>, eventId?: string) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}

export const EventModal: React.FC<EventModalProps> = ({
  isLight,
  eventToEdit,
  initialDate,
  initialTime = '10:00 AM',
  onSave,
  onDelete,
  onClose,
}) => {
  const openAppWindow = useSystemStore((state) => state.openAppWindow);

  const getISODate = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // Form States
  const [activeTab, setActiveTab] = useState<'details' | 'availability'>('details');
  const [title, setTitle] = useState(eventToEdit?.title || '');
  const [startDate, setStartDate] = useState(eventToEdit?.date || getISODate(initialDate));
  const [endDate, setEndDate] = useState(eventToEdit?.endDate || eventToEdit?.date || getISODate(initialDate));
  const [time, setTime] = useState(eventToEdit?.time || initialTime);
  const [endTime, setEndTime] = useState(eventToEdit?.endTime || '11:00 AM');
  const [category, setCategory] = useState<'Personal' | 'Work' | 'Family' | 'Important'>(
    eventToEdit?.category || 'Work'
  );
  const [location, setLocation] = useState(eventToEdit?.location || '');
  const [description, setDescription] = useState(eventToEdit?.description || '');
  const [recurrence, setRecurrence] = useState<'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'>(
    eventToEdit?.recurrence || 'none'
  );
  const [reminder, setReminder] = useState(eventToEdit?.reminder || '15m');
  const [timezone, setTimezone] = useState(eventToEdit?.timezone || 'America/New_York');
  const [meetingLink, setMeetingLink] = useState(eventToEdit?.meetingLink || '');

  // Attendees state
  const [attendees, setAttendees] = useState<
    Array<{ email: string; name?: string; status?: 'accepted' | 'pending' | 'declined' }>
  >(eventToEdit?.attendees || [
    { email: 'alex@driveosx.com', name: 'Alex Johnson', status: 'accepted' },
    { email: 'sarah@driveosx.com', name: 'Sarah Miller', status: 'pending' },
  ]);
  const [newAttendeeInput, setNewAttendeeInput] = useState('');

  const categoryColors: Record<string, string> = {
    Personal: 'bg-blue-500',
    Work: 'bg-amber-500',
    Family: 'bg-emerald-500',
    Important: 'bg-red-500',
  };

  const handleAddAttendee = () => {
    if (!newAttendeeInput.trim()) return;
    const email = newAttendeeInput.trim().toLowerCase();
    if (!attendees.some((a) => a.email === email)) {
      setAttendees([...attendees, { email, status: 'pending' }]);
    }
    setNewAttendeeInput('');
  };

  const handleRemoveAttendee = (email: string) => {
    setAttendees(attendees.filter((a) => a.email !== email));
  };

  const handleGenerateMeetingLink = () => {
    const roomId = `osxmeet-${Math.random().toString(36).substring(2, 8)}`;
    setMeetingLink(`https://meet.driveosx.com/${roomId}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSave(
      {
        title: title.trim(),
        date: startDate,
        endDate,
        time,
        endTime,
        category,
        location: location.trim() || undefined,
        description: description.trim() || undefined,
        recurrence,
        reminder,
        timezone,
        attendees,
        meetingLink: meetingLink.trim() || undefined,
      },
      eventToEdit?.id
    );

    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-xs p-3">
      <div
        className={`w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-2xl border flex flex-col font-sans overflow-hidden animate-in fade-in zoom-in-95 duration-150 ${
          isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#2b2a2f] border-white/15 text-white'
        }`}
      >
        {/* Modal Top Header */}
        <div
          className={`px-4 py-3 border-b flex items-center justify-between shrink-0 ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#232227] border-white/10'
          }`}
        >
          <div className="flex items-center gap-2">
            <CalendarDays size={18} className="text-blue-500" />
            <h2 className="font-bold text-sm">
              {eventToEdit ? 'Edit Calendar Event' : 'Create New Event'}
            </h2>
          </div>

          <button
            onClick={onClose}
            className={`p-1.5 rounded-full transition-colors cursor-pointer ${
              isLight ? 'hover:bg-slate-200 text-slate-600' : 'hover:bg-white/10 text-white/70'
            }`}
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab Switcher: Event Details vs Teammate Availability */}
        <div
          className={`flex items-center px-4 border-b shrink-0 text-xs font-semibold gap-4 ${
            isLight ? 'border-slate-200 bg-slate-100/50' : 'border-white/10 bg-black/20'
          }`}
        >
          <button
            onClick={() => setActiveTab('details')}
            className={`py-2.5 border-b-2 cursor-pointer transition-colors ${
              activeTab === 'details'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400 font-bold'
                : 'border-transparent opacity-60 hover:opacity-100'
            }`}
          >
            Event Details
          </button>
          <button
            onClick={() => setActiveTab('availability')}
            className={`py-2.5 border-b-2 cursor-pointer transition-colors flex items-center gap-1.5 ${
              activeTab === 'availability'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400 font-bold'
                : 'border-transparent opacity-60 hover:opacity-100'
            }`}
          >
            <Sparkles size={13} className="text-amber-500" />
            Check Teammate Availability
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {activeTab === 'availability' ? (
            <AvailabilityModal
              isLight={isLight}
              selectedDate={new Date(startDate + 'T00:00:00')}
              onSelectTimeSlot={(slotStr) => {
                setTime(slotStr);
                setActiveTab('details');
              }}
              onClose={onClose}
            />
          ) : (
            <form id="event-form" onSubmit={handleSubmit} className="flex flex-col gap-4 text-xs">
              {/* Event Title */}
              <div>
                <label className="block font-bold mb-1 opacity-80">Event Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Quarterly Product Strategy Review"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={`w-full px-3 py-2 text-sm rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    isLight ? 'bg-slate-100 border-slate-300 text-slate-900' : 'bg-black/30 border-white/15 text-white'
                  }`}
                  autoFocus
                />
              </div>

              {/* Dates & Times Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Start Date & Time */}
                <div className="flex flex-col gap-1">
                  <label className="font-bold opacity-80 flex items-center gap-1">
                    <Clock size={13} className="text-blue-500" /> Start Date & Time
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        if (e.target.value > endDate) setEndDate(e.target.value);
                      }}
                      className={`flex-1 px-2.5 py-1.5 rounded-lg border focus:outline-none ${
                        isLight ? 'bg-slate-100 border-slate-300' : 'bg-black/30 border-white/15'
                      }`}
                    />
                    <select
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className={`px-2 py-1.5 rounded-lg border focus:outline-none ${
                        isLight ? 'bg-slate-100 border-slate-300' : 'bg-black/30 border-white/15 text-white'
                      }`}
                    >
                      {['All day', '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM', '06:00 PM'].map((t) => (
                        <option key={t} value={t} className="bg-slate-800 text-white">{t}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* End Date & Time */}
                <div className="flex flex-col gap-1">
                  <label className="font-bold opacity-80 flex items-center gap-1">
                    <Clock size={13} className="text-amber-500" /> End Date & Time
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className={`flex-1 px-2.5 py-1.5 rounded-lg border focus:outline-none ${
                        isLight ? 'bg-slate-100 border-slate-300' : 'bg-black/30 border-white/15'
                      }`}
                    />
                    <select
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className={`px-2 py-1.5 rounded-lg border focus:outline-none ${
                        isLight ? 'bg-slate-100 border-slate-300' : 'bg-black/30 border-white/15 text-white'
                      }`}
                    >
                      {['09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM', '06:00 PM', '07:00 PM'].map((t) => (
                        <option key={t} value={t} className="bg-slate-800 text-white">{t}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Category & Recurrence Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Category Picker */}
                <div>
                  <label className="block font-bold mb-1 opacity-80">Category / Calendar</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className={`w-full px-3 py-1.5 rounded-lg border focus:outline-none ${
                      isLight ? 'bg-slate-100 border-slate-300' : 'bg-black/30 border-white/15 text-white'
                    }`}
                  >
                    <option value="Personal" className="bg-slate-800 text-white">Personal</option>
                    <option value="Work" className="bg-slate-800 text-white">Work</option>
                    <option value="Family" className="bg-slate-800 text-white">Family</option>
                    <option value="Important" className="bg-slate-800 text-white">Important</option>
                  </select>
                </div>

                {/* Recurrence Rule */}
                <div>
                  <label className="block font-bold mb-1 opacity-80 flex items-center gap-1">
                    <Repeat size={12} className="text-purple-500" /> Recurrence Rule
                  </label>
                  <select
                    value={recurrence}
                    onChange={(e) => setRecurrence(e.target.value as any)}
                    className={`w-full px-3 py-1.5 rounded-lg border focus:outline-none ${
                      isLight ? 'bg-slate-100 border-slate-300' : 'bg-black/30 border-white/15 text-white'
                    }`}
                  >
                    <option value="none" className="bg-slate-800 text-white">Does not repeat</option>
                    <option value="daily" className="bg-slate-800 text-white">Every day</option>
                    <option value="weekly" className="bg-slate-800 text-white">Every week</option>
                    <option value="monthly" className="bg-slate-800 text-white">Every month</option>
                    <option value="yearly" className="bg-slate-800 text-white">Every year</option>
                  </select>
                </div>
              </div>

              {/* Reminder Offset & Timezone Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Reminder Offset */}
                <div>
                  <label className="block font-bold mb-1 opacity-80 flex items-center gap-1">
                    <Bell size={12} className="text-amber-500" /> Reminder Notification
                  </label>
                  <select
                    value={reminder}
                    onChange={(e) => setReminder(e.target.value)}
                    className={`w-full px-3 py-1.5 rounded-lg border focus:outline-none ${
                      isLight ? 'bg-slate-100 border-slate-300' : 'bg-black/30 border-white/15 text-white'
                    }`}
                  >
                    <option value="none" className="bg-slate-800 text-white">None</option>
                    <option value="0m" className="bg-slate-800 text-white">At time of event</option>
                    <option value="5m" className="bg-slate-800 text-white">5 minutes before</option>
                    <option value="15m" className="bg-slate-800 text-white">15 minutes before</option>
                    <option value="30m" className="bg-slate-800 text-white">30 minutes before</option>
                    <option value="1h" className="bg-slate-800 text-white">1 hour before</option>
                    <option value="1d" className="bg-slate-800 text-white">1 day before</option>
                  </select>
                </div>

                {/* Timezone */}
                <div>
                  <label className="block font-bold mb-1 opacity-80 flex items-center gap-1">
                    <Globe size={12} className="text-emerald-500" /> Event Time Zone
                  </label>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className={`w-full px-3 py-1.5 rounded-lg border focus:outline-none ${
                      isLight ? 'bg-slate-100 border-slate-300' : 'bg-black/30 border-white/15 text-white'
                    }`}
                  >
                    {TIMEZONES.map((tz) => (
                      <option key={tz.id} value={tz.id} className="bg-slate-800 text-white">
                        {tz.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="block font-bold mb-1 opacity-80 flex items-center gap-1">
                  <MapPin size={12} className="text-blue-500" /> Location / Physical Address
                </label>
                <input
                  type="text"
                  placeholder="e.g. Building 4, Conference Room B or Bistro Cafe"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className={`w-full px-3 py-1.5 rounded-lg border focus:outline-none ${
                    isLight ? 'bg-slate-100 border-slate-300 text-slate-900' : 'bg-black/30 border-white/15 text-white'
                  }`}
                />
              </div>

              {/* OSX Meet Video Link Integration */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold opacity-80 flex items-center gap-1">
                    <Video size={12} className="text-blue-500" /> OSX Meet Video Conference Link
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateMeetingLink}
                    className="text-[10px] font-bold text-blue-500 hover:underline cursor-pointer"
                  >
                    + Generate OSX Meet Link
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    placeholder="https://meet.driveosx.com/room-xyz"
                    value={meetingLink}
                    onChange={(e) => setMeetingLink(e.target.value)}
                    className={`flex-1 px-3 py-1.5 rounded-lg border focus:outline-none ${
                      isLight ? 'bg-slate-100 border-slate-300 text-slate-900' : 'bg-black/30 border-white/15 text-white'
                    }`}
                  />
                  {meetingLink && (
                    <button
                      type="button"
                      onClick={() => openAppWindow('meeting')}
                      className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold flex items-center gap-1 cursor-pointer"
                      title="Test OSX Meet Call"
                    >
                      <Video size={13} /> Launch Call
                    </button>
                  )}
                </div>
              </div>

              {/* Invite Users / Attendees */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold opacity-80 flex items-center gap-1">
                    <Users size={12} className="text-amber-500" /> Invite Users & Teammates
                  </label>
                  {attendees.length > 0 && (
                    <button
                      type="button"
                      onClick={() => openAppWindow('mail')}
                      className="text-[10px] font-bold text-blue-500 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Mail size={11} /> Send Invites via Mail Studio
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="email"
                    placeholder="e.g. colleague@driveosx.com"
                    value={newAttendeeInput}
                    onChange={(e) => setNewAttendeeInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddAttendee();
                      }
                    }}
                    className={`flex-1 px-3 py-1.5 rounded-lg border focus:outline-none ${
                      isLight ? 'bg-slate-100 border-slate-300 text-slate-900' : 'bg-black/30 border-white/15 text-white'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={handleAddAttendee}
                    className="px-3 py-1.5 bg-slate-800 text-white hover:bg-slate-700 rounded-lg font-bold cursor-pointer"
                  >
                    Add
                  </button>
                </div>

                {attendees.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 p-2 rounded-xl border bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-white/10">
                    {attendees.map((att) => (
                      <div
                        key={att.email}
                        className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium flex items-center gap-1.5 ${
                          isLight ? 'bg-white border-slate-200' : 'bg-white/10 border-white/10'
                        }`}
                      >
                        <span className="font-bold">{att.name || att.email}</span>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                            att.status === 'accepted'
                              ? 'bg-emerald-500/20 text-emerald-600'
                              : 'bg-amber-500/20 text-amber-600'
                          }`}
                        >
                          {att.status || 'pending'}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveAttendee(att.email)}
                          className="text-slate-400 hover:text-red-500 ml-1 cursor-pointer"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Description / Notes */}
              <div>
                <label className="block font-bold mb-1 opacity-80 flex items-center gap-1">
                  <AlignLeft size={12} /> Agenda & Event Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Add meeting agenda, context, or preparation notes..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border focus:outline-none ${
                    isLight ? 'bg-slate-100 border-slate-300 text-slate-900' : 'bg-black/30 border-white/15 text-white'
                  }`}
                />
              </div>
            </form>
          )}
        </div>

        {/* Modal Bottom Footer Actions */}
        <div
          className={`px-4 py-3 border-t flex items-center justify-between shrink-0 ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#232227] border-white/10'
          }`}
        >
          {eventToEdit && onDelete ? (
            <button
              type="button"
              onClick={() => {
                onDelete(eventToEdit.id);
                onClose();
              }}
              className="px-3 py-1.5 rounded-xl border border-red-500/30 text-red-500 hover:bg-red-500/10 font-bold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Trash2 size={13} /> Delete Event
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-1.5 rounded-xl font-medium border cursor-pointer transition-colors ${
                isLight ? 'bg-white hover:bg-slate-100 border-slate-300' : 'bg-white/10 hover:bg-white/15 border-white/10'
              }`}
            >
              Cancel
            </button>

            <button
              type="submit"
              form="event-form"
              className="px-5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-md cursor-pointer transition-colors flex items-center gap-1"
            >
              <Check size={14} /> Save Event
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
