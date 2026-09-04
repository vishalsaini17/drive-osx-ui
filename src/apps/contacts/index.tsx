import React, { useState, useMemo, useEffect } from 'react';
import {
  Users,
  Search,
  Plus,
  Star,
  Tag,
  Building2,
  Briefcase,
  Mail,
  Phone,
  Globe,
  MapPin,
  Calendar as CalendarIcon,
  FileText,
  Share2,
  QrCode,
  Edit2,
  Trash2,
  Download,
  Upload,
  User,
  Video,
  MessageSquare,
  Award,
  MoreVertical,
  Check,
  ChevronRight,
  Sparkles,
  Layers,
  Building,
  Filter,
  Loader2,
  WifiOff,
  AlertTriangle,
  X
} from 'lucide-react';
import { Contact } from '../../platform/types';
import { useSystemStore } from '../../shell/state/systemStore';
import { useAppTheme } from '../../platform/theme/useAppTheme';
import { ContactsService } from '../../platform/contacts/ContactsService';
import { ApiError } from '../../platform/api/http';
import { toView, toInput, presenceLabel, presenceDotClass, type ContactView } from './adapter';
import { ContactsFilterState, DEFAULT_GROUPS } from './types';
import ContactFormModal from './components/ContactFormModal';
import BusinessCardModal from './components/BusinessCardModal';
import QRCodeModal from './components/QRCodeModal';
import ImportExportModal from './components/ImportExportModal';
import { exportContactToVCard, downloadVCardFile } from './utils/vcard';
import { useContainerWidth } from '../../platform/layout/useContainerWidth';

