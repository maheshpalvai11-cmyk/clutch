'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Settings,
  Power,
  Building,
  Plus,
  CheckCircle,
  XCircle,
  Megaphone,
  Save,
  HelpCircle,
  Database,
} from 'lucide-react';
import { Campus, EventSettings } from '@/types/database';
import { useToast } from '@/components/ui/Toast';

export default function AdminSettingsPage() {
  const { success, error } = useToast();
  const [settings, setSettings] = useState<EventSettings | null>(null);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [loading, setLoading] = useState(true);
  const [storageType, setStorageType] = useState<'supabase' | 'local'>('local');

  // Form states
  const [eventName, setEventName] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);

  // New Campus state
  const [newCampusName, setNewCampusName] = useState('');
  const [addingCampus, setAddingCampus] = useState(false);

  const fetchSettingsAndCampuses = useCallback(async () => {
    try {
      const [statsRes, campusesRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/admin/campuses'),
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setSettings(statsData.settings);
        setStorageType(statsData.storageType || 'local');
        setEventName(statsData.settings?.event_name || 'CampusBite Fest');
        setAnnouncement(
          statsData.settings?.announcement ||
            'Welcome! Food order collection is actively running across campuses.'
        );
      }

      if (campusesRes.ok) {
        const campusesData = await campusesRes.json();
        setCampuses(campusesData.campuses || []);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error loading settings';
      error(msg);
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    fetchSettingsAndCampuses();
  }, [fetchSettingsAndCampuses]);

  // Toggle Open/Close Ordering
  const handleToggleOrdering = async () => {
    if (!settings) return;
    const nextState = !settings.ordering_open;

    try {
      const res = await fetch('/api/admin/toggle-ordering', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ordering_open: nextState }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update ordering status');

      setSettings((prev) => (prev ? { ...prev, ordering_open: nextState } : null));
      success(
        nextState
          ? 'Ordering is now OPEN. Friends can take and edit orders.'
          : 'Ordering is now CLOSED. Friends cannot take new orders or edit existing ones.',
        'Ordering Control'
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error toggling ordering';
      error(msg);
    }
  };

  // Save Event Details
  const handleSaveEventDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    setSavingSettings(true);
    try {
      const res = await fetch('/api/admin/toggle-ordering', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ordering_open: settings.ordering_open,
          event_name: eventName.trim(),
          announcement: announcement.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save event settings');

      success('Event settings updated successfully', 'Settings Saved');
      setSettings(data.settings);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error';
      error(msg);
    } finally {
      setSavingSettings(false);
    }
  };

  // Add Dynamic Campus
  const handleAddCampus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCampusName.trim()) {
      error('Campus name cannot be empty');
      return;
    }

    setAddingCampus(true);
    try {
      const res = await fetch('/api/admin/campuses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCampusName.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add campus');

      success(`Campus "${newCampusName}" added successfully!`, 'Campus Created');
      setNewCampusName('');
      fetchSettingsAndCampuses();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error adding campus';
      error(msg);
    } finally {
      setAddingCampus(false);
    }
  };

  // Toggle Campus Active Status
  const handleToggleCampus = async (campus: Campus) => {
    const nextStatus = !campus.is_active;
    try {
      const res = await fetch('/api/admin/campuses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: campus.id, is_active: nextStatus }),
      });

      if (!res.ok) throw new Error('Failed to update campus');
      success(
        `Campus "${campus.name}" is now ${nextStatus ? 'Active' : 'Disabled'}`,
        'Campus Updated'
      );
      fetchSettingsAndCampuses();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error';
      error(msg);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isOrderingOpen = settings?.ordering_open ?? true;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
          <Settings className="w-7 h-7 text-brand-600" />
          Event &amp; System Settings
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Master control for order intake, event announcements, and dynamic campus locations
        </p>
      </div>

      {/* 1. MASTER ORDERING SWITCH */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Power className="w-5 h-5 text-brand-600" />
              Master Ordering Control
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Instantly open or close food ordering across all campuses and friend accounts
            </p>
          </div>

          <button
            onClick={handleToggleOrdering}
            className={`px-5 py-2.5 rounded-xl text-xs font-black shadow-md transition-all cursor-pointer flex items-center gap-2 ${
              isOrderingOpen
                ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
            }`}
          >
            <Power className="w-4 h-4" />
            <span>{isOrderingOpen ? 'Close Ordering' : 'Open Ordering'}</span>
          </button>
        </div>

        <div
          className={`p-4 rounded-xl border flex items-start gap-3 ${
            isOrderingOpen
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
              : 'bg-rose-50/70 border-rose-200 text-rose-900'
          }`}
        >
          <div
            className={`w-3 h-3 rounded-full mt-1 shrink-0 ${
              isOrderingOpen ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
            }`}
          />
          <div className="text-xs leading-relaxed">
            <strong>Current Status: {isOrderingOpen ? 'OPEN' : 'CLOSED'}</strong>
            <p className="mt-0.5 opacity-90">
              {isOrderingOpen
                ? 'Friends can register new teams and submit food orders. Existing orders can be edited by friends if in Pending status.'
                : 'Friends CANNOT submit new orders or edit existing orders. Orders are frozen for procurement. Friends can still view their submitted orders.'}
            </p>
          </div>
        </div>
      </div>

      {/* 2. DYNAMIC CAMPUS MANAGEMENT */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Building className="w-5 h-5 text-brand-600" />
            Dynamic Campus Locations
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage campuses available in the team registration dropdown
          </p>
        </div>

        {/* Add Campus Form */}
        <form onSubmit={handleAddCampus} className="flex gap-2 text-xs">
          <input
            type="text"
            required
            placeholder="Add new campus name (e.g. Science & Biotech Block)..."
            value={newCampusName}
            onChange={(e) => setNewCampusName(e.target.value)}
            className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          />
          <button
            type="submit"
            disabled={addingCampus}
            className="px-4 py-2.5 rounded-xl font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            <span>{addingCampus ? 'Adding...' : 'Add Campus'}</span>
          </button>
        </form>

        {/* Campuses List */}
        <div className="space-y-2">
          {campuses.map((campus) => (
            <div
              key={campus.id}
              className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs"
            >
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-slate-400" />
                <span className="font-semibold text-slate-800">{campus.name}</span>
              </div>

              <button
                onClick={() => handleToggleCampus(campus)}
                className={`text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
                  campus.is_active
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                    : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                }`}
              >
                {campus.is_active ? 'Active' : 'Disabled'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 3. EVENT ANNOUNCEMENT DETAILS */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-brand-600" />
            Event Information &amp; Banner
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Shown at the top of the friend order portal during the event
          </p>
        </div>

        <form onSubmit={handleSaveEventDetails} className="space-y-3 text-xs">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Event Title
            </label>
            <input
              type="text"
              required
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/30 font-semibold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Announcement / Notice Message
            </label>
            <textarea
              rows={3}
              value={announcement}
              onChange={(e) => setAnnouncement(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              placeholder="e.g. Please collect all dinner orders before 8:00 PM!"
            />
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={savingSettings}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-brand-600 hover:bg-brand-700 shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{savingSettings ? 'Saving...' : 'Save Information'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* 4. DATABASE & SUPABASE STORAGE */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Database className="w-5 h-5 text-brand-600" />
              Database &amp; Supabase Storage
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Current database storage engine and cloud connection status
            </p>
          </div>
          <span
            className={`text-xs font-bold px-3 py-1 rounded-full border self-start sm:self-auto ${
              storageType === 'supabase'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}
          >
            {storageType === 'supabase' ? '● Connected to Supabase Cloud' : '● Local Fallback Mode'}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-slate-700">
            <span className="font-semibold">Target Supabase Project:</span>
            <span className="font-mono text-slate-900 break-all">https://cdykpdsmmxcyrdprllpz.supabase.co</span>
          </div>
          <div className="flex items-center justify-between text-slate-700">
            <span className="font-semibold">Tables in Database:</span>
            <span className="text-emerald-700 font-bold">9 Tables Created</span>
          </div>
          <div className="pt-2 border-t border-slate-200/60 text-slate-500 text-[11px] leading-relaxed">
            To store all food orders, teams, and menu live in Supabase PostgreSQL:
            <ol className="list-decimal pl-4 mt-1 space-y-1 text-slate-600">
              <li>In your Supabase Dashboard, go to <strong>Project Settings &rarr; API</strong>.</li>
              <li>Copy the secret <strong>service_role</strong> key (not the publishable key).</li>
              <li>Paste it into <code className="text-brand-600 font-bold">.env.local</code> under <code className="text-slate-800 font-bold">SUPABASE_SERVICE_ROLE_KEY=...</code></li>
              <li>In Supabase Dashboard, go to <strong>Authentication &rarr; Providers &rarr; Email</strong> and uncheck <strong>Confirm email</strong>.</li>
              <li>Run <code className="text-brand-600 font-bold">npm run sync-db</code> to sync all menus, campuses, and accounts to your Supabase cloud database!</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
