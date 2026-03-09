import { useState, useEffect, FormEvent, useRef, useMemo } from 'react';
import { Send, Users, Eye, LayoutTemplate, Loader2, X, Code, Square, Type, Palette, MousePointerClick, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import ReactQuill, { Quill } from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import DOMPurify from 'dompurify';

const Embed = Quill.import('blots/embed') as any;
class ButtonBlot extends Embed {
  static blotName = 'customButton';
  static tagName = 'a';
  static className = 'custom-btn-blot';

  static create(value: any) {
    const node = super.create(value);
    node.setAttribute('href', value.url);
    node.setAttribute('target', '_blank');
    node.setAttribute('style', `display: inline-block; background-color: ${value.color}; color: white; padding: ${value.padding}; text-decoration: none; border-radius: 6px; font-weight: bold; text-align: center; font-size: ${value.fontSize}; margin: 4px 0;`);
    node.innerText = value.text;
    return node;
  }

  static value(node: any) {
    return {
      url: node.getAttribute('href'),
      color: node.style.backgroundColor,
      padding: node.style.padding,
      fontSize: node.style.fontSize,
      text: node.innerText
    };
  }
}
Quill.register(ButtonBlot);

const CustomToolbar = ({ isCodeView, toggleCodeView, onInsertButton }: { isCodeView: boolean, toggleCodeView: () => void, onInsertButton: () => void }) => (
  <div id="toolbar" className="flex flex-wrap items-center gap-1 sm:gap-2">
    {!isCodeView && (
      <>
        <select className="ql-header" defaultValue="">
          <option value="1"></option>
          <option value="2"></option>
          <option value=""></option>
        </select>
        <button className="ql-bold"></button>
        <button className="ql-italic"></button>
        <button className="ql-underline"></button>
        <button className="ql-list" value="ordered"></button>
        <button className="ql-list" value="bullet"></button>
        <button className="ql-link"></button>
        <button className="ql-image"></button>
        <span className="w-px h-6 bg-slate-700 mx-1"></span>
        <button type="button" onClick={onInsertButton} className="text-slate-300 hover:text-cyan-400 transition-colors flex items-center justify-center" title="Insert Button">
            <MousePointerClick className="w-4 h-4" />
        </button>
      </>
    )}
    <span className="flex-1"></span>
    <button type="button" onClick={toggleCodeView} className={`flex items-center gap-2 px-2 py-1 rounded transition-colors ${isCodeView ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-400 hover:text-white'}`} title="Toggle HTML Source">
        <Code className="w-4 h-4" />
        <span className="text-xs font-medium hidden sm:inline">{isCodeView ? 'Visual' : 'HTML'}</span>
    </button>
  </div>
);

interface Contact {
  id: number;
  name: string;
  email: string;
}

export function Campaigns() {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  
  // Recipient State
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [recipientMode, setRecipientMode] = useState<'all' | 'custom'>('all');
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<Set<number>>(new Set());
  const [showRecipientsModal, setShowRecipientsModal] = useState(false);

  // Link Modal State
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [savedRange, setSavedRange] = useState<{ index: number; length: number } | null>(null);

  // Button Modal State
  const [showButtonModal, setShowButtonModal] = useState(false);
  const [btnText, setBtnText] = useState('');
  const [btnUrl, setBtnUrl] = useState('');
  const [btnColor, setBtnColor] = useState('#7c3aed'); // Violet default
  const [btnSize, setBtnSize] = useState('medium');

  const [recipientSearch, setRecipientSearch] = useState('');

  // Code View State
  const [isCodeView, setIsCodeView] = useState(false);

  // Test Email State
  const [showTestEmailModal, setShowTestEmailModal] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  
  const quillRef = useRef<any>(null);

  useEffect(() => {
    fetchContacts();
  }, []);

  async function fetchContacts() {
    const { data } = await supabase.from('contacts').select('id, name, email');
    if (data) {
      setContacts(data);
      setSelectedRecipientIds(new Set(data.map(c => c.id)));
    }
  }

  const recipientCount = recipientMode === 'all' ? contacts.length : selectedRecipientIds.size;

  const toggleRecipientSelect = (id: number) => {
    const newSelected = new Set(selectedRecipientIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedRecipientIds(newSelected);
    if (recipientMode === 'all') setRecipientMode('custom');
  };

  const toggleRecipientSelectAll = () => {
    if (selectedRecipientIds.size === contacts.length) {
      setSelectedRecipientIds(new Set());
    } else {
      setSelectedRecipientIds(new Set(contacts.map(c => c.id)));
    }
    if (recipientMode === 'all') setRecipientMode('custom');
  };

  async function handleSendTest() {
    setTestError(null);
    if (!testEmail) {
      setTestError('Please enter an email address');
      return;
    }
    if (!subject || !body) {
      setTestError('Please fill in subject and body first');
      return;
    }

    setSendingTest(true);
    try {
      const response = await fetch('/api/send-test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail, subject, body }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to send test email');

      if (result.simulated) {
        toast.success(`Simulated test email to ${testEmail} (Account not activated)`);
      } else {
        toast.success(`Test email sent to ${testEmail}`);
      }
      
      setShowTestEmailModal(false);
      setTestEmail('');
    } catch (error: any) {
      console.error('Test send error:', error);
      setTestError(error.message || 'Failed to send test email');
    } finally {
      setSendingTest(false);
    }
  }

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    if (!subject || !body) {
      toast.error('Please fill in all fields');
      return;
    }

    if (recipientCount === 0) {
      toast.error('No contacts to send to!');
      return;
    }

    setSending(true);

    try {
      // Determine recipients
      let recipientsToSend = contacts;
      if (recipientMode === 'custom') {
        recipientsToSend = contacts.filter(c => selectedRecipientIds.has(c.id));
      }

      // 2. Send to backend API
      const response = await fetch('/api/send-campaign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject,
          body,
          recipients: recipientsToSend,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send campaign');
      }

      // Update local storage for demo "Emails Sent" count
      const currentSent = parseInt(localStorage.getItem('fixorah_emails_sent') || '0');
      localStorage.setItem('fixorah_emails_sent', (currentSent + recipientsToSend.length).toString());

      const simulatedCount = result.results?.filter((r: any) => r.simulated).length || 0;
      if (simulatedCount > 0) {
        toast.success(`Simulated campaign send to ${simulatedCount} recipients (Account not activated)`);
      } else {
        toast.success(`Campaign sent to ${recipientsToSend.length} recipients!`);
      }
      
      setSubject('');
      setBody('');
    } catch (error: any) {
      console.error('Send error:', error);
      toast.error(error.message || 'Failed to send campaign');
    } finally {
      setSending(false);
    }
  }

  const [showImageModal, setShowImageModal] = useState(false);
  const [imageUrl, setImageUrl] = useState('');

  const modules = useMemo(() => ({
    toolbar: {
      container: "#toolbar",
      handlers: {
        link: () => {
          const editor = quillRef.current?.getEditor();
          if (!editor) return;
          
          const range = editor.getSelection(true);
          if (range && typeof range.index === 'number') {
            setSavedRange(range);
            if (range.length > 0) {
              const text = editor.getText(range.index, range.length);
              setLinkText(text);
            } else {
              setLinkText('');
            }
          } else {
            setSavedRange({ index: 0, length: 0 });
            setLinkText('');
          }
          setLinkUrl('');
          setShowLinkModal(true);
        },
        image: () => {
          const editor = quillRef.current?.getEditor();
          if (!editor) return;
          
          const range = editor.getSelection(true);
          if (range && typeof range.index === 'number') {
            setSavedRange(range);
          } else {
            setSavedRange({ index: 0, length: 0 });
          }
          setImageUrl('');
          setShowImageModal(true);
        }
      }
    }
  }), []);

  const handleSaveImage = () => {
    if (!imageUrl) {
      toast.error('Please enter an image URL');
      return;
    }

    const editor = quillRef.current?.getEditor();
    if (!editor) return;

    if (savedRange && typeof savedRange.index === 'number') {
      editor.focus();
      editor.insertEmbed(savedRange.index, 'image', imageUrl);
      editor.setSelection(savedRange.index + 1);
    }

    setShowImageModal(false);
    setSavedRange(null);
    setImageUrl('');
  };

  const handleSaveLink = () => {
    if (!linkUrl) {
      toast.error('Please enter a URL');
      return;
    }

    const editor = quillRef.current?.getEditor();
    if (!editor) return;

    if (savedRange && typeof savedRange.index === 'number') {
      editor.focus();
      if (savedRange.length > 0) {
        // Replace selected text with linked text
        editor.deleteText(savedRange.index, savedRange.length);
        editor.insertText(savedRange.index, linkText || linkUrl, 'link', linkUrl);
        editor.setSelection(savedRange.index + (linkText || linkUrl).length);
      } else {
        // Insert new linked text
        const textToInsert = linkText || linkUrl;
        editor.insertText(savedRange.index, textToInsert, 'link', linkUrl);
        editor.setSelection(savedRange.index + textToInsert.length);
      }
    }

    setShowLinkModal(false);
    setSavedRange(null);
    setLinkUrl('');
    setLinkText('');
  };

  const handleInsertButton = () => {
    if (!btnText || !btnUrl) {
      toast.error('Please fill in button text and URL');
      return;
    }

    const editor = quillRef.current?.getEditor();
    if (!editor) return;

    let padding = '10px 20px';
    let fontSize = '16px';
    
    if (btnSize === 'small') {
        padding = '6px 12px';
        fontSize = '14px';
    } else if (btnSize === 'large') {
        padding = '14px 28px';
        fontSize = '18px';
    }

    const range = editor.getSelection(true);
    const index = (range && typeof range.index === 'number') ? range.index : 0;
    
    editor.insertEmbed(index, 'customButton', {
      url: btnUrl,
      text: btnText,
      color: btnColor,
      padding: padding,
      fontSize: fontSize
    });
    
    // Move cursor after button
    setTimeout(() => {
        editor.setSelection(index + 1);
        editor.insertText(index + 1, ' ');
    }, 0);

    setShowButtonModal(false);
    setBtnText('');
    setBtnUrl('');
    setBtnColor('#7c3aed');
  };

  const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'color', 'background',
    'list',
    'link', 'image', 'customButton'
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8 lg:h-[calc(100vh-8rem)] h-auto flex flex-col relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between shrink-0 space-y-4 sm:space-y-0">
        <div>
            <h1 className="text-3xl font-bold text-white tracking-tight drop-shadow-md">Create Campaign</h1>
            <p className="mt-1 text-slate-400">Design and send beautiful emails.</p>
        </div>
        <button 
          onClick={() => setShowRecipientsModal(true)}
          className="flex items-center text-sm font-medium text-cyan-400 bg-cyan-500/10 px-4 py-2 rounded-full border border-cyan-500/20 shadow-[0_0_10px_rgba(34,211,238,0.2)] hover:bg-cyan-500/20 transition-colors"
        >
          <Users className="h-4 w-4 mr-2" />
          Targeting {recipientCount} recipients
          <span className="ml-2 text-xs opacity-70">({recipientMode === 'all' ? 'All' : 'Custom'})</span>
        </button>
      </div>

      {/* ... (existing content) ... */}

      {/* Recipients Modal */}
      {showRecipientsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setShowRecipientsModal(false)}>
          <div 
            className="bg-slate-900 rounded-xl border border-white/10 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-slate-800/50 shrink-0">
              <h3 className="text-lg font-bold text-white">Select Recipients</h3>
              <button 
                onClick={() => setShowRecipientsModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 flex-1 overflow-hidden flex flex-col space-y-4">
              <div className="flex space-x-4 shrink-0">
                <button
                  onClick={() => {
                    setRecipientMode('all');
                    setSelectedRecipientIds(new Set(contacts.map(c => c.id)));
                  }}
                  className={`flex-1 py-2 px-4 rounded-lg border text-sm font-medium transition-colors ${recipientMode === 'all' ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400' : 'bg-slate-800 border-white/5 text-slate-400 hover:bg-slate-700'}`}
                >
                  All Contacts ({contacts.length})
                </button>
                <button
                  onClick={() => setRecipientMode('custom')}
                  className={`flex-1 py-2 px-4 rounded-lg border text-sm font-medium transition-colors ${recipientMode === 'custom' ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400' : 'bg-slate-800 border-white/5 text-slate-400 hover:bg-slate-700'}`}
                >
                  Custom Selection ({selectedRecipientIds.size})
                </button>
              </div>

              {recipientMode === 'custom' && (
                <>
                  <div className="relative shrink-0">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 w-4 h-4" />
                    <input
                      type="text"
                      value={recipientSearch}
                      onChange={(e) => setRecipientSearch(e.target.value)}
                      placeholder="Search contacts..."
                      className="w-full bg-slate-950 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-sm"
                    />
                  </div>

                  <div className="flex-1 overflow-y-auto border border-white/5 rounded-lg bg-slate-950/50">
                    <table className="min-w-full divide-y divide-white/5">
                      <thead className="bg-slate-900 sticky top-0">
                        <tr>
                          <th className="px-4 py-3 w-10">
                            <input
                              type="checkbox"
                              className="rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-slate-900"
                              checked={selectedRecipientIds.size === contacts.length && contacts.length > 0}
                              onChange={toggleRecipientSelectAll}
                            />
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Name</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Email</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {contacts
                          .filter(c => 
                            c.name?.toLowerCase().includes(recipientSearch.toLowerCase()) || 
                            c.email.toLowerCase().includes(recipientSearch.toLowerCase())
                          )
                          .map(contact => (
                            <tr 
                              key={contact.id} 
                              className={`hover:bg-white/5 transition-colors cursor-pointer ${selectedRecipientIds.has(contact.id) ? 'bg-cyan-500/5' : ''}`}
                              onClick={() => toggleRecipientSelect(contact.id)}
                            >
                              <td className="px-4 py-3">
                                <input
                                  type="checkbox"
                                  className="rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-slate-900"
                                  checked={selectedRecipientIds.has(contact.id)}
                                  onChange={() => toggleRecipientSelect(contact.id)}
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </td>
                              <td className="px-4 py-3 text-sm text-white">{contact.name || '-'}</td>
                              <td className="px-4 py-3 text-sm text-slate-400">{contact.email}</td>
                            </tr>
                          ))}
                        {contacts.length === 0 && (
                          <tr>
                            <td colSpan={3} className="px-4 py-8 text-center text-slate-500 text-sm">No contacts found</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>

            <div className="p-6 border-t border-white/5 bg-slate-800/50 flex justify-end shrink-0">
              <button
                onClick={() => setShowRecipientsModal(false)}
                className="px-6 py-2 rounded-lg bg-cyan-600 text-white font-bold hover:bg-cyan-500 shadow-lg shadow-cyan-500/20 transition-all text-sm"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}


      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:min-h-0">
        {/* Editor Column */}
        <div className="flex flex-col space-y-6 lg:h-full lg:overflow-y-auto pr-2 h-auto">
            <div className="bg-slate-900/50 rounded-3xl shadow-xl border border-white/5 p-6 space-y-6 backdrop-blur-sm">
                <div>
                    <label htmlFor="subject" className="block text-sm font-bold text-slate-300 mb-2">
                    Subject Line
                    </label>
                    <input
                    type="text"
                    id="subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="block w-full rounded-xl border-white/10 px-4 py-3 shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-cyan-500 text-lg bg-slate-800 text-white placeholder-slate-500 focus:bg-slate-800 transition-colors"
                    placeholder="e.g., Big Summer Sale! ☀️"
                    />
                </div>

                <div className="flex-1 flex flex-col min-h-[400px]">
                    <label className="block text-sm font-bold text-slate-300 mb-2">
                    Email Content
                    </label>
                    <div className="flex-1 bg-slate-800 rounded-xl overflow-hidden border border-white/10 focus-within:ring-1 focus-within:ring-cyan-500 focus-within:border-cyan-500 flex flex-col">
                        <div className="bg-slate-900 border-b border-white/5 p-2">
                            <CustomToolbar 
                                isCodeView={isCodeView} 
                                toggleCodeView={() => setIsCodeView(!isCodeView)} 
                                onInsertButton={() => setShowButtonModal(true)}
                            />
                        </div>
                        
                        {isCodeView ? (
                            <textarea
                                value={body}
                                onChange={(e) => setBody(e.target.value)}
                                className="flex-1 w-full h-full bg-slate-950 text-slate-300 font-mono text-sm p-4 focus:outline-none resize-none"
                                placeholder="Paste your HTML code here..."
                            />
                        ) : (
                            <ReactQuill 
                                // @ts-expect-error: ReactQuill ref type mismatch
                                ref={quillRef}
                                theme="snow"
                                value={body}
                                onChange={setBody}
                                modules={modules}
                                formats={formats}
                                className="flex-1 flex flex-col"
                                placeholder="Start writing your masterpiece..."
                            />
                        )}
                    </div>
                </div>
            </div>
            
            <div className="pt-2 pb-8 flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                 <button
                    onClick={() => setShowTestEmailModal(true)}
                    disabled={sending}
                    className="flex-1 flex items-center justify-center rounded-xl bg-slate-800 px-8 py-4 text-lg font-bold text-slate-300 shadow-lg shadow-slate-900/30 hover:bg-slate-700 hover:text-white transition-all transform hover:-translate-y-0.5"
                >
                    <Send className="mr-2 h-5 w-5" />
                    Send Test
                </button>

                 <button
                    onClick={handleSend}
                    disabled={sending}
                    className={`flex-[2] flex items-center justify-center rounded-xl bg-violet-600 px-8 py-4 text-lg font-bold text-white shadow-lg shadow-violet-500/30 hover:bg-violet-500 hover:shadow-violet-500/50 transition-all transform hover:-translate-y-0.5 ${
                    sending ? 'opacity-75 cursor-not-allowed' : ''
                    }`}
                >
                    {sending ? (
                    <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Sending Campaign...
                    </>
                    ) : (
                    <>
                        <Send className="mr-2 h-5 w-5" />
                        Send Campaign Now
                    </>
                    )}
                </button>
            </div>
        </div>

        {/* Preview Column */}
        <div className="flex flex-col lg:h-full lg:overflow-hidden bg-slate-800 rounded-3xl border-[8px] border-slate-700 shadow-2xl relative min-h-[500px]">
            <div className="bg-slate-900 px-6 py-3 flex items-center justify-between shrink-0 border-b border-white/5">
                <div className="flex space-x-2">
                    <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                </div>
                <div className="text-slate-400 text-xs font-medium flex items-center">
                    <Eye className="w-3 h-3 mr-1" /> Live Preview
                </div>
            </div>
            
            <div className="bg-white flex-1 overflow-y-auto">
                <div className="border-b border-gray-100 p-6 bg-gray-50">
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Subject</div>
                    <div className="text-xl font-bold text-gray-900 break-words">
                        {subject || <span className="text-gray-300 italic">Your subject line...</span>}
                    </div>
                </div>
                
                <div className="p-8 prose prose-indigo max-w-none text-gray-900 prose-a:text-blue-600 prose-a:underline prose-a:font-medium hover:prose-a:text-blue-800">
                    {body ? (
                        <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(body, { ADD_TAGS: ['style'], ADD_ATTR: ['style', 'target'] }) }} />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-300">
                            <LayoutTemplate className="w-16 h-16 mb-4 opacity-20" />
                            <p>Email content preview will appear here</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
      </div>

      {/* Link Floating Toolbar */}
      {showLinkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowLinkModal(false)}>
          <div 
            className="bg-slate-900 rounded-xl border border-white/10 shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200 ring-1 ring-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-slate-800/50">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Insert Link</h3>
              <button 
                onClick={() => setShowLinkModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Text to display
                </label>
                <input
                  type="text"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all text-sm"
                  placeholder="Click here"
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  URL
                </label>
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all text-sm"
                  placeholder="https://example.com"
                  autoFocus
                />
              </div>

              <div className="pt-2 flex space-x-3">
                <button
                  onClick={() => setShowLinkModal(false)}
                  className="flex-1 px-4 py-2 rounded-lg bg-slate-800 text-slate-300 font-medium hover:bg-slate-700 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveLink}
                  className="flex-1 px-4 py-2 rounded-lg bg-cyan-600 text-white font-bold hover:bg-cyan-500 shadow-lg shadow-cyan-500/20 transition-all text-sm"
                >
                  Insert Link
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Floating Toolbar */}
      {showImageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowImageModal(false)}>
          <div 
            className="bg-slate-900 rounded-xl border border-white/10 shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200 ring-1 ring-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-slate-800/50">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Insert Image</h3>
              <button 
                onClick={() => setShowImageModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Image URL
                </label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all text-sm"
                  placeholder="https://example.com/image.jpg"
                  autoFocus
                />
              </div>

              <div className="pt-2 flex space-x-3">
                <button
                  onClick={() => setShowImageModal(false)}
                  className="flex-1 px-4 py-2 rounded-lg bg-slate-800 text-slate-300 font-medium hover:bg-slate-700 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveImage}
                  className="flex-1 px-4 py-2 rounded-lg bg-cyan-600 text-white font-bold hover:bg-cyan-500 shadow-lg shadow-cyan-500/20 transition-all text-sm"
                >
                  Insert Image
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Button Floating Toolbar */}
      {showButtonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowButtonModal(false)}>
          <div 
            className="bg-slate-900 rounded-xl border border-white/10 shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200 ring-1 ring-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-slate-800/50">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Insert Button</h3>
              <button 
                onClick={() => setShowButtonModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Button Text
                </label>
                <input
                  type="text"
                  value={btnText}
                  onChange={(e) => setBtnText(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all text-sm"
                  placeholder="e.g. Shop Now"
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  URL
                </label>
                <input
                  type="url"
                  value={btnUrl}
                  onChange={(e) => setBtnUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all text-sm"
                  placeholder="https://example.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        Color
                    </label>
                    <div className="flex space-x-2">
                        {['#7c3aed', '#2563eb', '#16a34a', '#dc2626', '#000000'].map(color => (
                            <button
                                key={color}
                                type="button"
                                onClick={() => setBtnColor(color)}
                                className={`w-8 h-8 rounded-full border-2 ${btnColor === color ? 'border-white' : 'border-transparent'} transition-all hover:scale-110`}
                                style={{ backgroundColor: color }}
                            />
                        ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        Size
                    </label>
                    <select
                        value={btnSize}
                        onChange={(e) => setBtnSize(e.target.value)}
                        className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-sm"
                    >
                        <option value="small">Small</option>
                        <option value="medium">Medium</option>
                        <option value="large">Large</option>
                    </select>
                  </div>
              </div>

              <div className="pt-2">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Preview
                </label>
                <div className="w-full p-6 bg-slate-950/50 rounded-xl border border-white/5 flex items-center justify-center">
                    <a 
                        href="#" 
                        onClick={(e) => e.preventDefault()}
                        style={{ 
                            display: 'inline-block', 
                            backgroundColor: btnColor, 
                            color: 'white', 
                            padding: btnSize === 'small' ? '6px 12px' : btnSize === 'large' ? '14px 28px' : '10px 20px', 
                            textDecoration: 'none', 
                            borderRadius: '6px', 
                            fontWeight: 'bold', 
                            textAlign: 'center', 
                            fontSize: btnSize === 'small' ? '14px' : btnSize === 'large' ? '18px' : '16px' 
                        }}
                    >
                        {btnText || 'Button Text'}
                    </a>
                </div>
              </div>

              <div className="pt-2 flex space-x-3">
                <button
                  onClick={() => setShowButtonModal(false)}
                  className="flex-1 px-4 py-2 rounded-lg bg-slate-800 text-slate-300 font-medium hover:bg-slate-700 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleInsertButton}
                  className="flex-1 px-4 py-2 rounded-lg bg-cyan-600 text-white font-bold hover:bg-cyan-500 shadow-lg shadow-cyan-500/20 transition-all text-sm"
                >
                  Insert Button
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Test Email Modal */}
      {showTestEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowTestEmailModal(false)}>
          <div 
            className="bg-slate-900 rounded-xl border border-white/10 shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200 ring-1 ring-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-slate-800/50">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Send Test Email</h3>
              <button 
                onClick={() => setShowTestEmailModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              {testError && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-400">
                  {testError}
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Recipient Email
                </label>
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all text-sm"
                  placeholder="you@example.com"
                  autoFocus
                />
              </div>

              <div className="pt-2 flex space-x-3">
                <button
                  onClick={() => setShowTestEmailModal(false)}
                  className="flex-1 px-4 py-2 rounded-lg bg-slate-800 text-slate-300 font-medium hover:bg-slate-700 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendTest}
                  disabled={sendingTest}
                  className="flex-1 px-4 py-2 rounded-lg bg-cyan-600 text-white font-bold hover:bg-cyan-500 shadow-lg shadow-cyan-500/20 transition-all text-sm flex items-center justify-center"
                >
                  {sendingTest ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Test'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