export default function ContactsApp() {
  const isLight = !useAppTheme('contacts').isDark;
  const openAppWindow = useSystemStore((state) => state.openAppWindow);
  const notifications = useSystemStore((state) => state.notifications);

  // Layout follows the *window*, not the browser viewport. Tailwind's `sm:` and
  // `md:` prefixes measure the screen, so in a 950px window on a 1400px display
  // they still fire — which is how a two-column detail grid ended up squeezed
  // into a 380px pane with the email running over the phone column.
  //
  // Three panes need roughly 240 + 300 + 420 to breathe, so they drop in order:
  // the labels sidebar first, then the list, leaving the detail full width.
  const { ref: rootRef, width } = useContainerWidth<HTMLDivElement>(0, 1100);
  const showGroups = width >= 940;
  const showList = width >= 660;

  // The detail pane measures *itself* rather than being derived from the window
  // width minus the other panes. Arithmetic would duplicate the `w-72`/`w-80`
  // classes below and drift from them — and it was wrong: at 940px the sidebar
  // reappears and takes 240px, leaving the detail too narrow for the two-column
  // grid even though the window had just got wider.
  const { ref: detailRef, width: detailWidth } = useContainerWidth<HTMLDivElement>(0, 620);
  const isNarrow = detailWidth < 460; // contact information falls to one column
  const isTight = detailWidth < 400; // stack the profile header

  // Contacts live in PostgreSQL, not in this browser. An account with no
  // contacts shows an empty state rather than invented people.
  const [contacts, setContacts] = useState<ContactView[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadContacts = React.useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const list = await ContactsService.list();
      setContacts(list.map(toView));
    } catch (error) {
      // Says which of the two it is, because the remedies differ: reconnect,
      // or sign in again.
      setLoadError(
        error instanceof ApiError && error.isOffline
          ? 'You are offline, so your contacts could not be loaded. They are stored on the server and will appear when you reconnect.'
          : error instanceof ApiError
            ? error.message
            : 'Your contacts could not be loaded.',
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadContacts();
  }, [loadContacts]);

  // Presence changes while the window is open, so the list is refreshed
  // periodically. Only while visible — a background tab polling for status
  // nobody is looking at is wasted work.
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== 'visible') return;
      ContactsService.list()
        .then((list) => setContacts(list.map(toView)))
        .catch(() => undefined); // A missed refresh is not worth interrupting for.
    };
    const timer = window.setInterval(refresh, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  // Selected Contact
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);

  // Filters State
  const [filterState, setFilterState] = useState<ContactsFilterState>({
    category: 'all',
    searchQuery: '',
  });

  // Modals State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [businessCardContact, setBusinessCardContact] = useState<Contact | null>(null);
  const [qrCodeContact, setQrCodeContact] = useState<Contact | null>(null);
  const [showImportExportModal, setShowImportExportModal] = useState(false);
  const [showDeleteConfirmId, setShowDeleteConfirmId] = useState<string | null>(null);

  // Toast message
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Available Labels
  const availableLabels = useMemo(() => {
    const labelSet = new Set<string>(['Work', 'Personal', 'Family', 'VIP', 'Tech Team', 'Marketing']);
    contacts.forEach((c) => c.labels?.forEach((l) => labelSet.add(l)));
    return Array.from(labelSet);
  }, [contacts]);

  // Available Companies
  const availableCompanies = useMemo(() => {
    const compSet = new Set<string>();
    contacts.forEach((c) => {
      if (c.company?.trim()) compSet.add(c.company.trim());
    });
    return Array.from(compSet);
  }, [contacts]);

  // Available Departments
  const availableDepartments = useMemo(() => {
    const deptSet = new Set<string>();
    contacts.forEach((c) => {
      if (c.department?.trim()) deptSet.add(c.department.trim());
    });
    return Array.from(deptSet);
  }, [contacts]);

  // Available Teams
  const availableTeams = useMemo(() => {
    const teamSet = new Set<string>();
    contacts.forEach((c) => {
      if (c.team?.trim()) teamSet.add(c.team.trim());
    });
    return Array.from(teamSet);
  }, [contacts]);

  // Filtered Contacts Logic
  const filteredContacts = useMemo(() => {
    return contacts.filter((c) => {
      const q = filterState.searchQuery.toLowerCase().trim();
      if (q) {
        const matchesName = `${c.firstName} ${c.lastName}`.toLowerCase().includes(q);
        const matchesEmail = c.email?.toLowerCase().includes(q);
        const matchesPhone = c.phone?.toLowerCase().includes(q);
        const matchesCompany = c.company?.toLowerCase().includes(q);
        const matchesTitle = c.jobTitle?.toLowerCase().includes(q);
        const matchesDept = c.department?.toLowerCase().includes(q);
        const matchesNotes = c.notes?.toLowerCase().includes(q);

        if (!matchesName && !matchesEmail && !matchesPhone && !matchesCompany && !matchesTitle && !matchesDept && !matchesNotes) {
          return false;
        }
      }

      if (filterState.category === 'favorites') {
        return c.isFavorite;
      }
      if (filterState.category === 'label' && filterState.selectedLabel) {
        return c.labels?.includes(filterState.selectedLabel);
      }
      if (filterState.category === 'company' && filterState.selectedCompany) {
        return c.company === filterState.selectedCompany;
      }
      if (filterState.category === 'department' && filterState.selectedDepartment) {
        return c.department === filterState.selectedDepartment;
      }
      if (filterState.category === 'team' && filterState.selectedTeam) {
        return c.team === filterState.selectedTeam;
      }

      return true;
    });
  }, [contacts, filterState]);

  // Group Contacts Alphabetically
  const groupedContacts = useMemo(() => {
    const sorted = [...filteredContacts].sort((a, b) =>
      a.firstName.localeCompare(b.firstName)
    );

    const groups: { [key: string]: ContactView[] } = {};
    sorted.forEach((contact) => {
      const char = contact.firstName[0]?.toUpperCase() || '#';
      if (!groups[char]) groups[char] = [];
      groups[char].push(contact);
    });
    return groups;
  }, [filteredContacts]);

  // Currently Selected Contact
  const activeContact = useMemo(() => {
    const chosen = contacts.find((c) => c.id === selectedContactId);
    if (chosen) return chosen;
    // Falling back to the first contact stops the detail pane sitting empty
    // beside the list. With the list hidden that same fallback would make the
    // list unreachable — nothing could ever deselect — so it only applies
    // while both panes are on screen.
    return showList ? filteredContacts[0] ?? null : null;
  }, [contacts, selectedContactId, filteredContacts, showList]);

  /**
   * Turns a failed write into something the user can act on.
   *
   * Every mutation here goes to the server, so any of them can fail for a
   * reason the user needs to know about — being offline is not the same as
   * being denied. Reporting "saved" for a write the server rejected is the
   * failure mode this exists to prevent.
   */
  const reportFailure = (action: string, error: unknown): void => {
    if (error instanceof ApiError && error.isOffline) {
      setActionError(`${action} needs a connection. You are offline — reconnect and try again.`);
    } else if (error instanceof ApiError) {
      setActionError(`${action} failed: ${error.message}`);
    } else {
      setActionError(`${action} failed. Please try again.`);
    }
  };

  // CRUD Actions — each persists before the list is updated, so what is on
  // screen is what the server actually holds.
  const handleSaveContact = async (data: Omit<Contact, 'id'>) => {
    setActionError(null);
    const name = `${data.firstName} ${data.lastName}`.trim();

    try {
      if (editingContact) {
        const updated = await ContactsService.update(editingContact.id, toInput(data));
        setContacts((prev) => prev.map((c) => (c.id === updated.id ? toView(updated) : c)));
        triggerToast(`Updated ${name}`);
        setEditingContact(null);
      } else {
        const created = await ContactsService.create(toInput(data));
        setContacts((prev) => [toView(created), ...prev]);
        setSelectedContactId(created.id);
        triggerToast(`Created contact ${name}`);
        setShowCreateModal(false);
      }
    } catch (error) {
      reportFailure(editingContact ? 'Updating the contact' : 'Creating the contact', error);
    }
  };

  const handleDeleteContact = async (id: string) => {
    setActionError(null);
    const target = contacts.find((c) => c.id === id);

    try {
      await ContactsService.remove(id);
    } catch (error) {
      reportFailure('Deleting the contact', error);
      setShowDeleteConfirmId(null);
      return; // Leave the row in place: it still exists on the server.
    }

    const remaining = contacts.filter((c) => c.id !== id);
    setContacts(remaining);
    setShowDeleteConfirmId(null);
    if (selectedContactId === id) setSelectedContactId(remaining[0]?.id || null);
    triggerToast(`Deleted ${target?.firstName || 'contact'}`);
  };

  const toggleFavorite = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setActionError(null);

    const current = contacts.find((c) => c.id === id);
    if (!current) return;
    const next = !current.isFavorite;

    // Optimistic: a star should respond instantly. Reverted below if the
    // server disagrees, rather than left showing a state that was not saved.
    setContacts((prev) => prev.map((c) => (c.id === id ? { ...c, isFavorite: next } : c)));

    try {
      await ContactsService.update(id, { isFavourite: next });
    } catch (error) {
      setContacts((prev) => prev.map((c) => (c.id === id ? { ...c, isFavorite: !next } : c)));
      reportFailure('Changing the favourite', error);
    }
  };

  const handleBatchImport = async (importedList: Partial<Contact>[]) => {
    setActionError(null);

    // Imports are sent one at a time so a single bad row cannot lose the whole
    // file, and the user is told exactly how many of each there were.
    const results = await Promise.allSettled(
      importedList.map((item) =>
        ContactsService.create({
          ...toInput(item),
          displayName: `${item.firstName || 'Unnamed'} ${item.lastName || ''}`.trim(),
          labels: item.labels?.length ? item.labels : ['Imported'],
        }),
      ),
    );

    const created = results
      .filter((r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof ContactsService.create>>> =>
        r.status === 'fulfilled',
      )
      .map((r) => toView(r.value));
    const failed = results.length - created.length;

    if (created.length > 0) setContacts((prev) => [...created, ...prev]);

    if (failed > 0) {
      setActionError(
        `Imported ${created.length} of ${results.length} contacts. ${failed} could not be saved — check those rows and try again.`,
      );
    } else {
      triggerToast(`Successfully imported ${created.length} contacts!`);
    }
  };

  // Cross-App Integrations
  const handleOpenAppIntegration = (appId: string, payload?: any) => {
    openAppWindow(appId);
    if (appId === 'mail' && payload?.to) {
      window.dispatchEvent(
        new CustomEvent('open-mail-compose', { detail: { to: payload.to } })
      );
    } else if (appId === 'messenger' && payload?.contact) {
      window.dispatchEvent(
        new CustomEvent('open-messages-chat', {
          detail: { contact: payload.contact, email: payload.email },
        })
      );
    } else if (appId === 'calendar' && payload?.attendee) {
      window.dispatchEvent(
        new CustomEvent('open-calendar-event', {
          detail: { attendee: payload.attendee },
        })
      );
    } else if (appId === 'meeting' && payload?.invitee) {
      window.dispatchEvent(
        new CustomEvent('open-osx-meet', {
          detail: { invitee: payload.invitee },
        })
      );
    }
    triggerToast(`Opened ${appId.toUpperCase()} integration`);
  };

  // Quick Copy Share
  const handleShareContactText = (c: Contact) => {
    const vcardStr = exportContactToVCard(c);
    navigator.clipboard.writeText(vcardStr);
    triggerToast(`Copied ${c.firstName}'s vCard to clipboard`);
  };

  return (
    <div
      ref={rootRef}
      className={`w-full h-full flex flex-col font-sans select-none overflow-hidden transition-colors ${
        isLight ? 'bg-slate-100 text-slate-800' : 'bg-zinc-950 text-white'
      }`}
    >
      {/* System Toast Notifier */}
      {toastMsg && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[9999] px-4 py-2 bg-indigo-600 text-white font-semibold text-xs rounded-full shadow-xl animate-bounce flex items-center gap-2">
          <Sparkles size={14} />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* A write that failed stays on screen until dismissed. A toast that
          disappears after three seconds is the wrong shape for "your change
          was not saved". */}
      {actionError && (
        <div
          role="alert"
          className="shrink-0 px-4 py-2.5 bg-rose-500/10 border-b border-rose-500/30 flex items-start gap-2.5"
        >
          <AlertTriangle size={15} className="text-rose-400 shrink-0 mt-0.5" />
          <p className={`flex-1 text-[11px] leading-relaxed ${isLight ? 'text-rose-800' : 'text-rose-200'}`}>
            {actionError}
          </p>
          <button
            onClick={() => setActionError(null)}
            aria-label="Dismiss error"
            className={`shrink-0 p-1 rounded cursor-pointer ${
              isLight ? 'hover:bg-rose-500/15 text-rose-700' : 'hover:bg-rose-500/20 text-rose-300'
            }`}
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* Main Container Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Navigation Sidebar — the first pane to go when space is short. */}
        <div
          className={`w-60 border-r flex-col shrink-0 ${showGroups ? 'flex' : 'hidden'} ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-900/90 border-zinc-800'
          }`}
        >
          {/* Top Header */}
          <div className="p-4 border-b border-inherit flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-md">
                <Users size={18} />
              </div>
              <div>
                <h1 className="font-extrabold text-sm tracking-tight leading-none">Contacts</h1>
                <span className="text-[10px] text-zinc-400 font-medium">OSX Address Book</span>
              </div>
            </div>

            <button
              onClick={() => setShowCreateModal(true)}
              className="p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow transition-all cursor-pointer"
              title="Create Contact"
            >
              <Plus size={16} />
            </button>
          </div>

          {/* Navigation Links */}
          <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar text-xs">
            {/* Primary Categories */}
            <div className="space-y-1">
              <button
                onClick={() => setFilterState({ category: 'all', searchQuery: '' })}
                className={`w-full px-3 py-2 rounded-xl font-semibold flex items-center justify-between transition-all cursor-pointer ${
                  filterState.category === 'all'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : isLight
                    ? 'hover:bg-slate-200/60 text-slate-700'
                    : 'hover:bg-zinc-800 text-zinc-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Users size={15} />
                  <span>All Contacts</span>
                </div>
                <span className="text-[10px] opacity-80 font-bold">{contacts.length}</span>
              </button>

              <button
                onClick={() => setFilterState({ category: 'favorites', searchQuery: '' })}
                className={`w-full px-3 py-2 rounded-xl font-semibold flex items-center justify-between transition-all cursor-pointer ${
                  filterState.category === 'favorites'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : isLight
                    ? 'hover:bg-slate-200/60 text-slate-700'
                    : 'hover:bg-zinc-800 text-zinc-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Star size={15} className="text-amber-400 fill-amber-400" />
                  <span>Favorites</span>
                </div>
                <span className="text-[10px] opacity-80 font-bold">
                  {contacts.filter((c) => c.isFavorite).length}
                </span>
              </button>
            </div>

            {/* Labels / Groups */}
            <div className="space-y-1">
              <span className={`px-2 text-[10px] font-bold uppercase tracking-wider ${isLight ? 'text-slate-400' : 'text-zinc-500'}`}>
                Labels & Groups
              </span>
              {availableLabels.map((lbl) => {
                const count = contacts.filter((c) => c.labels?.includes(lbl)).length;
                const isSelected = filterState.category === 'label' && filterState.selectedLabel === lbl;
                return (
                  <button
                    key={lbl}
                    onClick={() => setFilterState({ category: 'label', selectedLabel: lbl, searchQuery: '' })}
                    className={`w-full px-3 py-1.5 rounded-xl text-xs font-medium flex items-center justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                        : isLight
                        ? 'hover:bg-slate-200/60 text-slate-600'
                        : 'hover:bg-zinc-800 text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Tag size={13} className="text-indigo-400" />
                      <span>{lbl}</span>
                    </div>
                    <span className="text-[10px] opacity-70">{count}</span>
                  </button>
                );
              })}
            </div>

            {/* Companies */}
            {availableCompanies.length > 0 && (
              <div className="space-y-1">
                <span className={`px-2 text-[10px] font-bold uppercase tracking-wider ${isLight ? 'text-slate-400' : 'text-zinc-500'}`}>
                  Companies
                </span>
                {availableCompanies.map((comp) => {
                  const count = contacts.filter((c) => c.company === comp).length;
                  const isSelected = filterState.category === 'company' && filterState.selectedCompany === comp;
                  return (
                    <button
                      key={comp}
                      onClick={() => setFilterState({ category: 'company', selectedCompany: comp, searchQuery: '' })}
                      className={`w-full px-3 py-1.5 rounded-xl text-xs font-medium flex items-center justify-between transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                          : isLight
                          ? 'hover:bg-slate-200/60 text-slate-600'
                          : 'hover:bg-zinc-800 text-zinc-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Building2 size={13} className="text-blue-400 shrink-0" />
                        <span className="truncate">{comp}</span>
                      </div>
                      <span className="text-[10px] opacity-70 shrink-0">{count}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Import / Export Footer Button */}
          <div className="p-3 border-t border-inherit">
            <button
              onClick={() => setShowImportExportModal(true)}
              className={`w-full py-2 px-3 rounded-xl border font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                isLight
                  ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
                  : 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-200'
              }`}
            >
              <Download size={14} />
              <span>Import / Export CSV</span>
            </button>
          </div>
        </div>

        {/* Middle Column: Contact Search & List */}
        <div
          className={`border-r flex-col ${
            showList ? `flex shrink-0 ${width >= 1040 ? 'w-80' : 'w-72'}` : activeContact ? 'hidden' : 'flex flex-1 min-w-0'
          } ${
            isLight ? 'bg-white border-slate-200' : 'bg-zinc-900 border-zinc-800'
          }`}
        >
          {/* Search Box */}
          <div className="p-3 border-b border-inherit space-y-2">
            <div className="flex items-center gap-2">
              <div className="relative flex-1 min-w-0">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
                <input
                  type="text"
                  value={filterState.searchQuery}
                  onChange={(e) => setFilterState({ ...filterState, searchQuery: e.target.value })}
                  placeholder={showGroups ? 'Search name, email, phone...' : 'Search contacts...'}
                  className={`w-full pl-9 pr-3 py-2 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    isLight ? 'bg-slate-100 border-slate-200' : 'bg-zinc-800 border-zinc-700 text-white'
                  }`}
                />
              </div>

              {/* Creating a contact lives in the sidebar. When the sidebar is
                  hidden the action has to reappear here, or it is simply gone. */}
              {!showGroups && (
                <>
                  <button
                    onClick={() => setShowImportExportModal(true)}
                    className={`shrink-0 p-2 rounded-xl border transition-all cursor-pointer ${
                      isLight
                        ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
                        : 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-200'
                    }`}
                    title="Import / Export CSV"
                    aria-label="Import or export contacts"
                  >
                    <Download size={15} />
                  </button>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="shrink-0 p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow transition-all cursor-pointer"
                    title="Create Contact"
                    aria-label="Create contact"
                  >
                    <Plus size={16} />
                  </button>
                </>
              )}
            </div>

            {/* Same reasoning for the group filters: reduced to a scrolling row
                of chips rather than dropped. */}
            {!showGroups && (
              <div className="flex gap-1.5 overflow-x-auto custom-scrollbar pb-0.5">
                {([
                  { id: 'all', label: 'All' },
                  { id: 'favorites', label: 'Favourites' },
                ] as const).map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => setFilterState({ ...filterState, category: id, selectedLabel: undefined })}
                    className={`shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer transition-colors ${
                      filterState.category === id
                        ? 'bg-indigo-600 text-white'
                        : isLight
                          ? 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                          : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                    }`}
                  >
                    {label}
                  </button>
                ))}
                {availableLabels.map((label) => (
                  <button
                    key={label}
                    onClick={() =>
                      setFilterState({ ...filterState, category: 'label', selectedLabel: label })
                    }
                    className={`shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer transition-colors ${
                      filterState.category === 'label' && filterState.selectedLabel === label
                        ? 'bg-indigo-600 text-white'
                        : isLight
                          ? 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                          : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Contact List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {isLoading ? (
              <div className="p-8 text-center space-y-3" role="status" aria-live="polite">
                <Loader2 size={28} className="mx-auto text-indigo-400 animate-spin" />
                <p className={`text-xs font-semibold ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                  Loading your contacts…
                </p>
              </div>
            ) : loadError ? (
              <div className="p-6 text-center space-y-3" role="alert">
                <WifiOff size={28} className="mx-auto text-amber-400" />
                <p className={`text-xs font-semibold ${isLight ? 'text-slate-700' : 'text-zinc-200'}`}>
                  Could not load contacts
                </p>
                <p className={`text-[11px] leading-relaxed ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                  {loadError}
                </p>
                <button
                  onClick={() => void loadContacts()}
                  className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold cursor-pointer hover:bg-indigo-500"
                >
                  Retry
                </button>
              </div>
            ) : contacts.length === 0 ? (
              // Genuinely empty account, as opposed to a filter matching nothing.
              <div className="p-8 text-center space-y-3">
                <Users size={32} className="mx-auto text-zinc-500 opacity-50" />
                <p className={`text-xs font-semibold ${isLight ? 'text-slate-700' : 'text-zinc-200'}`}>
                  No contacts yet
                </p>
                <p className={`text-[11px] leading-relaxed ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                  People are added here automatically when a chat request is accepted in Messenger.
                  You can also add someone yourself.
                </p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold cursor-pointer hover:bg-indigo-500"
                >
                  + Create Contact
                </button>
              </div>
            ) : Object.keys(groupedContacts).length === 0 ? (
              // Contacts exist, but none match the current search or filter.
              <div className="p-8 text-center space-y-2">
                <Search size={28} className="mx-auto text-zinc-500 opacity-50" />
                <p className={`text-xs font-semibold ${isLight ? 'text-slate-700' : 'text-zinc-200'}`}>
                  No contacts match
                </p>
                <p className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                  Try a different search or clear the filter.
                </p>
                <button
                  onClick={() => setFilterState({ category: 'all', searchQuery: '' })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                    isLight ? 'bg-slate-200 hover:bg-slate-300 text-slate-700' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                  }`}
                >
                  Clear filters
                </button>
              </div>
            ) : (
              Object.entries(groupedContacts).map(([char, groupList]) => (
                <div key={char}>
                  <div
                    className={`sticky top-0 px-4 py-1 font-bold text-[10px] tracking-wider uppercase border-b border-t ${
                      isLight
                        ? 'bg-slate-100/90 text-slate-500 border-slate-200'
                        : 'bg-zinc-950/80 text-zinc-400 border-zinc-800'
                    }`}
                  >
                    {char}
                  </div>
                  {groupList.map((c) => {
                    const isSelected = activeContact?.id === c.id;
                    const initials = `${c.firstName[0] || ''}${c.lastName[0] || ''}`.toUpperCase();
                    const bgGrad = c.avatarBg || 'bg-gradient-to-br from-indigo-500 to-purple-600';

                    return (
                      <div
                        key={c.id}
                        onClick={() => setSelectedContactId(c.id)}
                        className={`px-4 py-3 border-b flex items-center gap-3 cursor-pointer transition-all ${
                          isSelected
                            ? isLight
                              ? 'bg-indigo-50 border-indigo-200'
                              : 'bg-indigo-950/40 border-indigo-900/60'
                            : isLight
                            ? 'hover:bg-slate-50 border-slate-100'
                            : 'hover:bg-zinc-800/50 border-zinc-800/60'
                        }`}
                      >
                        {/* Avatar, with a live connection indicator for people
                            who actually have an account. */}
                        <div className="relative shrink-0">
                          {c.photo ? (
                            <img
                              src={c.photo}
                              alt={c.firstName}
                              className="w-10 h-10 rounded-full object-cover border border-zinc-300 dark:border-zinc-700"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div
                              className={`w-10 h-10 rounded-full ${bgGrad} flex items-center justify-center text-white font-bold text-xs shadow-sm`}
                            >
                              {initials}
                            </div>
                          )}
                          {c.userId && (
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 ${
                                isLight ? 'border-white' : 'border-zinc-900'
                              } ${presenceDotClass(c.presence)}`}
                              title={presenceLabel(c)}
                              aria-label={presenceLabel(c)}
                            />
                          )}
                        </div>

                        {/* Name & connection status */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="font-bold text-xs truncate">
                              {c.firstName} {c.lastName}
                            </h3>
                            {c.isFavorite && (
                              <Star size={12} className="text-amber-400 fill-amber-400 shrink-0 ml-1" />
                            )}
                          </div>
                          <p className={`text-[11px] truncate ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                            {/* Connection state is the more useful line for a
                                platform user; a job title is all an external
                                contact has. */}
                            {c.userId
                              ? presenceLabel(c)
                              : c.jobTitle || c.company || c.email || 'No company info'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Contact Detailed Profile View */}
        <div
          ref={detailRef}
          className={`flex-1 min-w-0 flex-col overflow-y-auto custom-scrollbar ${
            showList || activeContact ? 'flex' : 'hidden'
          }`}
        >
          {activeContact ? (
            <div className={`max-w-3xl mx-auto w-full space-y-6 ${isTight ? 'p-4' : 'p-6'}`}>
              {/* With the list pane hidden there is no other way back to it, so
                  the detail grows its own return control. */}
              {!showList && (
                <button
                  onClick={() => setSelectedContactId(null)}
                  className={`flex items-center gap-1.5 -mb-2 text-xs font-semibold rounded-lg px-2 py-1.5 cursor-pointer transition-colors ${
                    isLight ? 'text-slate-600 hover:bg-slate-200' : 'text-zinc-300 hover:bg-zinc-800'
                  }`}
                >
                  <ChevronRight size={14} className="rotate-180" />
                  All contacts
                </button>
              )}

              {/* Profile Card Header */}
              <div
                className={`p-6 rounded-3xl border shadow-lg flex justify-between gap-5 relative ${
                  isTight ? 'flex-col items-center' : 'flex-row items-start'
                } ${isLight ? 'bg-white border-slate-200' : 'bg-zinc-900 border-zinc-800'}`}
              >
                {/* Contact Avatar & Info */}
                <div
                  className={`flex gap-5 min-w-0 ${
                    isTight ? 'flex-col items-center text-center' : 'flex-row items-start text-left'
                  }`}
                >
                  {activeContact.photo ? (
                    <img
                      src={activeContact.photo}
                      alt={activeContact.firstName}
                      className="w-24 h-24 rounded-full object-cover border-4 border-indigo-500/30 shadow-xl"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div
                      className={`w-24 h-24 rounded-full ${
                        activeContact.avatarBg || 'bg-gradient-to-br from-indigo-500 to-purple-600'
                      } flex items-center justify-center text-white font-extrabold text-3xl shadow-xl`}
                    >
                      {activeContact.firstName[0]}
                      {activeContact.lastName[0] || ''}
                    </div>
                  )}

                  <div className="space-y-1 min-w-0">
                    <div className={`flex items-center gap-2 ${isTight ? 'justify-center' : 'justify-start'}`}>
                      <h2 className="text-2xl font-black tracking-tight break-words min-w-0">
                        {activeContact.firstName} {activeContact.lastName}
                      </h2>
                      <button
                        onClick={(e) => toggleFavorite(activeContact.id, e)}
                        className="p-1 rounded-full hover:scale-110 transition-transform cursor-pointer"
                        title={activeContact.isFavorite ? 'Remove Favorite' : 'Add to Favorites'}
                      >
                        <Star
                          size={20}
                          className={
                            activeContact.isFavorite
                              ? 'text-amber-400 fill-amber-400'
                              : 'text-zinc-400 hover:text-amber-400'
                          }
                        />
                      </button>
                    </div>

                    {activeContact.jobTitle && (
                      <p className="text-sm font-semibold text-indigo-500 dark:text-indigo-400">
                        {activeContact.jobTitle}
                      </p>
                    )}

                    {activeContact.company && (
                      <p className={`text-xs font-medium ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                        {activeContact.company}{' '}
                        {activeContact.department ? `• ${activeContact.department}` : ''}
                      </p>
                    )}

                    {/* Labels Badges */}
                    {activeContact.labels && activeContact.labels.length > 0 && (
                      <div className={`flex flex-wrap gap-1.5 pt-2 ${isTight ? 'justify-center' : 'justify-start'}`}>
                        {activeContact.labels.map((lbl) => (
                          <span
                            key={lbl}
                            className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-500 dark:text-indigo-300 border border-indigo-500/20"
                          >
                            {lbl}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions Toolbar */}
                <div className={`flex gap-2 shrink-0 flex-wrap ${isTight ? 'flex-row' : 'flex-col'}`}>
                  <button
                    onClick={() => setEditingContact(activeContact)}
                    className={`p-2.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-center gap-2 text-xs font-semibold ${
                      isLight
                        ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                        : 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-200'
                    }`}
                    title="Edit Contact"
                  >
                    <Edit2 size={16} />
                    {!isNarrow && <span>Edit</span>}
                  </button>

                  <button
                    onClick={() => setBusinessCardContact(activeContact)}
                    className="p-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                    title="Digital Business Card"
                  >
                    <Award size={16} />
                    {!isNarrow && <span>Card</span>}
                  </button>

                  <button
                    onClick={() => setQrCodeContact(activeContact)}
                    className={`p-2.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-center gap-2 text-xs font-semibold ${
                      isLight
                        ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                        : 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-200'
                    }`}
                    title="QR Code"
                  >
                    <QrCode size={16} />
                  </button>

                  <button
                    onClick={() => setShowDeleteConfirmId(activeContact.id)}
                    className="p-2.5 rounded-2xl bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 font-semibold text-xs transition-all cursor-pointer flex items-center justify-center"
                    title="Delete Contact"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Quick Actions Row */}
              <div className={`grid gap-3 ${isTight ? 'grid-cols-2' : 'grid-cols-4'}`}>
                <button
                  onClick={() => handleOpenAppIntegration('mail', { to: activeContact.email })}
                  className={`p-4 rounded-2xl border flex flex-col items-center justify-center text-center gap-1.5 transition-all cursor-pointer group ${
                    isLight
                      ? 'bg-white hover:bg-indigo-50 border-slate-200 hover:border-indigo-300 text-slate-800'
                      : 'bg-zinc-900 hover:bg-indigo-950/40 border-zinc-800 hover:border-indigo-500/40 text-white'
                  }`}
                >
                  <Mail className="w-5 h-5 text-indigo-500 group-hover:scale-110 transition-transform" />
                  <span className="font-bold text-xs">Mail Studio</span>
                  <span className="text-[10px] text-zinc-400">Send Email</span>
                </button>

                <button
                  onClick={() =>
                    handleOpenAppIntegration('messenger', {
                      contact: `${activeContact.firstName} ${activeContact.lastName}`,
                      email: activeContact.email,
                    })
                  }
                  className={`p-4 rounded-2xl border flex flex-col items-center justify-center text-center gap-1.5 transition-all cursor-pointer group ${
                    isLight
                      ? 'bg-white hover:bg-emerald-50 border-slate-200 hover:border-emerald-300 text-slate-800'
                      : 'bg-zinc-900 hover:bg-emerald-950/40 border-zinc-800 hover:border-emerald-500/40 text-white'
                  }`}
                >
                  <MessageSquare className="w-5 h-5 text-emerald-500 group-hover:scale-110 transition-transform" />
                  <span className="font-bold text-xs">Messages</span>
                  <span className="text-[10px] text-zinc-400">Chat & SMS</span>
                </button>

                <button
                  onClick={() => handleOpenAppIntegration('meeting', { invitee: `${activeContact.firstName} ${activeContact.lastName}` })}
                  className={`p-4 rounded-2xl border flex flex-col items-center justify-center text-center gap-1.5 transition-all cursor-pointer group ${
                    isLight
                      ? 'bg-white hover:bg-blue-50 border-slate-200 hover:border-blue-300 text-slate-800'
                      : 'bg-zinc-900 hover:bg-blue-950/40 border-zinc-800 hover:border-blue-500/40 text-white'
                  }`}
                >
                  <Video className="w-5 h-5 text-blue-500 group-hover:scale-110 transition-transform" />
                  <span className="font-bold text-xs">OSX Meet</span>
                  <span className="text-[10px] text-zinc-400">Video Call</span>
                </button>

                <button
                  onClick={() => handleOpenAppIntegration('calendar', { attendee: activeContact.email })}
                  className={`p-4 rounded-2xl border flex flex-col items-center justify-center text-center gap-1.5 transition-all cursor-pointer group ${
                    isLight
                      ? 'bg-white hover:bg-amber-50 border-slate-200 hover:border-amber-300 text-slate-800'
                      : 'bg-zinc-900 hover:bg-amber-950/40 border-zinc-800 hover:border-amber-500/40 text-white'
                  }`}
                >
                  <CalendarIcon className="w-5 h-5 text-amber-500 group-hover:scale-110 transition-transform" />
                  <span className="font-bold text-xs">Calendar</span>
                  <span className="text-[10px] text-zinc-400">Schedule</span>
                </button>
              </div>

              {/* Detailed Specs Grid */}
              <div
                className={`p-6 rounded-3xl border space-y-4 ${
                  isLight ? 'bg-white border-slate-200' : 'bg-zinc-900 border-zinc-800'
                }`}
              >
                <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-400">
                  Contact Information
                </h3>

                <div className={`grid gap-4 text-xs ${isNarrow ? 'grid-cols-1' : 'grid-cols-2'}`}>
                  {/* Email */}
                  <div className="space-y-1 min-w-0">
                    <span className="text-[10px] text-zinc-400 font-bold uppercase">Email</span>
                    <div className="flex items-start gap-2 min-w-0">
                      <Mail size={15} className="text-indigo-500 shrink-0" />
                      <span className="font-mono font-medium break-all min-w-0">{activeContact.email || 'Not provided'}</span>
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="space-y-1 min-w-0">
                    <span className="text-[10px] text-zinc-400 font-bold uppercase">Phone</span>
                    <div className="flex items-start gap-2 min-w-0">
                      <Phone size={15} className="text-emerald-500 shrink-0" />
                      <span className="font-mono font-medium break-all min-w-0">{activeContact.phone || 'Not provided'}</span>
                    </div>
                  </div>

                  {/* Company & Department */}
                  <div className="space-y-1 min-w-0">
                    <span className="text-[10px] text-zinc-400 font-bold uppercase">Organization</span>
                    <div className="flex items-start gap-2 min-w-0">
                      <Building2 size={15} className="text-blue-500 shrink-0" />
                      <span className="break-words min-w-0">
                        {activeContact.company || 'N/A'}{' '}
                        {activeContact.department ? `(${activeContact.department})` : ''}
                      </span>
                    </div>
                  </div>

                  {/* Job Title & Team */}
                  <div className="space-y-1 min-w-0">
                    <span className="text-[10px] text-zinc-400 font-bold uppercase">Job Title & Team</span>
                    <div className="flex items-start gap-2 min-w-0">
                      <Briefcase size={15} className="text-amber-500 shrink-0" />
                      <span className="break-words min-w-0">
                        {activeContact.jobTitle || 'N/A'}{' '}
                        {activeContact.team ? `• ${activeContact.team}` : ''}
                      </span>
                    </div>
                  </div>

                  {/* Address */}
                  <div className="space-y-1 min-w-0">
                    <span className="text-[10px] text-zinc-400 font-bold uppercase">Address</span>
                    <div className="flex items-start gap-2 min-w-0">
                      <MapPin size={15} className="text-rose-500 shrink-0" />
                      <span className="break-words min-w-0">{activeContact.address || 'N/A'}</span>
                    </div>
                  </div>

                  {/* Website */}
                  <div className="space-y-1 min-w-0">
                    <span className="text-[10px] text-zinc-400 font-bold uppercase">Website</span>
                    <div className="flex items-start gap-2 min-w-0">
                      <Globe size={15} className="text-purple-500 shrink-0" />
                      {activeContact.website ? (
                        <a
                          href={activeContact.website}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-400 hover:underline font-mono break-all min-w-0"
                        >
                          {activeContact.website}
                        </a>
                      ) : (
                        <span>N/A</span>
                      )}
                    </div>
                  </div>

                  {/* Birthday */}
                  <div className="space-y-1 min-w-0">
                    <span className="text-[10px] text-zinc-400 font-bold uppercase">Birthday</span>
                    <div className="flex items-start gap-2 min-w-0">
                      <CalendarIcon size={15} className="text-cyan-500 shrink-0" />
                      <span>{activeContact.birthday || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {activeContact.notes && (
                  <div className="pt-3 border-t border-inherit space-y-1">
                    <span className="text-[10px] text-zinc-400 font-bold uppercase">Notes</span>
                    <p className={`p-3 rounded-2xl text-xs ${isLight ? 'bg-slate-50' : 'bg-zinc-800/60'}`}>
                      {activeContact.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-zinc-400 space-y-3">
              <Users size={48} className="text-zinc-500 opacity-40" />
              <h3 className="font-bold text-base">Select a contact to view details</h3>
              <p className="text-xs max-w-sm">
                Choose a contact from the list on the left or create a new contact to get started.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showCreateModal && (
        <ContactFormModal
          onSave={handleSaveContact}
          onClose={() => setShowCreateModal(false)}
          isLight={isLight}
          availableLabels={availableLabels}
        />
      )}

      {editingContact && (
        <ContactFormModal
          initialContact={editingContact}
          onSave={handleSaveContact}
          onClose={() => setEditingContact(null)}
          isLight={isLight}
          availableLabels={availableLabels}
        />
      )}

      {businessCardContact && (
        <BusinessCardModal
          contact={businessCardContact}
          onClose={() => setBusinessCardContact(null)}
          isLight={isLight}
          onOpenApp={handleOpenAppIntegration}
          onCopySuccess={() => triggerToast('Business Card copied to clipboard')}
        />
      )}

      {qrCodeContact && (
        <QRCodeModal
          contact={qrCodeContact}
          onClose={() => setQrCodeContact(null)}
          isLight={isLight}
          onCopySuccess={() => triggerToast('vCard copied to clipboard')}
        />
      )}

      {showImportExportModal && (
        <ImportExportModal
          contacts={contacts}
          onImport={handleBatchImport}
          onClose={() => setShowImportExportModal(false)}
          isLight={isLight}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirmId && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div
            className={`w-full max-w-sm rounded-3xl p-6 shadow-2xl border flex flex-col items-center text-center space-y-4 ${
              isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-zinc-900 border-zinc-700 text-white'
            }`}
          >
            <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center font-bold text-xl">
              <Trash2 size={24} />
            </div>
            <div>
              <h3 className="font-bold text-base">Delete Contact?</h3>
              <p className="text-xs text-zinc-400 mt-1">
                Are you sure you want to delete this contact? This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-2 w-full pt-2">
              <button
                onClick={() => setShowDeleteConfirmId(null)}
                className={`flex-1 py-2 text-xs font-semibold rounded-xl border ${
                  isLight ? 'bg-slate-100 hover:bg-slate-200 border-slate-300' : 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteContact(showDeleteConfirmId)}
                className="flex-1 py-2 text-xs font-bold rounded-xl bg-red-600 hover:bg-red-500 text-white shadow-md cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
