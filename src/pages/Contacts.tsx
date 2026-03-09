import React, { useEffect, useState, FormEvent, useRef } from 'react';
import { Plus, Search, Trash2, Upload, FileSpreadsheet, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import Papa from 'papaparse';
import clsx from 'clsx';

interface Contact {
  id: number;
  name: string;
  email: string;
  created_at: string;
}

export function Contacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [importMode, setImportMode] = useState<'single' | 'bulk'>('single');
  
  // Single contact state
  const [newContact, setNewContact] = useState({ name: '', email: '' });
  
  // Bulk import state
  const [bulkText, setBulkText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<{type: 'single' | 'bulk', id?: number} | null>(null);

  useEffect(() => {
    fetchContacts();
  }, []);

  async function fetchContacts() {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContacts(data || []);
      // Reset selection on refresh
      setSelectedIds(new Set());
    } catch (error) {
      console.error('Error fetching contacts:', error);
    } finally {
      setLoading(false);
    }
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === contacts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(contacts.map(c => c.id)));
    }
  };

  const toggleSelect = (id: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  function confirmBulkDelete() {
    if (selectedIds.size === 0) return;
    setDeleteConfirm({ type: 'bulk' });
  }

  function confirmDeleteContact(id: number) {
    setDeleteConfirm({ type: 'single', id });
  }

  async function executeDelete() {
    if (deleteConfirm?.type === 'bulk') {
      try {
        const { error } = await supabase
          .from('contacts')
          .delete()
          .in('id', Array.from(selectedIds));

        if (error) throw error;
        toast.success(`Deleted ${selectedIds.size} contacts`);
        fetchContacts();
        setDeleteConfirm(null);
      } catch (error: any) {
        toast.error('Failed to delete contacts: ' + error.message);
      }
    } else if (deleteConfirm?.type === 'single' && deleteConfirm.id) {
      try {
        const { error } = await supabase.from('contacts').delete().eq('id', deleteConfirm.id);
        if (error) throw error;
        toast.success('Contact deleted');
        fetchContacts();
        setDeleteConfirm(null);
      } catch (error) {
        toast.error('Failed to delete contact');
      }
    }
  }

  async function handleAddContact(e: FormEvent) {
    e.preventDefault();
    if (importMode === 'single') {
      if (!newContact.name || !newContact.email) return;
      await insertContacts([{ name: newContact.name, email: newContact.email }]);
      setNewContact({ name: '', email: '' });
    } else {
      // Parse bulk text
      const lines = bulkText.split(/[\n,]/).map(l => l.trim()).filter(Boolean);
      const contactsToInsert: { name: string; email: string }[] = [];
      
      lines.forEach(line => {
        // Simple heuristic: if it has an @, it's an email. 
        // If there's text before a comma or space, maybe it's a name?
        // For now, let's just assume list of emails or "Name <email>" format
        // or "email, name"
        
        // Very basic parsing for "email"
        if (line.includes('@')) {
            contactsToInsert.push({ name: '', email: line });
        }
      });

      if (contactsToInsert.length === 0) {
        toast.error('No valid emails found in text');
        return;
      }

      await insertContacts(contactsToInsert);
      setBulkText('');
    }
  }

  async function insertContacts(contactsData: { name: string; email: string }[]) {
    try {
      const { error } = await supabase
        .from('contacts')
        .insert(contactsData);

      if (error) throw error;

      toast.success(`Successfully added ${contactsData.length} contact(s)!`);
      setIsModalOpen(false);
      fetchContacts();
    } catch (error: any) {
      console.error('Error adding contacts:', error);
      toast.error('Failed to add contacts: ' + error.message);
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const parsedContacts: { name: string; email: string }[] = [];
        
        // Try to map common headers
        results.data.forEach((row: any) => {
          const email = row.email || row.Email || row.EMAIL;
          const name = row.name || row.Name || row.NAME || row['First Name'] || '';
          
          if (email) {
            parsedContacts.push({ name, email });
          }
        });

        if (parsedContacts.length > 0) {
          if (confirm(`Found ${parsedContacts.length} contacts. Import them?`)) {
            await insertContacts(parsedContacts);
          }
        } else {
          toast.error('No "email" column found in CSV');
        }
        
        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = '';
      },
      error: (error) => {
        toast.error('Error parsing CSV: ' + error.message);
      }
    });
  };

  // handleDeleteContact replaced by confirmDeleteContact and executeDelete

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
        <div>
            <h1 className="text-3xl font-bold text-white tracking-tight drop-shadow-md">Contacts</h1>
            <p className="mt-1 text-slate-400">Manage your subscriber list.</p>
        </div>
        <div className="flex space-x-3">
          {selectedIds.size > 0 && (
            <button
              onClick={confirmBulkDelete}
              className="flex items-center rounded-xl bg-red-500/10 px-5 py-3 text-sm font-bold text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all"
            >
              <Trash2 className="mr-2 h-5 w-5" />
              Delete ({selectedIds.size})
            </button>
          )}
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center rounded-xl bg-violet-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-violet-500/30 hover:bg-violet-500 hover:shadow-violet-500/50 transition-all transform hover:-translate-y-0.5 ring-1 ring-white/10"
          >
            <Plus className="mr-2 h-5 w-5" />
            Add Contacts
          </button>
        </div>
      </div>

      <div className="rounded-3xl bg-slate-900/50 shadow-xl border border-white/5 overflow-hidden backdrop-blur-sm">
        {loading ? (
          <div className="p-12 text-center text-slate-500">Loading contacts...</div>
        ) : contacts.length === 0 ? (
          <div className="p-16 text-center">
            <div className="mx-auto h-16 w-16 rounded-full bg-white/5 flex items-center justify-center text-slate-500 mb-4 border border-white/5">
              <Search className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold text-white">No contacts yet</h3>
            <p className="mt-2 text-slate-400 max-w-sm mx-auto">Get started by adding your first subscriber or importing a list.</p>
            <button 
                onClick={() => setIsModalOpen(true)}
                className="mt-6 text-cyan-400 font-medium hover:text-cyan-300 hover:underline"
            >
                Add your first contact &rarr;
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/5">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-6 py-5 w-12">
                    <input
                      type="checkbox"
                      className="rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-slate-900"
                      checked={contacts.length > 0 && selectedIds.size === contacts.length}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th className="px-6 py-5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Date Added
                  </th>
                  <th className="relative px-6 py-5">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {contacts.map((contact) => (
                  <tr key={contact.id} className={`hover:bg-white/5 transition-colors group ${selectedIds.has(contact.id) ? 'bg-cyan-500/5' : ''}`}>
                    <td className="px-6 py-5">
                      <input
                        type="checkbox"
                        className="rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-slate-900"
                        checked={selectedIds.has(contact.id)}
                        onChange={() => toggleSelect(contact.id)}
                      />
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="text-sm font-medium text-white">{contact.name || '-'}</div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="text-sm text-slate-400">{contact.email}</div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="text-sm text-slate-500">
                        {new Date(contact.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => confirmDeleteContact(contact.id)}
                        className="text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Contact Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 transition-opacity">
          <div className="w-full max-w-lg rounded-3xl bg-slate-900 p-8 shadow-2xl border border-white/10 transform transition-all">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">Add Contacts</h2>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                    <X className="h-6 w-6" />
                </button>
            </div>

            <div className="flex space-x-4 mb-6 border-b border-white/10 pb-1">
                <button 
                    onClick={() => setImportMode('single')}
                    className={clsx(
                        "pb-3 text-sm font-medium transition-colors relative",
                        importMode === 'single' ? "text-cyan-400" : "text-slate-500 hover:text-slate-300"
                    )}
                >
                    Single Contact
                    {importMode === 'single' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400 rounded-t-full shadow-[0_0_8px_rgba(34,211,238,0.8)]" />}
                </button>
                <button 
                    onClick={() => setImportMode('bulk')}
                    className={clsx(
                        "pb-3 text-sm font-medium transition-colors relative",
                        importMode === 'bulk' ? "text-cyan-400" : "text-slate-500 hover:text-slate-300"
                    )}
                >
                    Bulk Import
                    {importMode === 'bulk' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400 rounded-t-full shadow-[0_0_8px_rgba(34,211,238,0.8)]" />}
                </button>
            </div>

            {importMode === 'single' ? (
                <form onSubmit={handleAddContact} className="space-y-5">
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Name</label>
                    <input
                    type="text"
                    value={newContact.name}
                    onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                    className="block w-full rounded-xl border-white/10 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 py-3 px-4 bg-slate-800 text-white placeholder-slate-500 focus:bg-slate-800 transition-colors"
                    placeholder="John Doe"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Email <span className="text-red-400">*</span></label>
                    <input
                    type="email"
                    required
                    value={newContact.email}
                    onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                    className="block w-full rounded-xl border-white/10 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 py-3 px-4 bg-slate-800 text-white placeholder-slate-500 focus:bg-slate-800 transition-colors"
                    placeholder="john@example.com"
                    />
                </div>
                <div className="flex justify-end pt-4">
                    <button
                    type="submit"
                    className="rounded-xl bg-violet-600 px-6 py-3 text-sm font-bold text-white hover:bg-violet-500 shadow-lg shadow-violet-500/20 transition-all"
                    >
                    Add Contact
                    </button>
                </div>
                </form>
            ) : (
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Paste Emails</label>
                        <textarea
                            value={bulkText}
                            onChange={(e) => setBulkText(e.target.value)}
                            className="block w-full rounded-xl border-white/10 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 py-3 px-4 bg-slate-800 text-white placeholder-slate-500 focus:bg-slate-800 transition-colors min-h-[120px]"
                            placeholder="john@example.com, jane@example.com&#10;bob@example.com"
                        />
                        <p className="mt-2 text-xs text-slate-500">Separate emails by commas or new lines.</p>
                    </div>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center" aria-hidden="true">
                            <div className="w-full border-t border-white/10" />
                        </div>
                        <div className="relative flex justify-center">
                            <span className="bg-slate-900 px-2 text-sm text-slate-500">OR</span>
                        </div>
                    </div>

                    <div>
                        <input
                            type="file"
                            accept=".csv"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            className="hidden"
                        />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full flex items-center justify-center px-6 py-4 border-2 border-dashed border-white/10 rounded-xl hover:border-cyan-500/50 hover:bg-white/5 transition-all group"
                        >
                            <FileSpreadsheet className="h-6 w-6 text-slate-500 group-hover:text-cyan-400 mr-3" />
                            <span className="text-slate-400 group-hover:text-cyan-300 font-medium">Upload CSV File</span>
                        </button>
                    </div>

                    <div className="flex justify-end pt-4">
                        <button
                            onClick={handleAddContact}
                            disabled={!bulkText}
                            className={clsx(
                                "rounded-xl px-6 py-3 text-sm font-bold text-white shadow-md transition-all",
                                bulkText ? "bg-violet-600 hover:bg-violet-500 shadow-violet-500/20" : "bg-slate-800 text-slate-500 cursor-not-allowed"
                            )}
                        >
                            Import Contacts
                        </button>
                    </div>
                </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 rounded-xl border border-white/10 shadow-2xl w-full max-w-md overflow-hidden p-6 animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-white mb-2">Confirm Deletion</h3>
            <p className="text-slate-400 mb-6">
              {deleteConfirm.type === 'bulk' 
                ? `Are you sure you want to delete ${selectedIds.size} contacts? This action cannot be undone.`
                : `Are you sure you want to delete this contact? This action cannot be undone.`}
            </p>
            <div className="flex justify-end space-x-3">
              <button 
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 font-medium hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={executeDelete}
                className="px-4 py-2 rounded-lg bg-red-600 text-white font-bold hover:bg-red-500 transition-colors"
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
